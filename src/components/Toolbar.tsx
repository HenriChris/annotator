'use client';

import { useMemo, useCallback, memo } from "react";
import { Mode } from "@/types/types";
import { ColorPicker } from "./ColorPicker";
import { COLORS } from "@/constants/constants";

// Theme constants
const THEME = {
    toolbar: '#2c3e50',
    divider: '#34495e',
    hoverBg: '#3f5872',
} as const;

// Keyboard shortcuts map
const SHORTCUTS = {
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    save: 'Ctrl+S',
    reset: 'R',
    prev: '←',
    next: '→',
    pan: 'P',
    draw: 'D',
    mask: 'M',
    delete: 'X',
} as const;

interface ToolbarButtonProps {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    variant?: "blue" | "green" | "yellow" | "red" | "gray";
    ariaLabel?: string;
    shortcut?: string;
}

function ToolbarButton({
    children,
    onClick,
    disabled,
    variant = "blue",
    ariaLabel,
    shortcut,
}: ToolbarButtonProps) {
    const base =
        "px-2 py-2 sm:px-3 sm:py-2 md:px-4 rounded text-white font-medium text-xs sm:text-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 whitespace-nowrap hover:shadow-md active:scale-95 min-h-[36px] flex items-center justify-center";

    const variants = {
        blue: "bg-blue-500 hover:bg-blue-600 active:bg-blue-700",
        green: "bg-green-600 hover:bg-green-700 active:bg-green-800 ring-2 ring-green-400 shadow-lg",
        yellow: "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700",
        red: "bg-red-600 hover:bg-red-700 active:bg-red-800",
        gray: "bg-gray-600 hover:bg-gray-700",
    };

    const fullAriaLabel = shortcut ? `${ariaLabel || children} (${shortcut})` : ariaLabel;

    return (
        <button
            aria-label={fullAriaLabel}
            className={`${base} ${variants[variant]}`}
            onClick={onClick}
            disabled={disabled}
            title={shortcut ? `Shortcut: ${shortcut}` : undefined}
        >
            <span className="flex items-center gap-1">
                {children}
                {shortcut && (
                    <span className="text-[10px] opacity-60 ml-1 hidden lg:inline">
                        {shortcut}
                    </span>
                )}
            </span>
        </button>
    );
}

const Divider = memo(() => (
    <div className="hidden lg:block w-px h-[30px] bg-gray-600" />
));
Divider.displayName = 'Divider';

interface NavigationSectionProps {
    currentIndex: number;
    totalImages: number;
    imageName: string;
    annotatedCount: number;
    percentage: number;
    hasAnnotations: boolean;
    onPrev: () => void;
    onNext: () => void;
}

const NavigationSection = memo(function NavigationSection({
    currentIndex,
    totalImages,
    imageName,
    annotatedCount,
    percentage,
    hasAnnotations,
    onPrev,
    onNext,
}: NavigationSectionProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 sm:gap-2">
                <ToolbarButton
                    onClick={onPrev}
                    disabled={currentIndex === 0}
                    ariaLabel="Previous image"
                >
                    ← <span className="hidden md:inline">Prev</span>
                </ToolbarButton>
                <ToolbarButton
                    onClick={onNext}
                    disabled={currentIndex === totalImages - 1}
                    ariaLabel="Next image"
                >
                    <span className="hidden md:inline">Next</span> →
                </ToolbarButton>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
                <span className="text-xs sm:text-sm text-gray-200 whitespace-nowrap flex items-center gap-1.5">
                    <span
                        className={`text-base ${hasAnnotations ? 'text-green-400' : 'text-gray-500'}`}
                        aria-label={hasAnnotations ? 'Annotated' : 'Not annotated'}
                    >
                        {hasAnnotations ? "✓" : "○"}
                    </span>
                    <span className="tabular-nums font-medium">{currentIndex + 1}/{totalImages}</span>
                </span>

                <span
                    className="text-xs text-gray-300 truncate max-w-[80px] sm:max-w-[120px] md:max-w-[200px]"
                    title={imageName}
                >
                    {imageName}
                </span>

                <span className="text-[10px] sm:text-xs text-gray-300 font-semibold whitespace-nowrap bg-gray-700 px-2 py-1 rounded tabular-nums">
                    {annotatedCount}/{totalImages} <span className="hidden sm:inline">({percentage}%)</span>
                </span>
            </div>
        </div>
    );
});

const MODES: { label: string; icon: string; value: Mode; shortcut: string }[] = [
    { label: "Pan", icon: "✋", value: "pan", shortcut: SHORTCUTS.pan },
    { label: "Draw", icon: "✏️", value: "draw", shortcut: SHORTCUTS.draw },
    { label: "Mask", icon: "🎭", value: "mask", shortcut: SHORTCUTS.mask },
    { label: "Delete", icon: "🗑️", value: "delete", shortcut: SHORTCUTS.delete },
];


interface ModeSectionProps {
    mode: Mode;
    onModeChange: (m: Mode) => void;
}

const ModeSection = memo(function ModeSection({
    mode,
    onModeChange,
}: ModeSectionProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
                {MODES.map((m) => (
                    <ToolbarButton
                        key={m.value}
                        onClick={() => onModeChange(m.value)}
                        variant={mode === m.value ? "green" : "blue"}
                        ariaLabel={`Switch to ${m.label} mode`}
                        shortcut={m.shortcut}
                    >
                        <span className="inline-block">{m.icon}</span>
                        <span className="hidden sm:inline ml-1">{m.label}</span>
                    </ToolbarButton>
                ))}
            </div>

            <span
                className="px-2 sm:px-3 py-1 bg-gray-700 rounded text-[10px] sm:text-xs font-semibold uppercase min-w-[60px] sm:min-w-[80px] text-center text-gray-200"
                aria-label={`Current mode: ${mode}`}
            >
                {mode}
            </span>
        </div>
    );
});

