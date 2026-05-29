import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import { Item } from "@/models/product";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronDown, Loader2, X } from "lucide-react";
import { BlogRelatedLinks } from "@/utils/blogRelatedLinks";
import { getGroupedApplicationSuggestions, getLinkedApplicationDisplayItems, isApplicationGroupFullyLinked, removeApplicationYearFromLinked, type LinkedApplicationDisplayItem } from "@/utils/applicationLabel";
import SearchCombobox from "@/components/products/SearchCombobox";
import ProductLinksPicker from "@/components/products/ProductLinksPicker";
import { mapListProductToItem, productService } from "@/services/productService";

export type RelatedLinksEditorProps = {
  relatedLinks: BlogRelatedLinks;
  onChange: (next: BlogRelatedLinks) => void;
  /** Nombres de productos ya guardados (p. ej. al editar). */
  selectedProductLabels?: Record<string, string>;
  /** Id de sesión de edición: activa loading en sectionCards solo al abrir el modal. */
  hydrateSessionKey?: string;
  productPickerLabel?: string;
  productPickerEmptyMessage?: string;
  sectionCards?: boolean;
  productSearchVariant?: "default" | "combobox";
  referenceSearchVariant?: "default" | "combobox";
};

const toUniqueValues = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const SectionLoading = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-10">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

const SectionWrapper = ({
  title,
  description,
  sectionCards,
  children,
}: {
  title: string;
  description?: string;
  sectionCards: boolean;
  children: ReactNode;
}) => {
  if (!sectionCards) return <>{children}</>;
  return (
    <Card className="border shadow-sm min-w-0 overflow-visible">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="overflow-visible pt-0">{children}</CardContent>
    </Card>
  );
};

const ApplicationSuggestionGroup = ({
  group,
  linkedApplications,
  onAdd,
}: {
  group: ReturnType<typeof getGroupedApplicationSuggestions>[number];
  linkedApplications: string[];
  onAdd: (label: string) => void;
}) => {
  if (isApplicationGroupFullyLinked(group, linkedApplications)) return null;

  if (group.years.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-3 space-y-2 min-w-0 max-w-full overflow-hidden">
        <p className="text-xs font-medium leading-snug break-words">{group.baseLabel || group.fullLabel}</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted"
            onClick={() => onAdd(group.fullLabel)}
          >
            + {group.fullLabel}
          </button>
        </div>
      </div>
    );
  }

  const availableYears = group.years.filter(
    (year) => !linkedApplications.includes(group.labelForYear(year))
  );
  const hasPartialYearSelection = group.years.length > availableYears.length;
  const hasMultipleYears = group.years.length > 1;
  const showRangeButton = hasMultipleYears && !hasPartialYearSelection;

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-2 min-w-0 max-w-full overflow-hidden">
      <p className="text-xs font-medium leading-snug break-words">{group.baseLabel || group.fullLabel}</p>
      <div className="flex flex-wrap gap-1.5">
        {showRangeButton ? (
          <button
            type="button"
            className="rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted"
            onClick={() => onAdd(group.fullLabel)}
          >
            + Rango {group.yearRangeLabel}
          </button>
        ) : null}
        {!hasMultipleYears && availableYears.length === 1 ? (
          <button
            type="button"
            className="rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted"
            onClick={() => onAdd(group.fullLabel)}
          >
            + {group.fullLabel}
          </button>
        ) : null}
        {hasMultipleYears
          ? availableYears.map((year) => (
              <button
                key={year}
                type="button"
                className="rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted"
                onClick={() => onAdd(group.labelForYear(year))}
              >
                + {year}
              </button>
            ))
          : null}
      </div>
    </div>
  );
};

