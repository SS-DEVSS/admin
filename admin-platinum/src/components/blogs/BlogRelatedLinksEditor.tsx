import { useMemo, useState } from "react";
import { Item } from "@/models/product";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, X } from "lucide-react";
import { BlogRelatedLinks } from "@/utils/blogRelatedLinks";

type BlogRelatedLinksEditorProps = {
  products: Item[];
  productsLoading: boolean;
  relatedLinks: BlogRelatedLinks;
  onChange: (next: BlogRelatedLinks) => void;
};

const toUniqueValues = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const applicationLabel = (application: any): string => {
  if (typeof application === "string") return application;
  if (!application || typeof application !== "object") return "";
  const candidates = [
    application.description,
    application.referenceNumber,
    application.referenceBrand,
    application.sku,
    application.type,
  ];
  return candidates.find((value) => typeof value === "string" && value.trim()) ?? "";
};

export default function BlogRelatedLinksEditor({
  products,
  productsLoading,
  relatedLinks,
  onChange,
}: BlogRelatedLinksEditorProps) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [referenceDraft, setReferenceDraft] = useState("");
  const [applicationDraft, setApplicationDraft] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const selectedProducts = useMemo(
    () => products.filter((product) => relatedLinks.productIds.includes(product.id)),
    [products, relatedLinks.productIds]
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.category?.name?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const productOptions = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return products.filter((product) => {
      const categoryName = product.category?.name ?? "";
      const matchesCategory =
        selectedCategory === "all" || categoryName === selectedCategory;
      if (!matchesCategory) return false;
      if (!query) return true;
      const searchableText = [
        product.name || "",
        ...(product.variants || []).map((variant) => variant.sku || ""),
      ]
        .join(" ")
        .toLowerCase();
      return searchableText.includes(query);
    });
  }, [products, productSearch, selectedCategory]);

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

  const applicationSuggestions = useMemo(
    () =>
      toUniqueValues(
        selectedProducts.flatMap((product) =>
          (product.applications || []).map((application) => applicationLabel(application))
        )
      ).filter((value) => !relatedLinks.applications.includes(value)),
    [selectedProducts, relatedLinks.applications]
  );

  const setNext = (next: BlogRelatedLinks) =>
    onChange({
      productIds: toUniqueValues(next.productIds),
      references: toUniqueValues(next.references),
      applications: toUniqueValues(next.applications),
    });

  const addProduct = () => {
    if (!selectedProductId) return;
    setNext({
      ...relatedLinks,
      productIds: [...relatedLinks.productIds, selectedProductId],
    });
    setSelectedProductId("");
  };

  const addReference = () => {
    if (!referenceDraft.trim()) return;
    setNext({
      ...relatedLinks,
      references: [...relatedLinks.references, referenceDraft],
    });
    setReferenceDraft("");
  };

  const addApplication = () => {
    if (!applicationDraft.trim()) return;
    setNext({
      ...relatedLinks,
      applications: [...relatedLinks.applications, applicationDraft],
    });
    setApplicationDraft("");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Productos vinculados</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="relative">
            <select
              className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Todas las categorias</option>
              {categoryOptions.map((categoryName) => (
                <option key={categoryName} value={categoryName}>
                  {categoryName}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative w-full">
            <select
              className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            disabled={productsLoading}
          >
            <option value="">{productsLoading ? "Cargando productos..." : "Selecciona un producto"}</option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
                {product.variants?.[0]?.sku ? ` (${product.variants[0].sku})` : ""}
              </option>
            ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Button type="button" variant="outline" onClick={addProduct} disabled={!selectedProductId}>
            Agregar
          </Button>
        </div>
        {selectedProducts.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {selectedProducts.map((product) => (
              <span
                key={product.id}
                className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs"
              >
                {product.name}
                <button
                  type="button"
                  onClick={() =>
                    setNext({
                      ...relatedLinks,
                      productIds: relatedLinks.productIds.filter((id) => id !== product.id),
                    })
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Sin productos vinculados.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Referencias vinculadas</Label>
        <div className="flex gap-2">
          <Input
            value={referenceDraft}
            onChange={(e) => setReferenceDraft(e.target.value)}
            placeholder="Ej. LuK 620309900"
          />
          <Button type="button" variant="outline" onClick={addReference} disabled={!referenceDraft.trim()}>
            Agregar
          </Button>
        </div>
        {referenceSuggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {referenceSuggestions.slice(0, 8).map((reference) => (
              <button
                key={reference}
                type="button"
                className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                onClick={() =>
                  setNext({
                    ...relatedLinks,
                    references: [...relatedLinks.references, reference],
                  })
                }
              >
                + {reference}
              </button>
            ))}
          </div>
        ) : relatedLinks.productIds.length > 0 ? (
          <p className="text-xs text-muted-foreground">No hay referencias sugeridas para los productos seleccionados.</p>
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

      <div className="space-y-2">
        <Label>Aplicaciones vinculadas</Label>
        <div className="flex gap-2">
          <Input
            value={applicationDraft}
            onChange={(e) => setApplicationDraft(e.target.value)}
            placeholder="Ej. Nissan Tsuru 1.6 2002"
          />
          <Button type="button" variant="outline" onClick={addApplication} disabled={!applicationDraft.trim()}>
            Agregar
          </Button>
        </div>
        {applicationSuggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {applicationSuggestions.slice(0, 8).map((application) => (
              <button
                key={application}
                type="button"
                className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                onClick={() =>
                  setNext({
                    ...relatedLinks,
                    applications: [...relatedLinks.applications, application],
                  })
                }
              >
                + {application}
              </button>
            ))}
          </div>
        ) : relatedLinks.productIds.length > 0 ? (
          <p className="text-xs text-muted-foreground">No hay aplicaciones sugeridas para los productos seleccionados.</p>
        ) : null}
        {relatedLinks.applications.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {relatedLinks.applications.map((application) => (
              <span
                key={application}
                className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs"
              >
                {application}
                <button
                  type="button"
                  onClick={() =>
                    setNext({
                      ...relatedLinks,
                      applications: relatedLinks.applications.filter((item) => item !== application),
                    })
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Sin aplicaciones vinculadas.</p>
        )}
      </div>
    </div>
  );
}
