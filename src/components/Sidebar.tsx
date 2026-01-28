import { useCallback, useRef } from "react";
import { Box, Mask, ViewTransform } from "@/types/types";
import { BoxListItem } from "./BoxListItem";
import { MaskListItem } from "./MaskListItem";

interface SidebarProps {
    boxes: Box[];
    selectedIndex: number;
    onSelectBox: (index: number) => void;
    onDeleteBox: (index: number) => void;
    masks: Mask[];
    selectedMaskIndex: number;
    onSelectMask: (index: number) => void;
    onDeleteMask: (index: number) => void;
    minimapCanvas: React.RefObject<HTMLCanvasElement | null>;
    minimapViewport: React.RefObject<HTMLDivElement | null>;
    viewTransform: ViewTransform;
    onViewTransformChange: (transform: ViewTransform) => void;
    currentImage: HTMLImageElement | null;
}

export function Sidebar({
    boxes,
    selectedIndex,
    onSelectBox,
    onDeleteBox,
    masks,
    selectedMaskIndex,
    onSelectMask,
    onDeleteMask,
    minimapCanvas,
    minimapViewport,
    viewTransform,
    onViewTransformChange,
    currentImage,
}: SidebarProps) {

    const isDraggingRef = useRef(false);

    const handleMinimapPointerDown = useCallback((e: React.PointerEvent) => {
        const minimap = minimapCanvas.current;
        const canvas = document.querySelector('canvas[class*="block bg-white"]') as HTMLCanvasElement;
        if (!minimap || !canvas || !currentImage) return;

        isDraggingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);

        const updateViewFromMinimap = (clientX: number, clientY: number) => {
            const rect = minimap.getBoundingClientRect();
            const containerWidth = rect.width;
            const containerHeight = rect.height;

            const scale = Math.min(containerWidth / currentImage.width, containerHeight / currentImage.height);
            const w = currentImage.width * scale;
            const h = currentImage.height * scale;
            const x = (containerWidth - w) / 2;
            const y = (containerHeight - h) / 2;

            // Get click position relative to minimap image
            const clickX = clientX - rect.left - x;
            const clickY = clientY - rect.top - y;

            // Convert to image coordinates
            const imageX = clickX / scale;
            const imageY = clickY / scale;

            // Calculate new offsets to center this point in the main canvas
            const canvasRect = canvas.getBoundingClientRect();
            const newOffsetX = canvasRect.width / 2 - imageX * viewTransform.scale;
            const newOffsetY = canvasRect.height / 2 - imageY * viewTransform.scale;

            onViewTransformChange({
                ...viewTransform,
                offsetX: newOffsetX,
                offsetY: newOffsetY
            });
        };

        updateViewFromMinimap(e.clientX, e.clientY);
    }, [minimapCanvas, currentImage, viewTransform, onViewTransformChange]);

    const handleMinimapPointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;

        const minimap = minimapCanvas.current;
        const canvas = document.querySelector('canvas[class*="block bg-white"]') as HTMLCanvasElement;
        if (!minimap || !canvas || !currentImage) return;

        const rect = minimap.getBoundingClientRect();
        const containerWidth = rect.width;
        const containerHeight = rect.height;

        const scale = Math.min(containerWidth / currentImage.width, containerHeight / currentImage.height);
        const w = currentImage.width * scale;
        const h = currentImage.height * scale;
        const x = (containerWidth - w) / 2;
        const y = (containerHeight - h) / 2;

        const clickX = e.clientX - rect.left - x;
        const clickY = e.clientY - rect.top - y;

        const imageX = clickX / scale;
        const imageY = clickY / scale;

        const canvasRect = canvas.getBoundingClientRect();
        const newOffsetX = canvasRect.width / 2 - imageX * viewTransform.scale;
        const newOffsetY = canvasRect.height / 2 - imageY * viewTransform.scale;

        onViewTransformChange({
            ...viewTransform,
            offsetX: newOffsetX,
            offsetY: newOffsetY
        });
    }, [minimapCanvas, currentImage, viewTransform, onViewTransformChange]);

    const handleMinimapPointerUp = useCallback(() => {
        isDraggingRef.current = false;
    }, []);

    const handleSelectBox = useCallback((index: number) => onSelectBox(index), [onSelectBox]);
    const handleDeleteBoxItem = useCallback((index: number) => onDeleteBox(index), [onDeleteBox]);
    const handleSelectMask = useCallback((index: number) => onSelectMask(index), [onSelectMask]);
    const handleDeleteMaskItem = useCallback((index: number) => onDeleteMask(index), [onDeleteMask]);

    return (
        <aside className="w-[280px] bg-[#2c3e50] text-white border-l border-[#34495e] flex flex-col">
            <section className="p-4 border-b border-[#34495e]" aria-labelledby="minimap-heading">
                <h3 id="minimap-heading" className="mb-2 text-sm text-[#ecf0f1] uppercase tracking-[0.5px]">
                    Minimap
                </h3>
                <div
                    className="w-full h-[150px] bg-[#1a1a1a] rounded relative overflow-hidden cursor-pointer"
                    onPointerDown={handleMinimapPointerDown}
                    onPointerMove={handleMinimapPointerMove}
                    onPointerUp={handleMinimapPointerUp}
                    onPointerCancel={handleMinimapPointerUp}
                >
                    <canvas ref={minimapCanvas} className="w-full h-full block" />
                    <div
                        ref={minimapViewport}
                        className="absolute border-2 border-[#4a90e2] bg-[rgba(74,144,226,0.2)] pointer-events-none"
                    />
                </div>
            </section>
            <section className="p-4 border-b border-[#34495e]" aria-labelledby="boxes-heading">
                <h3 id="boxes-heading" className="mb-2 text-sm text-[#ecf0f1] uppercase tracking-[0.5px]">
                    Boxes ({boxes.length})
                </h3>
            </section>

            <div className="flex-1 overflow-y-auto px-4 sidebar-scroll">
                {boxes.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No boxes yet.</p>
                ) : (
                    boxes.map((box, index) => (
                        <BoxListItem
                            key={`box-${index}`}
                            box={box}
                            index={index}
                            isSelected={index === selectedIndex}
                            onSelect={() => handleSelectBox(index)}
                            onDelete={() => handleDeleteBoxItem(index)}
                        />
                    ))
                )}
            </div>

            <section className="p-4 border-b border-[#34495e]" aria-labelledby="masks-heading">
                <h3 id="masks-heading" className="mb-2 text-sm text-[#ecf0f1] uppercase tracking-[0.5px]">
                    Masks ({masks.length})
                </h3>
            </section>

            <div className="flex-1 overflow-y-auto px-4 sidebar-scroll">
                {masks.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No masks yet.</p>
                ) : (
                    masks.map((mask, index) => (
                        <MaskListItem
                            key={`mask-${index}`}
                            mask={mask}
                            index={index}
                            isSelected={index === selectedMaskIndex}
                            onSelect={() => handleSelectMask(index)}
                            onDelete={() => handleDeleteMaskItem(index)}
                        />
                    ))
                )}
            </div>

        </aside>
    );
}