const LinkedApplicationChip = ({
  item,
  onRemoveAll,
  onRemoveYear,
}: {
  item: LinkedApplicationDisplayItem;
  onRemoveAll: (labels: string[]) => void;
  onRemoveYear: (item: LinkedApplicationDisplayItem, yearLabel: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasMultipleYears = item.editableYears.length > 1;

  if (!hasMultipleYears) {
    return (
      <span className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs">
        <span className="min-w-0 truncate">{item.displayLabel}</span>
        <button type="button" className="shrink-0" onClick={() => onRemoveAll(item.storedLabels)} aria-label="Quitar aplicación">
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  if (!expanded) {
    return (
      <span className="flex w-full min-w-0 max-w-full items-center gap-1 rounded-lg border bg-muted px-2.5 py-1.5 text-xs">
        <button
          type="button"
          className="inline-flex min-w-0 flex-1 items-center gap-1 text-left hover:underline"
          onClick={() => setExpanded(true)}
          title="Clic para editar años"
        >
          <span className="min-w-0 break-words">{item.displayLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
        <button
          type="button"
          className="shrink-0"
          onClick={() => onRemoveAll(item.storedLabels)}
          aria-label="Quitar todo el rango"
          title="Quitar todo el rango"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border bg-muted/30 px-3 py-2 space-y-2">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <button
          type="button"
          className="inline-flex min-w-0 flex-1 items-start gap-1 text-left text-xs font-medium leading-snug hover:underline"
          onClick={() => setExpanded(false)}
          title="Clic para contraer"
        >
          <span className="min-w-0 break-words">{item.displayLabel}</span>
          <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 rotate-180 text-muted-foreground" />
        </button>
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onRemoveAll(item.storedLabels)}
          aria-label="Quitar todo el rango"
          title="Quitar todo el rango"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {item.editableYears.map(({ year, label }) => (
          <span
            key={year}
            className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs"
          >
            {year}
            <button
              type="button"
              onClick={() => onRemoveYear(item, label)}
              aria-label={`Quitar año ${year}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default function RelatedLinksEditor({
  relatedLinks,
  onChange,
  selectedProductLabels,
  hydrateSessionKey,
  productPickerLabel,
  productPickerEmptyMessage,
  sectionCards = false,
  productSearchVariant = "combobox",
  referenceSearchVariant = "combobox",
}: RelatedLinksEditorProps) {
  const [referenceDraft, setReferenceDraft] = useState("");
  const [applicationDraft, setApplicationDraft] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Item[]>([]);
  const [sectionLinksLoading, setSectionLinksLoading] = useState(false);
  const productCacheRef = useRef<Map<string, Item>>(new Map());
  const pendingInitialSectionLoadRef = useRef(
    Boolean(hydrateSessionKey && sectionCards)
  );

  useEffect(() => {
    pendingInitialSectionLoadRef.current = Boolean(hydrateSessionKey && sectionCards);
    setSectionLinksLoading(false);
  }, [hydrateSessionKey, sectionCards]);

  useEffect(() => {
    let cancelled = false;

    const loadSelectedProducts = async () => {
      const ids = relatedLinks.productIds;
      const showSectionLoader =
        pendingInitialSectionLoadRef.current &&
        sectionCards &&
        hydrateSessionKey != null &&
        ids.length > 0;

      if (ids.length === 0) {
        setSelectedProducts([]);
        if (showSectionLoader) setSectionLinksLoading(false);
        pendingInitialSectionLoadRef.current = false;
        return;
      }

      if (showSectionLoader) {
        setSectionLinksLoading(true);
      }

      try {
        const loaded = await Promise.all(
          ids.map(async (id) => {
            const cached = productCacheRef.current.get(id);
            if (cached) return cached;

            const product = await productService.getProductById(id);
            if (cancelled || !product) return null;

            const item = mapListProductToItem(product);
            productCacheRef.current.set(id, item);
            return item;
          })
        );

        if (!cancelled) {
          setSelectedProducts(loaded.filter((item): item is Item => item != null));
        }
      } finally {
        if (!cancelled) {
          if (showSectionLoader) {
            setSectionLinksLoading(false);
          }
          pendingInitialSectionLoadRef.current = false;
        }
      }
    };

    void loadSelectedProducts();

    return () => {
      cancelled = true;
    };
  }, [relatedLinks.productIds, sectionCards, hydrateSessionKey]);

  const showApplications = useMemo(
    () => selectedProducts.some((product) => (product.applications?.length ?? 0) > 0),
    [selectedProducts]
  );

  const showApplicationsSection =
    sectionLinksLoading ||
    showApplications ||
    relatedLinks.applications.length > 0;

  const referenceSuggestions = useMemo(
    () =>
      toUniqueValues(
        selectedProducts.flatMap((product) =>
          (product.references || []).map((reference) =>
            `${reference.referenceBrand ?? ""} ${reference.referenceNumber}`.trim()
          )
        )
      ).filter((value) => !relatedLinks.references.includes(value)),
    [selectedProducts, relatedLinks.references]
  );

  const applicationSuggestionGroups = useMemo(() => {
    const byId = new Map<
      string,
      ReturnType<typeof getGroupedApplicationSuggestions>[number]
    >();
    selectedProducts.forEach((product) => {
      getGroupedApplicationSuggestions(product.applications).forEach((group) => {
        if (!byId.has(group.id)) byId.set(group.id, group);
      });
    });
    return Array.from(byId.values());
  }, [selectedProducts]);

  const visibleApplicationSuggestionGroups = useMemo(
    () =>
      applicationSuggestionGroups.filter(
        (group) => !isApplicationGroupFullyLinked(group, relatedLinks.applications)
      ),
    [applicationSuggestionGroups, relatedLinks.applications]
  );

  const linkedApplicationDisplayItems = useMemo(
    () =>
      getLinkedApplicationDisplayItems(
        relatedLinks.applications,
        applicationSuggestionGroups
      ),
    [relatedLinks.applications, applicationSuggestionGroups]
  );

  const setNext = (next: BlogRelatedLinks) =>
    onChange({
      productIds: toUniqueValues(next.productIds),
      references: toUniqueValues(next.references),
      applications: toUniqueValues(next.applications),
    });

  const addReferenceValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || relatedLinks.references.includes(trimmed)) return;
    setNext({
      ...relatedLinks,
      references: [...relatedLinks.references, trimmed],
    });
    setReferenceDraft("");
  };

  const addReference = () => {
    addReferenceValue(referenceDraft);
  };

  const addApplication = () => {
    if (!applicationDraft.trim()) return;
    setNext({
      ...relatedLinks,
      applications: [...relatedLinks.applications, applicationDraft],
    });
    setApplicationDraft("");
  };

  const removeApplicationLabels = (labelsToRemove: string[]) => {
    const removeSet = new Set(labelsToRemove);
    setNext({
      ...relatedLinks,
      applications: relatedLinks.applications.filter((item) => !removeSet.has(item)),
    });
  };

  const removeApplicationYear = (item: LinkedApplicationDisplayItem, yearLabel: string) => {
    if (!item.group) {
      removeApplicationLabels([yearLabel]);
      return;
    }

    setNext({
      ...relatedLinks,
      applications: removeApplicationYearFromLinked(
        relatedLinks.applications,
        item.group,
        yearLabel
      ),
    });
  };

  const addApplicationLabel = (label: string) => {
    if (!label.trim() || relatedLinks.applications.includes(label)) return;
    setNext({
      ...relatedLinks,
      applications: [...relatedLinks.applications, label],
    });
  };

  const productsSection = (
    <div className="relative z-40 isolate">
      <ProductLinksPicker
        productIds={relatedLinks.productIds}
        onChange={(productIds) => setNext({ ...relatedLinks, productIds })}
        selectedProductLabels={selectedProductLabels}
        label={sectionCards ? undefined : productPickerLabel}
        emptyMessage={productPickerEmptyMessage}
        searchVariant={productSearchVariant}
      />
    </div>
  );

  const referencesSection = (
    <div className="relative z-10 space-y-3">
      {!sectionCards ? <Label>Referencias vinculadas</Label> : null}
      <div className="flex gap-2">
        {referenceSearchVariant === "combobox" ? (
          <SearchCombobox
            className="flex-1"
            value={referenceDraft}
            onValueChange={setReferenceDraft}
            onSelect={addReferenceValue}
            options={referenceSuggestions}
            placeholder="Buscar o escribir referencia, ej. LuK 620309900"
            emptyMessage={
              relatedLinks.productIds.length === 0
                ? "Selecciona productos para ver referencias sugeridas."
                : "No hay referencias que coincidan."
            }
          />
        ) : (
          <Input
            value={referenceDraft}
            onChange={(e) => setReferenceDraft(e.target.value)}
            placeholder="Ej. LuK 620309900"
          />
        )}
        <Button type="button" variant="outline" onClick={addReference} disabled={!referenceDraft.trim()}>
          Agregar
        </Button>
      </div>
      {referenceSearchVariant === "default" && referenceSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {referenceSuggestions.slice(0, 8).map((reference) => (
            <button
              key={reference}
              type="button"
              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
              onClick={() => addReferenceValue(reference)}
            >
              + {reference}
            </button>
          ))}
        </div>
      ) : referenceSearchVariant === "default" && relatedLinks.productIds.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          No hay referencias sugeridas para los productos seleccionados.
        </p>
      ) : null}
      {relatedLinks.references.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {relatedLinks.references.map((reference) => (
            <span
              key={reference}
              className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs"
            >
              {reference}
              <button
                type="button"
                onClick={() =>
                  setNext({
                    ...relatedLinks,
                    references: relatedLinks.references.filter((item) => item !== reference),
                  })
                }
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sin referencias vinculadas.</p>
      )}
    </div>
  );

  const applicationsSection = showApplicationsSection ? (
    <div className="min-w-0 max-w-full space-y-3 overflow-visible">
      {!sectionCards ? <Label>Aplicaciones vinculadas</Label> : null}
      <div className="flex gap-2">
        <Input
          value={applicationDraft}
          onChange={(e) => setApplicationDraft(e.target.value)}
          placeholder="Ej. Nissan Tsuru 1.6 2002"
        />
        <Button
          type="button"
          variant="outline"
          onClick={addApplication}
          disabled={!applicationDraft.trim()}
        >
          Agregar
        </Button>
      </div>
      {visibleApplicationSuggestionGroups.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {visibleApplicationSuggestionGroups.slice(0, 6).map((group) => (
            <ApplicationSuggestionGroup
              key={group.id}
              group={group}
              linkedApplications={relatedLinks.applications}
              onAdd={addApplicationLabel}
            />
          ))}
        </div>
      ) : relatedLinks.productIds.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          No hay aplicaciones sugeridas para los productos seleccionados.
        </p>
      ) : null}
      {linkedApplicationDisplayItems.length > 0 ? (
        <div className="flex w-full min-w-0 max-w-full flex-col gap-2 pt-1">
          {linkedApplicationDisplayItems.map((item) => (
            <LinkedApplicationChip
              key={item.key}
              item={item}
              onRemoveAll={removeApplicationLabels}
              onRemoveYear={removeApplicationYear}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sin aplicaciones vinculadas.</p>
      )}
    </div>
  ) : null;

  if (sectionCards) {
    const linksLoading = sectionLinksLoading;

    return (
      <div className="min-w-0 max-w-full space-y-4 overflow-visible">
        <SectionWrapper
          title={productPickerLabel || "Productos vinculados"}
          description="Filtra por categoría y subcategoría, busca y agrega productos."
          sectionCards
        >
          {linksLoading ? (
            <SectionLoading message="Cargando productos..." />
          ) : (
            productsSection
          )}
        </SectionWrapper>
        <SectionWrapper
          title="Referencias vinculadas"
          description="Busca en la lista o escribe una referencia manualmente."
          sectionCards
        >
          {linksLoading ? (
            <SectionLoading message="Cargando referencias..." />
          ) : (
            referencesSection
          )}
        </SectionWrapper>
        {showApplicationsSection ? (
          <SectionWrapper
            title="Aplicaciones vinculadas"
            description="Agrega el rango completo o selecciona años específicos."
            sectionCards
          >
            {linksLoading ? (
              <SectionLoading message="Cargando aplicaciones..." />
            ) : (
              applicationsSection
            )}
          </SectionWrapper>
        ) : null}
      </div>
    );
  }

  if (sectionLinksLoading) {
    return (
      <div className="space-y-6">
        <SectionLoading message="Cargando productos, referencias y aplicaciones..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {productsSection}
      {referencesSection}
      {applicationsSection}
    </div>
  );
}
