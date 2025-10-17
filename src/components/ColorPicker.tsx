import { Color } from "@/types/types";

interface ColorPickerProps {
    colors: Color[];
    selected: string;
    onSelect: (color: string) => void;
    size?: number;
}

export function ColorPicker({
    colors,
    selected,
    onSelect,
    size = 30,
}: ColorPickerProps) {
    return (
        <div className="flex items-center gap-1.5">
            {colors.map((color) => {
                const isSelected = selected === color.value;
                return (
                    <button
                        key={color.name + color.value}
                        title={color.name}
                        aria-pressed={isSelected}
                        onClick={() => onSelect(color.value)}
                        className={`rounded cursor-pointer transition-colors border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-white ${isSelected
                            ? "border-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                            : "border-transparent"
                            }`}
                        style={{
                            backgroundColor: color.value,
                            width: size,
                            height: size,
                        }}
                    />
                );
            })}
        </div>
    );
}
