import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

export interface CustomSelectProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  wrapperClassName?: string;
  disabled?: boolean;
  required?: boolean;
}

export function CustomSelect({
  id,
  label,
  value,
  onChange,
  options,
  wrapperClassName,
  disabled,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div ref={containerRef} className={cn("relative w-full", isOpen && "z-50", wrapperClassName)}>
      {label && (
        <span className="absolute left-4 top-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80 pointer-events-none z-10">
          {label}
        </span>
      )}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full text-left rounded-2xl border border-border/80 bg-surface/40 px-4 text-sm font-semibold text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20",
          label ? "pb-2 pt-6 pr-10" : "py-3 pr-10",
          "cursor-pointer hover:border-primary/40 hover:bg-surface focus:border-primary flex justify-between items-center shadow-sm",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="truncate">{selectedOption?.label || "-"}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground/60 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Floating Options Menu */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-border/80 bg-surface/95 p-1.5 shadow-elevated animate-in fade-in-50 slide-in-from-top-2 duration-200">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
              Tidak ada pilihan
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150 flex items-center justify-between",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground hover:bg-muted/60"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
