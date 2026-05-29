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
  loading?: boolean;
  /** Tras elegir una opción, mantener el listado abierto (p. ej. agregar varios productos). */
  keepOpenAfterSelect?: boolean;
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
  loading = false,
  keepOpenAfterSelect = false,
}: SearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    const base = query
      ? options.filter((option) => option.toLowerCase().includes(query))
      : options;
    return base.slice(0, maxOptions);
  }, [value, options, maxOptions]);

  const updatePlacement = () => {
    const input = inputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setOpenUpward(spaceBelow < 220 && spaceAbove > spaceBelow);
  };

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
    if (disabled) return;
    updatePlacement();
    setOpen(true);
  };

  const showDropdown = open && !disabled;

  return (
    <div
      ref={containerRef}
      className={`relative ${showDropdown ? "z-50" : "z-0"} ${className ?? ""}`}
    >
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          openDropdown();
        }}
        onClick={openDropdown}
        onFocus={openDropdown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {showDropdown ? (
        <div
          className={`absolute z-[100] w-full overflow-y-auto rounded-md border border-border bg-background shadow-lg ${
            openUpward ? "bottom-full mb-1 max-h-60" : "top-full mt-1 max-h-72"
          }`}
        >
          {loading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Cargando opciones...</p>
          ) : filteredOptions.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className="flex w-full bg-background px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(option);
                  if (keepOpenAfterSelect) {
                    updatePlacement();
                    setOpen(true);
                  } else {
                    setOpen(false);
                  }
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
};
