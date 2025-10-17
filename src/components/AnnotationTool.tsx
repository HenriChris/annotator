'use client';

import { COLORS, AUTO_SAVE_INTERVAL } from "@/constants/constants";
import { Box, AppState, ViewTransform, ResizeSide, Mode } from "@/types/types";
import { useState, useRef, useEffect, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { StatusNotification } from "./StatusNotification";
import { Toolbar } from "./Toolbar";
import { useHistory } from "@/hooks/useHistory";
import { clampBox, doRectsIntersect, getResizeHandle, isPointInRect } from "@/utils/geometry";
import { getAnnotations, getImages, getState, postAnnotations, postState } from "@/services/api";

// ============================================================================
// TYPES FOR INTERNAL STATE
// ============================================================================

type InteractionState =
    | { type: 'idle' }
    | { type: 'drawing'; startPos: { x: number; y: number }; currentPos: { x: number; y: number } }
    | { type: 'resizing'; index: number; side: ResizeSide }
    | { type: 'moving'; index: number; startPos: { x: number; y: number }; boxStartPos: { x: number; y: number } };

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Hook for coordinate transformation from screen space to canvas space
 */
function useCoordinateTransform(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    viewTransform: ViewTransform
) {
    return useCallback((screenX: number, screenY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const x = (screenX - rect.left - viewTransform.offsetX) / viewTransform.scale;
        const y = (screenY - rect.top - viewTransform.offsetY) / viewTransform.scale;
        return { x, y };
    }, [canvasRef, viewTransform]);
}

/**
 * Hook for canvas drawing operations
 */
function useCanvasDrawing(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    currentImage: HTMLImageElement | null,
    boxes: Box[],
    selectedBoxIndex: number,
    viewTransform: ViewTransform,
    interactionState: InteractionState,
    mode: Mode,
    currentColor: string,
    isOccluded: boolean
) {
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !currentImage) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { scale, offsetX, offsetY } = viewTransform;

        // Reset transform and clear
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

        // Draw image
        ctx.drawImage(currentImage, 0, 0);

        // Draw all boxes
        boxes.forEach((box, i) => {
            const color = box.color || currentColor;
            const isSelected = i === selectedBoxIndex;

            ctx.strokeStyle = color;
            ctx.lineWidth = (isSelected ? 3 : 2) / scale;

            if (box.occluded) {
                ctx.setLineDash([10 / scale, 5 / scale]);
            }

            ctx.strokeRect(box.x, box.y, box.width, box.height);
            ctx.setLineDash([]);

            if (isSelected) {
                // Fill with transparent color
                ctx.fillStyle = color + '20';
                ctx.fillRect(box.x, box.y, box.width, box.height);

                // Draw resize handles
                const handleSize = 6 / scale;
                ctx.fillStyle = color;
                const midX = box.x + box.width / 2;
                const midY = box.y + box.height / 2;

                ctx.fillRect(midX - handleSize / 2, box.y - handleSize / 2, handleSize, handleSize);
                ctx.fillRect(midX - handleSize / 2, box.y + box.height - handleSize / 2, handleSize, handleSize);
                ctx.fillRect(box.x - handleSize / 2, midY - handleSize / 2, handleSize, handleSize);
                ctx.fillRect(box.x + box.width - handleSize / 2, midY - handleSize / 2, handleSize, handleSize);
            }
        });

        // Draw current interaction
        if (interactionState.type === 'drawing') {
            const { startPos, currentPos } = interactionState;
            const width = currentPos.x - startPos.x;
            const height = currentPos.y - startPos.y;

            if (mode === 'draw') {
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = 2 / scale;
                if (isOccluded) {
                    ctx.setLineDash([10 / scale, 5 / scale]);
                }
                ctx.strokeRect(startPos.x, startPos.y, width, height);
                ctx.setLineDash([]);
            } else if (mode === 'delete') {
                ctx.strokeStyle = "#e74c3c";
                ctx.lineWidth = 2 / scale;
                ctx.setLineDash([10 / scale, 5 / scale]);
                ctx.strokeRect(startPos.x, startPos.y, width, height);
                ctx.fillStyle = "rgba(231, 76, 60, 0.1)";
                ctx.fillRect(startPos.x, startPos.y, width, height);
                ctx.setLineDash([]);
            }
        }
    }, [canvasRef, currentImage, boxes, selectedBoxIndex, viewTransform, interactionState, mode, currentColor, isOccluded]);

    useEffect(() => {
        draw();
    }, [draw]);

    return draw;
}

