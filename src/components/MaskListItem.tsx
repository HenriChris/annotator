import React from "react";
import { Mask } from "@/types/types";

type MaskListItemProps = {
    mask: Mask;
    index: number;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
};

export const MaskListItem = React.memo(function MaskListItem({
    mask,
    index,
    isSelected,
    onSelect,
    onDelete,
}: MaskListItemProps) {
    const pointCount = mask.points.length;

    const containerClass = `
    px-2.5 py-2 my-1 rounded cursor-pointer text-sm flex justify-between items-center transition-colors
    ${isSelected ? "bg-[#4a90e2]" : "bg-[#34495e]"}
  `;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(e) => e.key === "Enter" && onSelect()}
            className={containerClass}
            style={{ borderLeft: `4px solid ${mask.color}` }}
        >
            <div className="flex-1 truncate">
                Mask {index + 1} ({pointCount} points)
                {mask.occluded && " 👁️"}
            </div>

            <button
                type="button"
                aria-label={`Delete mask ${index + 1}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className="bg-[#e74c3c] hover:bg-[#c0392b] border-none text-white px-2 py-1 rounded text-xs cursor-pointer transition"
            >
                ×
            </button>
        </div>
    );
});
