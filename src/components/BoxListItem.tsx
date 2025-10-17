import React from "react";
import { Box } from "@/types/types";

type BoxListItemProps = {
    box: Box;
    index: number;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
};

export const BoxListItem = React.memo(function BoxListItem({
    box,
    index,
    isSelected,
    onSelect,
    onDelete,
}: BoxListItemProps) {
    const roundedWidth = Math.round(box.width);
    const roundedHeight = Math.round(box.height);

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
            style={{ borderLeft: `4px solid ${box.color}` }}
        >
            <div className="flex-1 truncate">
                Box {index + 1} ({roundedWidth}×{roundedHeight})
                {box.occluded && " 👁️"}
            </div>

            <button
                type="button"
                aria-label={`Delete box ${index + 1}`}
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