/**
 * Hook for managing minimap drawing
 */
function useMinimapDrawing(
    minimapRef: React.RefObject<HTMLCanvasElement | null>,
    minimapViewportRef: React.RefObject<HTMLDivElement | null>,
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    currentImage: HTMLImageElement | null,
    boxes: Box[],
    viewTransform: ViewTransform
) {
    const drawMinimap = useCallback(() => {
        const minimap = minimapRef.current;
        const viewport = minimapViewportRef.current;
        const canvas = canvasRef.current;
        if (!minimap || !viewport || !canvas || !currentImage) return;

        const ctx = minimap.getContext('2d');
        if (!ctx) return;

        const container = minimap.parentElement;
        if (!container) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        minimap.width = containerWidth;
        minimap.height = containerHeight;

        // const scale = Math.min(containerWidth / canvas.width, containerHeight / canvas.height);
        // const w = canvas.width * scale;
        // const h = canvas.height * scale;
        const scale = Math.min(containerWidth / currentImage.width, containerHeight / currentImage.height);
        const w = currentImage.width * scale;
        const h = currentImage.height * scale;
        const x = (containerWidth - w) / 2;
        const y = (containerHeight - h) / 2;

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, containerWidth, containerHeight);

        ctx.drawImage(currentImage, x, y, w, h);

        ctx.strokeStyle = '#4a90e2';
        ctx.lineWidth = 1;
        boxes.forEach(box => {
            ctx.strokeRect(
                x + box.x * scale,
                y + box.y * scale,
                box.width * scale,
                box.height * scale
            );
        });

        const rect = canvas.getBoundingClientRect();
        // const viewportScale = w / canvas.width;
        const viewportScale = w / currentImage.width;
        const vpWidth = (rect.width / viewTransform.scale) * viewportScale;
        const vpHeight = (rect.height / viewTransform.scale) * viewportScale;
        const vpX = x + (-viewTransform.offsetX / viewTransform.scale) * viewportScale;
        const vpY = y + (-viewTransform.offsetY / viewTransform.scale) * viewportScale;

        viewport.style.left = vpX + 'px';
        viewport.style.top = vpY + 'px';
        viewport.style.width = vpWidth + 'px';
        viewport.style.height = vpHeight + 'px';
    }, [minimapRef, minimapViewportRef, canvasRef, currentImage, boxes, viewTransform]);

    useEffect(() => {
        drawMinimap();
    }, [drawMinimap]);

    return drawMinimap;
}

/**
 * Hook for image loading and management
 */
function useImageManager(
    images: string[],
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    containerRef: React.RefObject<HTMLDivElement | null>,
    canvasWrapperRef: React.RefObject<HTMLDivElement | null>,
    appState: AppState | null,
    hasUnsavedChanges: boolean,
    onImageLoaded: (index: number, img: HTMLImageElement) => void,
    onSave: () => Promise<void>
) {
    const fitImageToScreen = useCallback((imageWidth: number, imageHeight: number) => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const wrapper = canvasWrapperRef.current;
        if (!canvas || !container || !wrapper) return { scale: 1, offsetX: 0, offsetY: 0 };

        // Size canvas to fill most of the container
        const maxWidth = container.clientWidth - 100;
        const maxHeight = container.clientHeight - 100;

        canvas.width = maxWidth;
        canvas.height = maxHeight;
        wrapper.style.width = maxWidth + 'px';
        wrapper.style.height = maxHeight + 'px';

        // Calculate scale to fit image within canvas
        const scaleX = maxWidth / imageWidth;
        const scaleY = maxHeight / imageHeight;
        const scale = Math.min(scaleX, scaleY, 0.9); // 0.9 to leave a small margin

        // Center the image
        const offsetX = (maxWidth - imageWidth * scale) / 2;
        const offsetY = (maxHeight - imageHeight * scale) / 2;

        return { scale, offsetX, offsetY };
    }, [canvasRef, containerRef, canvasWrapperRef]);

    const loadImage = useCallback(async (index: number) => {

        if (index < 0 || index >= images.length) return;

        if (hasUnsavedChanges) {
            await onSave();
        }

        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.width = img.width;
                canvas.height = img.height;
                fitImageToScreen(img.width, img.height);
            }
            onImageLoaded(index, img);
        };
        img.src = `/images/${images[index]}`;
    }, [images, canvasRef, hasUnsavedChanges, onSave, fitImageToScreen, onImageLoaded]);

    return { loadImage, fitImageToScreen };
}

