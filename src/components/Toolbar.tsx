import { useMemo } from "react";
import { Mode } from "@/types/types";
import { ColorPicker } from "./ColorPicker";
import { COLORS } from "@/constants/constants";

function ToolbarButton({
    children,
    onClick,
    disabled,
    variant = "blue",
    ariaLabel,
}: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    variant?: "blue" | "green" | "yellow" | "red" | "gray";
    ariaLabel?: string;
}) {
    const base =
        "px-4 py-2 rounded text-white font-medium text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150";
    const variants = {
        blue: "bg-blue-500 hover:bg-blue-600",
        green: "bg-green-600 hover:bg-green-700",
        yellow: "bg-yellow-500 hover:bg-yellow-600",
        red: "bg-red-600 hover:bg-red-700",
        gray: "bg-[#34495e] hover:bg-[#3f5872]",
    };

    return (
        <button
            aria-label={ariaLabel}
            className={`${base} ${variants[variant]}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
}

const Divider = () => <div className="w-px h-[30px] bg-[#34495e] mx-2" />;

function NavigationSection({
    currentIndex,
    totalImages,
    imageName,
    annotatedCount,
    percentage,
    hasAnnotations,
    onPrev,
    onNext,
}: {
    currentIndex: number;
    totalImages: number;
    imageName: string;
    annotatedCount: number;
    percentage: number;
    hasAnnotations: boolean;
    onPrev: () => void;
    onNext: () => void;
}) {
    return (
        <div className="flex items-center gap-3 flex-wrap">
            <ToolbarButton onClick={onPrev} disabled={currentIndex === 0}>
                ← Previous
            </ToolbarButton>
            <ToolbarButton
                onClick={onNext}
                disabled={currentIndex === totalImages - 1}
            >
                Next →
            </ToolbarButton>

            <span className="text-sm text-gray-200">
                {hasAnnotations ? "✓" : "○"} Image {currentIndex + 1} / {totalImages} —{" "}
                {imageName}
            </span>

            <span className="text-xs text-gray-400 font-semibold">
                Progress: {annotatedCount}/{totalImages} ({percentage}%)
            </span>
        </div>
    );
}

const MODES: { label: string; icon: string; value: Mode }[] = [
    { label: "Pan", icon: "✋", value: "pan" },
    { label: "Draw", icon: "✏️", value: "draw" },
    { label: "Delete", icon: "🗑️", value: "delete" },
];

function ModeSection({
    mode,
    onModeChange,
}: {
    mode: Mode;
    onModeChange: (m: Mode) => void;
}) {
    return (
        <div className="flex items-center gap-3 flex-wrap">
            {MODES.map((m) => (
                <ToolbarButton
                    key={m.value}
                    onClick={() => onModeChange(m.value)}
                    variant={mode === m.value ? "green" : "blue"}
                    ariaLabel={`Switch to ${m.label} mode`}
                >
                    {m.icon} {m.label}
                </ToolbarButton>
            ))}

            <span className="px-3 py-1 bg-[#34495e] rounded text-xs font-semibold uppercase">
                {mode}
            </span>
        </div>
    );
}

function ColorSection({
    color,
    onColorChange,
}: {
    color: string;
    onColorChange: (color: string) => void;
}) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-gray-200">Color:</label>
            <ColorPicker colors={COLORS} selected={color} onSelect={onColorChange} />
        </div>
    );
}

function OcclusionToggle({
    isOccluded,
    onOccludedChange,
}: {
    isOccluded: boolean;
    onOccludedChange: (val: boolean) => void;
}) {
    return (
        <div className="flex items-center gap-2 px-3 py-1 bg-[#34495e] rounded text-sm">
            <input
                type="checkbox"
                id="occluded"
                checked={isOccluded}
                onChange={(e) => onOccludedChange(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-green-500"
            />
            <label htmlFor="occluded" className="cursor-pointer select-none">
                Occluded
            </label>
        </div>
    );
}

function HistorySection({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onSave,
    onResetView, // Add this
}: {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onSave: () => void;
    onResetView: () => void; // Add this
}) {
    return (
        <div className="flex items-center gap-3 flex-wrap">
            <ToolbarButton onClick={onUndo} disabled={!canUndo} variant="yellow">
                ↶ Undo
            </ToolbarButton>
            <ToolbarButton onClick={onRedo} disabled={!canRedo} variant="yellow">
                ↷ Redo
            </ToolbarButton>
            <ToolbarButton onClick={onResetView} variant="gray" ariaLabel="Reset view (R)">
                🔄 Reset View
            </ToolbarButton>
            <ToolbarButton onClick={onSave} variant="green">
                💾 Save
            </ToolbarButton>
        </div>
    );
}

export function Toolbar({
    currentIndex,
    totalImages,
    imageName,
    annotatedCount,
    mode,
    color,
    isOccluded,
    canUndo,
    canRedo,
    onPrev,
    onNext,
    onModeChange,
    onColorChange,
    onOccludedChange,
    onUndo,
    onRedo,
    onSave,
    onResetView,
}: {
    currentIndex: number;
    totalImages: number;
    imageName: string;
    annotatedCount: number;
    mode: Mode;
    color: string;
    isOccluded: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onPrev: () => void;
    onNext: () => void;
    onModeChange: (mode: Mode) => void;
    onColorChange: (color: string) => void;
    onOccludedChange: (occluded: boolean) => void;
    onUndo: () => void;
    onRedo: () => void;
    onSave: () => void;
    onResetView: () => void;
}) {
    const { hasAnnotations, percentage } = useMemo(
        () => ({
            hasAnnotations: annotatedCount > 0,
            percentage:
                totalImages > 0
                    ? Math.round((annotatedCount / totalImages) * 100)
                    : 0,
        }),
        [annotatedCount, totalImages]
    );

    return (
        <div
            role="toolbar"
            className="fixed top-0 left-0 right-0 h-auto min-h-[60px] bg-[#2c3e50] text-white flex flex-wrap items-center justify-between px-5 py-2 gap-3 z-50 shadow-md"
        >
            <NavigationSection
                {...{
                    currentIndex,
                    totalImages,
                    imageName,
                    annotatedCount,
                    percentage,
                    hasAnnotations,
                    onPrev,
                    onNext,
                }}
            />

            <Divider />
            <ModeSection {...{ mode, onModeChange }} />

            <Divider />
            <ColorSection {...{ color, onColorChange }} />

            <Divider />
            <OcclusionToggle {...{ isOccluded, onOccludedChange }} />

            <Divider />
            <HistorySection {...{ canUndo, canRedo, onUndo, onRedo, onSave, onResetView }} />
        </div>
    );
}
