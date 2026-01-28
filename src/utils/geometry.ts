import { Box, ResizeSide } from "@/types/types";

export function clampBox(box: Box, imgWidth: number, imgHeight: number): Box {
    const x = Math.max(0, Math.min(box.x, imgWidth));
    const y = Math.max(0, Math.min(box.y, imgHeight));
    const maxWidth = imgWidth - x;
    const maxHeight = imgHeight - y;

    return {
        x,
        y,
        width: Math.max(0, Math.min(box.width, maxWidth)),
        height: Math.max(0, Math.min(box.height, maxHeight)),
        color: box.color,
        occluded: box.occluded
    };
}

export function isPointInRect(px: number, py: number, r: Box): boolean {
    return px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
}

export function doRectsIntersect(r1: { x: number; y: number; width: number; height: number }, r2: Box): boolean {
    const rect1 = {
        x: r1.width < 0 ? r1.x + r1.width : r1.x,
        y: r1.height < 0 ? r1.y + r1.height : r1.y,
        width: Math.abs(r1.width),
        height: Math.abs(r1.height)
    };
    const rect2 = {
        x: r2.width < 0 ? r2.x + r2.width : r2.x,
        y: r2.height < 0 ? r2.y + r2.height : r2.y,
        width: Math.abs(r2.width),
        height: Math.abs(r2.height)
    };

    return !(rect1.x + rect1.width < rect2.x ||
        rect2.x + rect2.width < rect1.x ||
        rect1.y + rect1.height < rect2.y ||
        rect2.y + rect2.height < rect1.y);
}

export function getResizeHandle(x: number, y: number, box: Box, viewScale: number): ResizeSide {
    const handleSize = 8 / viewScale;
    const midX = box.x + box.width / 2;
    const midY = box.y + box.height / 2;

    if (Math.abs(x - midX) < handleSize && Math.abs(y - box.y) < handleSize) return 'top';
    if (Math.abs(x - midX) < handleSize && Math.abs(y - (box.y + box.height)) < handleSize) return 'bottom';
    if (Math.abs(y - midY) < handleSize && Math.abs(x - box.x) < handleSize) return 'left';
    if (Math.abs(y - midY) < handleSize && Math.abs(x - (box.x + box.width)) < handleSize) return 'right';

    return null;
}