interface ColorSectionProps {
    color: string;
    onColorChange: (color: string) => void;
    disabled?: boolean;
}

const ColorSection = memo(function ColorSection({
    color,
    onColorChange,
    disabled,
}: ColorSectionProps) {
    return (
        <div
            className={`flex items-center gap-2 transition-opacity ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
            aria-disabled={disabled}
        >
            <label
                className="text-xs sm:text-sm text-gray-200 whitespace-nowrap"
                htmlFor="color-picker"
            >
                <span className="hidden sm:inline">Color:</span>
                <span className="sm:hidden">🎨</span>
            </label>
            <div className="w-[160px] sm:w-[200px]">
                <ColorPicker
                    colors={COLORS}
                    selected={color}
                    onSelect={disabled ? () => { } : onColorChange}
                />
            </div>
        </div>
    );
});

interface OcclusionToggleProps {
    isOccluded: boolean;
    onOccludedChange: (val: boolean) => void;
    disabled?: boolean;
}

const OcclusionToggle = memo(function OcclusionToggle({
    isOccluded,
    onOccludedChange,
    disabled,
}: OcclusionToggleProps) {
    return (
        <div
            className={`flex items-center gap-2 px-2 sm:px-3 py-1 bg-gray-700 rounded text-xs sm:text-sm transition-opacity min-w-[100px] sm:min-w-[110px] ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
            aria-disabled={disabled}
        >
            <input
                type="checkbox"
                id="occluded"
                checked={isOccluded}
                onChange={(e) => onOccludedChange(e.target.checked)}
                disabled={disabled}
                className="w-3 h-3 sm:w-4 sm:h-4 cursor-pointer accent-green-500 disabled:cursor-not-allowed"
                aria-label="Mark as occluded"
            />
            <label
                htmlFor="occluded"
                className={`select-none whitespace-nowrap text-gray-200 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
                Occluded
            </label>
        </div>
    );
});

interface HistorySectionProps {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onSave: () => void;
    onResetView: () => void;
}

const HistorySection = memo(function HistorySection({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onSave,
    onResetView,
}: HistorySectionProps) {
    return (
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <div className="flex items-center gap-1 sm:gap-2">
                <ToolbarButton
                    onClick={onUndo}
                    disabled={!canUndo}
                    variant="yellow"
                    ariaLabel="Undo last action"
                    shortcut={SHORTCUTS.undo}
                >
                    <span className="text-lg sm:text-base">↶</span>
                    <span className="hidden lg:inline ml-1">Undo</span>
                </ToolbarButton>
                <ToolbarButton
                    onClick={onRedo}
                    disabled={!canRedo}
                    variant="yellow"
                    ariaLabel="Redo last action"
                    shortcut={SHORTCUTS.redo}
                >
                    <span className="text-lg sm:text-base">↷</span>
                    <span className="hidden lg:inline ml-1">Redo</span>
                </ToolbarButton>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                <ToolbarButton
                    onClick={onResetView}
                    variant="gray"
                    ariaLabel="Reset view"
                    shortcut={SHORTCUTS.reset}
                >
                    <span className="text-base">🔄</span>
                    <span className="hidden xl:inline ml-1">Reset View</span>
                </ToolbarButton>
                <ToolbarButton
                    onClick={onSave}
                    variant="green"
                    ariaLabel="Save annotations"
                    shortcut={SHORTCUTS.save}
                >
                    <span className="text-base">💾</span>
                    <span className="hidden md:inline ml-1">Save</span>
                </ToolbarButton>
            </div>
        </div>
    );
});

export interface ToolbarProps {
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
}: ToolbarProps) {
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

    const isDrawMode = mode === 'draw' || mode === 'mask';

    const navigationProps = useMemo(() => ({
        currentIndex,
        totalImages,
        imageName,
        annotatedCount,
        percentage,
        hasAnnotations,
        onPrev,
        onNext,
    }), [currentIndex, totalImages, imageName, annotatedCount, percentage, hasAnnotations, onPrev, onNext]);

    const handleModeChange = useCallback((newMode: Mode) => {
        onModeChange(newMode);
    }, [onModeChange]);

    const handleColorChange = useCallback((newColor: string) => {
        onColorChange(newColor);
    }, [onColorChange]);

    const handleOccludedChange = useCallback((occluded: boolean) => {
        onOccludedChange(occluded);
    }, [onOccludedChange]);

    return (
        <div
            role="toolbar"
            aria-label="Image annotation toolbar"
            className="fixed top-0 left-0 right-0 bg-[#2c3e50] text-white z-50 shadow-lg"
        >
            <div className="flex flex-wrap items-center px-2 sm:px-4 lg:px-5 py-2 gap-3 lg:gap-4">
                {/* Navigation - Priority group */}
                <NavigationSection {...navigationProps} />

                {/* Mode controls */}
                <ModeSection mode={mode} onModeChange={handleModeChange} />

                {/* Drawing options group */}
                <div className="flex items-center gap-3 flex-wrap">
                    <ColorSection
                        color={color}
                        onColorChange={handleColorChange}
                        disabled={!isDrawMode}
                    />

                    <OcclusionToggle
                        isOccluded={isOccluded}
                        onOccludedChange={handleOccludedChange}
                        disabled={!isDrawMode}
                    />
                </div>

                {/* History & Actions - Always together */}
                <div className="flex-1 flex justify-end min-w-fit">
                    <HistorySection
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onUndo={onUndo}
                        onRedo={onRedo}
                        onSave={onSave}
                        onResetView={onResetView}
                    />
                </div>
            </div>
        </div>
    );
}