/**
 * Hook for auto-save functionality
 */
function useAutoSave(
    hasUnsavedChanges: boolean,
    saveCallback: () => Promise<void>
) {
    useEffect(() => {
        if (!hasUnsavedChanges) return;

        const interval = setInterval(() => {
            saveCallback();
        }, AUTO_SAVE_INTERVAL);

        return () => clearInterval(interval);
    }, [hasUnsavedChanges, saveCallback]);
}

/**
 * Hook for touch gesture handling
 */
function useTouchGestures() {
    const pointersRef = useRef<Map<number, PointerEvent>>(new Map());
    const lastTouchDistRef = useRef<number | null>(null);
    const lastTouchMidRef = useRef<{ x: number; y: number } | null>(null);
    const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const getDistance = (p1: PointerEvent, p2: PointerEvent) => {
        const dx = p2.clientX - p1.clientX;
        const dy = p2.clientY - p1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const getMidpoint = (p1: PointerEvent, p2: PointerEvent) => ({
        x: (p1.clientX + p2.clientX) / 2,
        y: (p1.clientY + p2.clientY) / 2,
    });

    return {
        pointersRef,
        lastTouchDistRef,
        lastTouchMidRef,
        panStartRef,
        getDistance,
        getMidpoint,
    };
}

/**
 * Hook for pointer interaction handling
 */
function usePointerInteraction(
    mode: Mode,
    boxes: Box[],
    viewTransform: ViewTransform,
    screenToCanvas: (x: number, y: number) => { x: number; y: number },
    touchGestures: ReturnType<typeof useTouchGestures>,
    canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
    const [interactionState, setInteractionState] = useState<InteractionState>({ type: 'idle' });
    const [selectedBoxIndex, setSelectedBoxIndex] = useState(-1);

    const handlePointerDown = useCallback((e: React.PointerEvent, onBoxesChange: (boxes: Box[]) => void, onViewTransformChange: (transform: ViewTransform) => void) => {
        touchGestures.pointersRef.current.set(e.pointerId, e.nativeEvent);

        if (e.pointerType === 'pen' || e.pointerType === 'mouse') {
            const pos = screenToCanvas(e.clientX, e.clientY);

            if (mode === 'draw') {
                // Check for resize handles
                for (let i = boxes.length - 1; i >= 0; i--) {
                    const handle = getResizeHandle(pos.x, pos.y, boxes[i], viewTransform.scale);
                    if (handle) {
                        setInteractionState({ type: 'resizing', index: i, side: handle });
                        setSelectedBoxIndex(i);
                        return;
                    }
                }

                // Check for move
                for (let i = boxes.length - 1; i >= 0; i--) {
                    if (isPointInRect(pos.x, pos.y, boxes[i])) {
                        setInteractionState({
                            type: 'moving',
                            index: i,
                            startPos: pos,
                            boxStartPos: { x: boxes[i].x, y: boxes[i].y }
                        });
                        setSelectedBoxIndex(i);
                        return;
                    }
                }

                // Start drawing
                setSelectedBoxIndex(-1);
                setInteractionState({ type: 'drawing', startPos: pos, currentPos: pos });
            } else if (mode === 'delete') {
                setInteractionState({ type: 'drawing', startPos: pos, currentPos: pos });
                setSelectedBoxIndex(-1);
            }
        } else if (e.pointerType === 'touch') {
            if (touchGestures.pointersRef.current.size === 2) {
                const [p1, p2] = [...touchGestures.pointersRef.current.values()];
                touchGestures.lastTouchDistRef.current = touchGestures.getDistance(p1, p2);
                touchGestures.lastTouchMidRef.current = touchGestures.getMidpoint(p1, p2);
            } else if (touchGestures.pointersRef.current.size === 1) {
                touchGestures.panStartRef.current = {
                    x: e.clientX - viewTransform.offsetX,
                    y: e.clientY - viewTransform.offsetY
                };
            }
        }
    }, [mode, boxes, viewTransform, screenToCanvas, touchGestures]);

    const handlePointerMove = useCallback((
        e: React.PointerEvent,
        onBoxesChange: (boxes: Box[]) => void,
        onViewTransformChange: (transform: ViewTransform) => void
    ) => {
        if (e.pointerType === 'pen' || e.pointerType === 'mouse') {
            const pos = screenToCanvas(e.clientX, e.clientY);

            if (interactionState.type === 'resizing') {
                const newBoxes = [...boxes];
                const box = newBoxes[interactionState.index];

                if (interactionState.side === 'top') {
                    const diff = pos.y - box.y;
                    box.y = pos.y;
                    box.height -= diff;
                } else if (interactionState.side === 'bottom') {
                    box.height = pos.y - box.y;
                } else if (interactionState.side === 'left') {
                    const diff = pos.x - box.x;
                    box.x = pos.x;
                    box.width -= diff;
                } else if (interactionState.side === 'right') {
                    box.width = pos.x - box.x;
                }

                onBoxesChange(newBoxes);
            } else if (interactionState.type === 'moving') {
                const dx = pos.x - interactionState.startPos.x;
                const dy = pos.y - interactionState.startPos.y;
                const newBoxes = [...boxes];
                newBoxes[interactionState.index].x = interactionState.boxStartPos.x + dx;
                newBoxes[interactionState.index].y = interactionState.boxStartPos.y + dy;
                onBoxesChange(newBoxes);
            } else if (interactionState.type === 'drawing') {
                setInteractionState({ ...interactionState, currentPos: pos });
            }
        } else if (e.pointerType === 'touch') {
            touchGestures.pointersRef.current.set(e.pointerId, e.nativeEvent);

            if (touchGestures.pointersRef.current.size === 2) {
                const [p1, p2] = [...touchGestures.pointersRef.current.values()];
                const newDist = touchGestures.getDistance(p1, p2);
                const newMid = touchGestures.getMidpoint(p1, p2);

                if (touchGestures.lastTouchDistRef.current && touchGestures.lastTouchMidRef.current) {
                    const zoom = newDist / touchGestures.lastTouchDistRef.current;
                    const newScale = viewTransform.scale * zoom;

                    const canvas = canvasRef.current;
                    if (canvas) {
                        const worldMid = screenToCanvas(touchGestures.lastTouchMidRef.current.x, touchGestures.lastTouchMidRef.current.y);
                        const rect = canvas.getBoundingClientRect();
                        const newOffsetX = newMid.x - worldMid.x * newScale - rect.left;
                        const newOffsetY = newMid.y - worldMid.y * newScale - rect.top;

                        onViewTransformChange({ scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY });
                    }

                    touchGestures.lastTouchDistRef.current = newDist;
                    touchGestures.lastTouchMidRef.current = newMid;
                }
            } else if (touchGestures.pointersRef.current.size === 1) {
                onViewTransformChange({
                    ...viewTransform,
                    offsetX: e.clientX - touchGestures.panStartRef.current.x,
                    offsetY: e.clientY - touchGestures.panStartRef.current.y
                });
            }
        }
    }, [interactionState, boxes, viewTransform, screenToCanvas, touchGestures, canvasRef]);

    const handlePointerUp = useCallback((
        e: React.PointerEvent,
        onComplete: (newBoxes: Box[], shouldSaveHistory: boolean, deletedCount?: number) => void
    ) => {
        touchGestures.pointersRef.current.delete(e.pointerId);

        if (e.pointerType === 'pen' || e.pointerType === 'mouse') {
            if (interactionState.type === 'resizing' || interactionState.type === 'moving') {
                onComplete(boxes, true);
                setInteractionState({ type: 'idle' });
            } else if (interactionState.type === 'drawing') {
                const { startPos, currentPos } = interactionState;
                const width = currentPos.x - startPos.x;
                const height = currentPos.y - startPos.y;

                if (Math.abs(width) > 5 && Math.abs(height) > 5) {
                    if (mode === 'draw') {
                        const normalized: Box = {
                            x: width < 0 ? startPos.x + width : startPos.x,
                            y: height < 0 ? startPos.y + height : startPos.y,
                            width: Math.abs(width),
                            height: Math.abs(height),
                            color: '', // Will be set by parent
                            occluded: false // Will be set by parent
                        };
                        onComplete([...boxes, normalized], true);
                    } else if (mode === 'delete') {
                        const deleteRect = {
                            x: width < 0 ? startPos.x + width : startPos.x,
                            y: height < 0 ? startPos.y + height : startPos.y,
                            width: Math.abs(width),
                            height: Math.abs(height)
                        };

                        const toDelete: number[] = [];
                        boxes.forEach((box, i) => {
                            if (doRectsIntersect(deleteRect, box)) {
                                toDelete.push(i);
                            }
                        });

                        if (toDelete.length > 0) {
                            const newBoxes = boxes.filter((_, i) => !toDelete.includes(i));
                            onComplete(newBoxes, true, toDelete.length);
                        }
                    }
                }

                setInteractionState({ type: 'idle' });
            }
        }

        if (e.pointerType === 'touch') {
            if (touchGestures.pointersRef.current.size === 1) {
                const p = [...touchGestures.pointersRef.current.values()][0];
                touchGestures.panStartRef.current = {
                    x: p.clientX - viewTransform.offsetX,
                    y: p.clientY - viewTransform.offsetY
                };
            } else if (touchGestures.pointersRef.current.size === 0) {
                touchGestures.lastTouchDistRef.current = null;
                touchGestures.lastTouchMidRef.current = null;
            }
        }
    }, [interactionState, boxes, mode, viewTransform, touchGestures]);

    return {
        interactionState,
        selectedBoxIndex,
        setSelectedBoxIndex,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp
    };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AnnotationTool() {
    // Core state
    const [images, setImages] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [appState, setAppState] = useState<AppState | null>(null);

    // UI state
    const [mode, setMode] = useState<Mode>('draw');
    const [currentColor, setCurrentColor] = useState(COLORS[0].value);
    const [isOccluded, setIsOccluded] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [viewTransform, setViewTransform] = useState<ViewTransform>({ scale: 1, offsetX: 0, offsetY: 0 });

    // Refs
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const minimapRef = useRef<HTMLCanvasElement | null>(null);
    const minimapViewportRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
    const apiCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Custom hooks
    const history = useHistory<Box[]>([]);
    const screenToCanvas = useCoordinateTransform(canvasRef, viewTransform);
    const touchGestures = useTouchGestures();

    const pointerInteraction = usePointerInteraction(
        mode,
        boxes,
        viewTransform,
        screenToCanvas,
        touchGestures,
        canvasRef
    );

    // Drawing
    useCanvasDrawing(
        canvasRef,
        currentImage,
        boxes,
        pointerInteraction.selectedBoxIndex,
        viewTransform,
        pointerInteraction.interactionState,
        mode,
        currentColor,
        isOccluded
    );

    useMinimapDrawing(
        minimapRef,
        minimapViewportRef,
        canvasRef,
        currentImage,
        boxes,
        viewTransform
    );

    const clampViewTransform = useCallback((transform: ViewTransform) => {
        if (!currentImage || !canvasRef.current) return transform;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Calculate image bounds in screen space
        const imageWidth = currentImage.width * transform.scale;
        const imageHeight = currentImage.height * transform.scale;

        // Allow panning slightly beyond the edge (50px buffer)
        const buffer = 50;

        // Clamp offsets so image doesn't go too far off screen
        const maxOffsetX = rect.width - buffer;
        const minOffsetX = -imageWidth + buffer;
        const maxOffsetY = rect.height - buffer;
        const minOffsetY = -imageHeight + buffer;

        return {
            scale: transform.scale,
            offsetX: Math.max(minOffsetX, Math.min(maxOffsetX, transform.offsetX)),
            offsetY: Math.max(minOffsetY, Math.min(maxOffsetY, transform.offsetY))
        };
    }, [currentImage, canvasRef]);

    const setClampedViewTransform = useCallback((transform: ViewTransform) => {
        setViewTransform(clampViewTransform(transform));
    }, [clampViewTransform]);

    // Save function
    const saveAnnotations = useCallback(async (showMessage = true) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const imageName = images[currentImageIndex];
        const clampedBoxes = boxes
            .map(b => clampBox(b, canvas.width, canvas.height))
            .filter(b => b.width > 0 && b.height > 0);

        const success = await postAnnotations(imageName, clampedBoxes, canvas.width, canvas.height);

        if (success) {
            setHasUnsavedChanges(false);

            if (appState) {
                const newAnnotatedImages = clampedBoxes.length > 0
                    ? appState.annotatedImages.includes(imageName)
                        ? appState.annotatedImages
                        : [...appState.annotatedImages, imageName]
                    : appState.annotatedImages.filter(n => n !== imageName);

                const newAppState = { ...appState, annotatedImages: newAnnotatedImages };
                setAppState(newAppState);
                await postState(newAppState);
            }

            if (showMessage) {
                setStatus({ message: 'Annotations saved!', type: 'success' });
            }
        } else {
            setStatus({ message: 'Error saving annotations', type: 'error' });
        }
    }, [boxes, currentImageIndex, images, appState]);

    // Image management
    const { loadImage, fitImageToScreen } = useImageManager(
        images,
        canvasRef,
        containerRef,
        canvasWrapperRef,
        appState,
        hasUnsavedChanges,
        async (index, img) => {
            setCurrentImage(img);
            setCurrentImageIndex(index);

            // Clear any pending API calls
            if (apiCallTimeoutRef.current) {
                clearTimeout(apiCallTimeoutRef.current);
            }

            // Debounce the expensive API calls
            apiCallTimeoutRef.current = setTimeout(async () => {
                const annotations = await getAnnotations(images[index]);
                const newBoxes = annotations?.boxes || [];
                setBoxes(newBoxes);
                setHasUnsavedChanges(false);
                history.reset(newBoxes);

                if (appState) {
                    const newAppState = { ...appState, lastImageIndex: index };
                    setAppState(newAppState);
                    await postState(newAppState);
                }
            }, 300);
        },
        () => saveAnnotations(false)
    );

    // Auto-save
    useAutoSave(hasUnsavedChanges, () => saveAnnotations(false));

    // Initial load
    useEffect(() => {
        (async () => {
            const state = await getState();
            if (state) {
                setAppState(state);
                setCurrentColor(state.currentColor);
            } else {
                setAppState({
                    lastImageIndex: 0,
                    annotatedImages: [],
                    currentColor: COLORS[0].value
                });
            }

            const imageList = await getImages();
            setImages(imageList);

            if (imageList.length > 0) {
                const startIndex = Math.min(state?.lastImageIndex || 0, imageList.length - 1);

                // Load the image directly here to ensure proper initialization
                const img = new Image();
                img.onload = () => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const transform = fitImageToScreen(img.width, img.height);
                        setClampedViewTransform(transform);
                    }
                    setCurrentImage(img);
                    setCurrentImageIndex(startIndex);

                    // Load annotations
                    getAnnotations(imageList[startIndex]).then(annotations => {
                        const newBoxes = annotations?.boxes || [];
                        setBoxes(newBoxes);
                        history.reset(newBoxes);
                    });
                };
                img.src = `/images/${imageList[startIndex]}`;
            }
        })();
    }, []);

    // Window resize handler
    useEffect(() => {
        const handleResize = () => {
            if (currentImage) {
                fitImageToScreen(currentImage.width, currentImage.height);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [currentImage, fitImageToScreen]);

    // Beforeunload warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Event handlers
    const handlePrev = useCallback(() => {
        if (currentImageIndex > 0) {
            loadImage(currentImageIndex - 1);
        }
    }, [currentImageIndex, loadImage]);

    const handleNext = useCallback(() => {
        if (currentImageIndex < images.length - 1) {
            loadImage(currentImageIndex + 1);
        }
    }, [currentImageIndex, images.length, loadImage]);

    const handleModeChange = (newMode: Mode) => {
        setMode(newMode);
        pointerInteraction.setSelectedBoxIndex(-1);
    };

    const handleColorChange = useCallback((color: string) => {
        // Always update global color for new boxes
        setCurrentColor(color);

        // If a box is selected, also update that box
        if (pointerInteraction.selectedBoxIndex >= 0) {
            const newBoxes = [...boxes];
            newBoxes[pointerInteraction.selectedBoxIndex].color = color;
            setBoxes(newBoxes);
            history.save(newBoxes);
            setHasUnsavedChanges(true);
            setStatus({
                message: 'Box color updated',
                type: 'info'
            });
        }

        // Save to app state
        if (appState) {
            const newAppState = { ...appState, currentColor: color };
            setAppState(newAppState);
            postState(newAppState);
        }
    }, [pointerInteraction.selectedBoxIndex, boxes, history, appState]);

    // Mouse wheel zoom and pan
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            if (e.ctrlKey || e.metaKey) {
                // Zoom with Ctrl/Cmd + wheel
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                const newScale = Math.max(0.1, Math.min(10, viewTransform.scale * zoomFactor));

                // Zoom towards mouse position
                const worldPos = screenToCanvas(e.clientX, e.clientY);
                const newOffsetX = mouseX - worldPos.x * newScale;
                const newOffsetY = mouseY - worldPos.y * newScale;

                setClampedViewTransform({ scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY });
            } else if (e.shiftKey) {
                // Horizontal pan with Shift + wheel
                setClampedViewTransform({
                    ...viewTransform,
                    offsetX: viewTransform.offsetX - e.deltaY
                });
            } else {
                // Vertical pan with wheel
                setClampedViewTransform({
                    ...viewTransform,
                    offsetY: viewTransform.offsetY - e.deltaY
                });
            }
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [viewTransform, screenToCanvas, canvasRef]);

    const handleUndo = () => {
        const prevBoxes = history.undo();
        if (prevBoxes) {
            setBoxes(prevBoxes);
            setHasUnsavedChanges(true);
            setStatus({ message: 'Undone', type: 'info' });
        }
    };

    const handleRedo = () => {
        const nextBoxes = history.redo();
        if (nextBoxes) {
            setBoxes(nextBoxes);
            setHasUnsavedChanges(true);
            setStatus({ message: 'Redone', type: 'info' });
        }
    };

    const handleDeleteBox = (index: number) => {
        const newBoxes = boxes.filter((_, i) => i !== index);
        setBoxes(newBoxes);
        history.save(newBoxes);
        setHasUnsavedChanges(true);
        if (pointerInteraction.selectedBoxIndex === index) {
            pointerInteraction.setSelectedBoxIndex(-1);
        } else if (pointerInteraction.selectedBoxIndex > index) {
            pointerInteraction.setSelectedBoxIndex(pointerInteraction.selectedBoxIndex - 1);
        }
        setStatus({ message: 'Box deleted', type: 'info' });
    };

    const handleOccludedChange = useCallback((newOccluded: boolean) => {
        // Always update global state for new boxes
        setIsOccluded(newOccluded);

        // If a box is selected, also update that box
        if (pointerInteraction.selectedBoxIndex >= 0) {
            const newBoxes = [...boxes];
            newBoxes[pointerInteraction.selectedBoxIndex].occluded = newOccluded;
            setBoxes(newBoxes);
            history.save(newBoxes);
            setHasUnsavedChanges(true);
            setStatus({
                message: `Box ${newOccluded ? 'occluded' : 'not occluded'}`,
                type: 'info'
            });
        }
    }, [pointerInteraction.selectedBoxIndex, boxes, history, setStatus]);

    const handlePointerInteractionComplete = (newBoxes: Box[], shouldSaveHistory: boolean, deletedCount?: number) => {
        // Apply current color and occluded state to new boxes
        const processedBoxes = newBoxes.map((box, i) => {
            if (i === newBoxes.length - 1 && !box.color) {
                return { ...box, color: currentColor, occluded: isOccluded };
            }
            return box;
        });

        setBoxes(processedBoxes);
        if (shouldSaveHistory) {
            history.save(processedBoxes);
        }
        setHasUnsavedChanges(true);

        if (deletedCount) {
            setStatus({
                message: `Deleted ${deletedCount} box${deletedCount > 1 ? 'es' : ''}`,
                type: 'info'
            });
        }
    };

    const handleResetView = useCallback(() => {
        if (currentImage) {
            const newTransform = fitImageToScreen(currentImage.width, currentImage.height);
            setClampedViewTransform(newTransform);
            setStatus({ message: 'View reset', type: 'info' });
        }
    }, [currentImage, fitImageToScreen]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentImageIndex, images.length, hasUnsavedChanges, handlePrev, handleNext]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl/Cmd + Z for undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            }
            // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z for redo
            else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                handleRedo();
            }
            // Ctrl/Cmd + S for save
            else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveAnnotations(true);
            }
            // Delete or Backspace to delete selected box
            else if ((e.key === 'Delete' || e.key === 'Backspace') && pointerInteraction.selectedBoxIndex >= 0) {
                e.preventDefault();
                handleDeleteBox(pointerInteraction.selectedBoxIndex);
            }
            // D key for draw mode
            else if (e.key === 'd' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                handleModeChange('draw');
            }
            // X key for delete mode
            else if (e.key === 'x' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                handleModeChange('delete');
            }
            // Escape to deselect
            else if (e.key === 'Escape') {
                e.preventDefault();
                pointerInteraction.setSelectedBoxIndex(-1);
            }
            // O key to toggle occluded (for selected box or global state)
            else if (e.key === 'o' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                const currentOccludedState = pointerInteraction.selectedBoxIndex >= 0
                    ? boxes[pointerInteraction.selectedBoxIndex]?.occluded ?? isOccluded
                    : isOccluded;
                handleOccludedChange(!currentOccludedState);
            }
            // R key to reset view
            else if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                handleResetView();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo, saveAnnotations, handleDeleteBox, handleModeChange, handleOccludedChange, pointerInteraction, pointerInteraction.selectedBoxIndex]);

    return (
        <div className="m-0 p-0 h-screen overflow-hidden font-sans touch-none bg-zinc-900">
            <Toolbar
                currentIndex={currentImageIndex}
                totalImages={images.length}
                imageName={images[currentImageIndex] || 'No images'}
                annotatedCount={appState?.annotatedImages.length || 0}
                mode={mode}
                color={currentColor}
                // isOccluded={isOccluded}
                isOccluded={pointerInteraction.selectedBoxIndex >= 0
                    ? boxes[pointerInteraction.selectedBoxIndex]?.occluded ?? isOccluded
                    : isOccluded}
                canUndo={history.canUndo}
                canRedo={history.canRedo}
                onPrev={handlePrev}
                onNext={handleNext}
                onModeChange={handleModeChange}
                onColorChange={handleColorChange}
                onOccludedChange={handleOccludedChange}
                // onOccludedChange={setIsOccluded}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onSave={() => saveAnnotations(true)}
                onResetView={handleResetView}
            />

            <div className="fixed top-[60px] left-0 right-0 bottom-0 flex">
                <div
                    ref={containerRef}
                    className="flex-1 overflow-hidden bg-zinc-900 flex items-center justify-center relative"
                >
                    <div
                        ref={canvasWrapperRef}
                        className="relative max-w-full max-h-full overflow-hidden shadow-[0_0_0_3px_#4a90e2,0_0_20px_rgba(74,144,226,0.3)] flex justify-center items-center"
                    >
                        <canvas
                            ref={canvasRef}
                            onPointerDown={(e) => pointerInteraction.handlePointerDown(
                                e,
                                (newBoxes) => {
                                    setBoxes(newBoxes);
                                    setHasUnsavedChanges(true);
                                },
                                setClampedViewTransform
                            )}
                            onPointerMove={(e) => pointerInteraction.handlePointerMove(
                                e,
                                (newBoxes) => {
                                    setBoxes(newBoxes);
                                    setHasUnsavedChanges(true);
                                },
                                setClampedViewTransform
                            )}
                            onPointerUp={(e) => pointerInteraction.handlePointerUp(e, handlePointerInteractionComplete)}
                            onPointerCancel={(e) => touchGestures.pointersRef.current.delete(e.pointerId)}
                            className="block bg-white touch-none max-w-full h-auto"
                        />
                    </div>
                </div>

                <Sidebar
                    boxes={boxes}
                    selectedIndex={pointerInteraction.selectedBoxIndex}
                    onSelectBox={pointerInteraction.setSelectedBoxIndex}
                    onDeleteBox={handleDeleteBox}
                    minimapCanvas={minimapRef}
                    minimapViewport={minimapViewportRef}
                    viewTransform={viewTransform}
                    onViewTransformChange={setClampedViewTransform}
                    currentImage={currentImage}
                />
            </div>

            {status && <StatusNotification message={status.message} type={status.type} />}
        </div>
    );
}