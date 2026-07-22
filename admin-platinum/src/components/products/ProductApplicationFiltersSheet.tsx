import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CategoryResponse } from "@/models/category";
import { productService } from "@/services/productService";
import {
  ApplicationFilterMap,
  countActiveApplicationFilters,
  getApplicationAttributesFromCategory,
  sanitizeApplicationFilters,
} from "@/utils/productApplicationFilters";
import {
  getCachedFilterOptions,
  setCachedFilterOptions,
} from "@/utils/applicationFilterOptionsCache";
import ApplicationFilterMultiSelect from "@/components/products/ApplicationFilterMultiSelect";
import ApplicationFiltersActiveSummary from "@/components/products/ApplicationFiltersActiveSummary";

type ProductApplicationFiltersSheetProps = {
  categoryId: string | undefined;
  categoryDetails: CategoryResponse | null;
  filters: ApplicationFilterMap;
  onFiltersChange: (filters: ApplicationFilterMap) => void;
  disabled?: boolean;
};

const ProductApplicationFiltersSheet = ({
  categoryId,
  categoryDetails,
  filters,
  onFiltersChange,
  disabled = false,
}: ProductApplicationFiltersSheetProps) => {
  const [open, setOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>(
    () => (categoryId ? getCachedFilterOptions(categoryId, { flat: true }) : null) ?? {}
  );
  const [loadingOptions, setLoadingOptions] = useState(false);

  const applicationAttributes = useMemo(
    () => getApplicationAttributesFromCategory(categoryDetails),
    [categoryDetails]
  );

  const activeCount = countActiveApplicationFilters(filters);
  const hasAttributes = applicationAttributes.length > 0;

  const loadFilterOptions = useCallback(
    async (force = false) => {
      if (!categoryId || !hasAttributes) return;

      const cached = getCachedFilterOptions(categoryId, { flat: true });
      if (cached && !force) {
        setFilterOptions(cached);
        return;
      }

      setLoadingOptions(true);
      try {
        const options = await productService.getCategoryFilterOptions(
          categoryId,
          undefined,
          { flat: true }
        );
        setCachedFilterOptions(categoryId, options, { flat: true });
        setFilterOptions(options);
      } catch {
        if (!cached) {
          setFilterOptions({});
        }
      } finally {
        setLoadingOptions(false);
      }
    },
    [categoryId, hasAttributes]
  );

  const mergedFilterOptions = useMemo(() => {
    return Object.fromEntries(
      applicationAttributes.map((attribute) => {
        const attributeId = attribute.id ?? "";
        return [attributeId, filterOptions[attributeId] ?? []];
      })
    );
  }, [applicationAttributes, filterOptions]);

  useEffect(() => {
    if (!categoryId) {
      setFilterOptions({});
      return;
    }

    const cached = getCachedFilterOptions(categoryId, { flat: true });
    if (cached) {
      setFilterOptions(cached);
      return;
    }

    void loadFilterOptions();
  }, [categoryId, loadFilterOptions]);

  useEffect(() => {
    if (!open || !categoryId) return;
    void loadFilterOptions(true);
  }, [open, categoryId, loadFilterOptions]);

  const handleAttributeChange = (attributeId: string, values: string[]) => {
    const next = { ...filters };
    if (values.length === 0) {
      delete next[attributeId];
    } else {
      next[attributeId] = values;
    }
    onFiltersChange(sanitizeApplicationFilters(next));
  };

  const handleClear = () => {
    onFiltersChange({});
  };

  if (!categoryId) {
    return null;
  }

  const showInitialLoader =
    loadingOptions && Object.keys(filterOptions).length === 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="gap-2 shrink-0"
          disabled={disabled || !hasAttributes}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Atributos
          {activeCount > 0 && (
            <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtros por atributos</SheetTitle>
          <SheetDescription>
            Selecciona uno o más valores por atributo. Los filtros se combinan
            entre atributos.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {!hasAttributes ? (
            <p className="text-sm text-muted-foreground">
              Esta categoría no tiene atributos de aplicación configurados.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <ApplicationFiltersActiveSummary
                filters={filters}
                attributes={applicationAttributes}
                onFiltersChange={onFiltersChange}
                onClear={handleClear}
              />

              {showInitialLoader ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando opciones…
                </div>
              ) : (
                applicationAttributes.map((attribute) => (
                  <ApplicationFilterMultiSelect
                    key={attribute.id}
                    attribute={attribute}
                    selectedValues={filters[attribute.id ?? ""] ?? []}
                    options={mergedFilterOptions[attribute.id ?? ""] ?? []}
                    onChange={(values) =>
                      handleAttributeChange(attribute.id ?? "", values)
                    }
                  />
                ))
              )}

              {loadingOptions && !showInitialLoader && (
                <p className="text-xs text-muted-foreground">
                  Actualizando opciones…
                </p>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="mt-auto border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={activeCount === 0}
          >
            Limpiar atributos
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default ProductApplicationFiltersSheet;
