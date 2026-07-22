import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ActiveApplicationFilterChip,
  ApplicationFilterMap,
  flattenActiveApplicationFilters,
  removeApplicationFilterValue,
  sanitizeApplicationFilters,
} from "@/utils/productApplicationFilters";
import { CategoryAtributes } from "@/models/category";

type ApplicationFiltersActiveSummaryProps = {
  filters: ApplicationFilterMap;
  attributes: CategoryAtributes[];
  onFiltersChange: (filters: ApplicationFilterMap) => void;
  onClear?: () => void;
  compact?: boolean;
};

const ApplicationFiltersActiveSummary = ({
  filters,
  attributes,
  onFiltersChange,
  onClear,
  compact = false,
}: ApplicationFiltersActiveSummaryProps) => {
  const chips = flattenActiveApplicationFilters(filters, attributes);

  if (chips.length === 0) {
    return null;
  }

  const handleRemove = (chip: ActiveApplicationFilterChip) => {
    const next = removeApplicationFilterValue(
      filters,
      chip.attributeId,
      chip.value
    );
    onFiltersChange(sanitizeApplicationFilters(next));
  };

  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-1.5"
          : "rounded-lg border bg-muted/30 p-3"
      }
    >
      {!compact && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Filtros activos</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onClear}
          >
            Limpiar todo
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <Badge
            key={`${chip.attributeId}-${chip.value}`}
            variant="secondary"
            className="gap-1 pr-1 font-normal"
          >
            <span className="max-w-[180px] truncate">
              {chip.attributeName}: {chip.value}
            </span>
            <button
              type="button"
              className="rounded-sm p-0.5 hover:bg-background/60"
              aria-label={`Quitar ${chip.attributeName} ${chip.value}`}
              onClick={() => handleRemove(chip)}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {compact && onClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={onClear}
          >
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
};

export default ApplicationFiltersActiveSummary;
