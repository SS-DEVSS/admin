import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type SearchComboboxProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (option: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  maxOptions?: number;
  className?: string;
};

export default function SearchCombobox({
  value,
  onValueChange,
  onSelect,
  options,
  placeholder,
  disabled = false,
  emptyMessage = "No hay opciones que coincidan.",
  maxOptions = 80,
  className,
}: SearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    const base = query
      ? options.filter((option) => option.toLowerCase().includes(query))
      : options;
    return base.slice(0, maxOptions);
  }, [value, options, maxOptions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openDropdown = () => {
    if (!disabled) setOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <Input
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          openDropdown();
        }}
        onClick={openDropdown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && !disabled ? (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className="flex w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
