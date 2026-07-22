import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CategoryAtributes } from "@/models/category";
import { cn } from "@/lib/utils";

type ApplicationFilterMultiSelectProps = {
  attribute: CategoryAtributes;
  selectedValues: string[];
  options: string[];
  onChange: (values: string[]) => void;
};

const ApplicationFilterMultiSelect = ({
  attribute,
  selectedValues,
  options,
  onChange,
}: ApplicationFilterMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const label = attribute.display_name || attribute.name;

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, search]);

  const selectedSet = useMemo(
    () => new Set(selectedValues),
    [selectedValues]
  );

  const triggerLabel = useMemo(() => {
    if (selectedValues.length === 0) {
      return `Seleccionar ${label.toLowerCase()}`;
    }
    if (selectedValues.length === 1) {
      return selectedValues[0];
    }
    return `${selectedValues.length} seleccionados`;
  }, [label, selectedValues]);

  const toggleValue = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, value]);
      return;
    }
    onChange(selectedValues.filter((item) => item !== value));
  };

  const clearSelection = () => {
    onChange([]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">{label}</label>
        {selectedValues.length > 0 && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={clearSelection}
          >
            Limpiar
          </button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-auto min-h-10 w-full justify-between px-3 py-2 font-normal",
              selectedValues.length === 0 && "text-muted-foreground"
            )}
          >
            <span className="truncate text-left">{triggerLabel}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <div className="border-b p-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Buscar ${label.toLowerCase()}…`}
              className="h-8"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                Sin opciones
              </p>
            ) : (
              filteredOptions.map((option) => {
                const checked = selectedSet.has(option);
                return (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 hover:bg-muted/60"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) =>
                        toggleValue(option, next === true)
                      }
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedValues.map((value) => (
            <span
              key={value}
              className="inline-flex max-w-full items-center rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
            >
              <span className="truncate">{value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApplicationFilterMultiSelect;
