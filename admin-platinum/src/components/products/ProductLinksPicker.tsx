import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Item } from "@/models/product";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, X } from "lucide-react";
import SearchCombobox from "@/components/products/SearchCombobox";
import SubcategoryTreePicker from "@/components/products/SubcategoryTreePicker";
import { useCategoryContext } from "@/context/categories-context";
import { useSubcategories } from "@/hooks/useSubcategories";
import type { SubcategoryTreeNode } from "@/models/subcategory";
import { mapListProductToItem, productService } from "@/services/productService";
import { useToast } from "@/hooks/use-toast";

type ProductLinksPickerProps = {
  productIds: string[];
  onChange: (productIds: string[]) => void;
  /** Etiquetas de productos ya vinculados (p. ej. al editar un boletín). */
  selectedProductLabels?: Record<string, string>;
  label?: string;
  emptyMessage?: string;
  searchVariant?: "default" | "combobox";
};

const getProductSku = (product: Item) => product.variants?.[0]?.sku?.trim() || "";

const formatProductOption = (product: Item) => {
  const name = product.name?.trim() || "";
  const sku = getProductSku(product);
  if (!sku) return name;
  if (sku.toLowerCase() === name.toLowerCase()) return name;
  return `${name} (${sku})`;
};

/** Corrige etiquetas cacheadas tipo "SKU (SKU)". */
const normalizeProductLabel = (label: string) => {
  const trimmed = label.trim();
  const match = trimmed.match(/^(.+?) \((.+)\)$/);
  if (match && match[1].trim().toLowerCase() === match[2].trim().toLowerCase()) {
    return match[1].trim();
  }
  return trimmed;
};

export default function ProductLinksPicker({
  productIds,
  onChange,
  selectedProductLabels = {},
  label = "Productos vinculados",
  emptyMessage = "Sin productos vinculados.",
  searchVariant = "combobox",
}: ProductLinksPickerProps) {
  const { toast } = useToast();
  const { categories, loading: categoriesLoading } = useCategoryContext();
  const { getTree } = useSubcategories();

  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("all");
  const [subcategoryTree, setSubcategoryTree] = useState<SubcategoryTreeNode[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<Item[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const labelCacheRef = useRef<Record<string, string>>({});
  const [, setLabelCacheTick] = useState(0);

  const setCachedLabel = useCallback((id: string, label: string) => {
    if (!id || !label || labelCacheRef.current[id] === label) return;
    labelCacheRef.current[id] = label;
    setLabelCacheTick((n) => n + 1);
  }, []);

  useEffect(() => {
    for (const [id, label] of Object.entries(selectedProductLabels)) {
      if (id && label) setCachedLabel(id, label);
    }
  }, [selectedProductLabels, setCachedLabel]);

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.id && category.name)
        .map((category) => [category.id!, category.name!] as [string, string])
        .sort((a, b) => a[1].localeCompare(b[1])),
    [categories]
  );

  useEffect(() => {
    if (selectedCategoryId || categoryOptions.length === 0) return;
    setSelectedCategoryId(categoryOptions[0][0]);
  }, [categoryOptions, selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId) {
      setSubcategoryTree([]);
      return;
    }

    let cancelled = false;
    void getTree(selectedCategoryId).then((tree) => {
      if (!cancelled) setSubcategoryTree(tree);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId, getTree]);

  const loadCategoryProducts = useCallback(async () => {
    if (!selectedCategoryId) {
      setCategoryProducts([]);
      return;
    }

    try {
      setProductsLoading(true);
      const first = await productService.getProductsByCategory(selectedCategoryId, {
        page: 1,
        pageSize: 100,
        idSubcategory:
          selectedSubcategoryId !== "all" ? selectedSubcategoryId : undefined,
      });

      let items = (first.products ?? []).map(mapListProductToItem);

      if (first.totalPages > 1) {
        for (let page = 2; page <= first.totalPages; page += 1) {
          const next = await productService.getProductsByCategory(selectedCategoryId, {
            page,
            pageSize: 100,
            idSubcategory:
              selectedSubcategoryId !== "all" ? selectedSubcategoryId : undefined,
          });
          items = [...items, ...(next.products ?? []).map(mapListProductToItem)];
        }
      }

      setCategoryProducts(items);
    } catch (error) {
      console.error("[ProductLinksPicker] Error loading products:", error);
      setCategoryProducts([]);
      toast({
        title: "Error al cargar productos",
        description: "No se pudieron cargar los productos de esta categoría.",
        variant: "destructive",
      });
    } finally {
      setProductsLoading(false);
    }
  }, [selectedCategoryId, selectedSubcategoryId, toast]);

  useEffect(() => {
    void loadCategoryProducts();
  }, [loadCategoryProducts]);

  // Etiquetas de productos ya vinculados (otras categorías o al editar)
  useEffect(() => {
    let cancelled = false;

    const resolveLabels = async () => {
      for (const id of productIds) {
        if (labelCacheRef.current[id] || selectedProductLabels[id]) continue;

        const fromCategory = categoryProducts.find((p) => p.id === id);
        if (fromCategory) {
          setCachedLabel(id, formatProductOption(fromCategory));
          continue;
        }

        const product = await productService.getProductById(id);
        if (cancelled || !product) continue;
        setCachedLabel(id, formatProductOption(mapListProductToItem(product)));
      }
    };

    void resolveLabels();

    return () => {
      cancelled = true;
    };
  }, [productIds, categoryProducts, selectedProductLabels, setCachedLabel]);

  const productOptions = useMemo(
    () => categoryProducts.filter((product) => !productIds.includes(product.id)),
    [categoryProducts, productIds]
  );

  const productOptionLabels = useMemo(
    () => productOptions.map((product) => formatProductOption(product)),
    [productOptions]
  );

  const productByLabel = useMemo(() => {
    const map = new Map<string, Item>();
    productOptions.forEach((product) => {
      map.set(formatProductOption(product), product);
    });
    return map;
  }, [productOptions]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId("all");
    setSelectedProductId("");
    setProductSearch("");
  };

  const addProductById = (id: string) => {
    if (!id || productIds.includes(id)) return;
    const product = categoryProducts.find((p) => p.id === id);
    if (product) {
      setCachedLabel(id, formatProductOption(product));
    }
    onChange([...productIds, id]);
    setSelectedProductId("");
    setProductSearch("");
  };

  const addProduct = () => {
    addProductById(selectedProductId);
  };

  const removeProduct = (id: string) => {
    onChange(productIds.filter((productId) => productId !== id));
  };

  const getChipLabel = (id: string) => {
    const fromList = categoryProducts.find((p) => p.id === id);
    if (fromList) return formatProductOption(fromList);
    if (labelCacheRef.current[id]) return normalizeProductLabel(labelCacheRef.current[id]);
    if (selectedProductLabels[id]) return normalizeProductLabel(selectedProductLabels[id]);
    return id;
  };

  const filterControls = (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="relative">
        <select
          className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm disabled:opacity-50"
          value={selectedCategoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          disabled={categoriesLoading || categoryOptions.length === 0}
        >
          {categoriesLoading ? (
            <option value="">Cargando categorías...</option>
          ) : categoryOptions.length === 0 ? (
            <option value="">Sin categorías</option>
          ) : (
            categoryOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      <SubcategoryTreePicker
        tree={subcategoryTree}
        value={selectedSubcategoryId}
        onChange={(subcategoryId) => {
          setSelectedSubcategoryId(subcategoryId);
          setSelectedProductId("");
        }}
        disabled={!selectedCategoryId}
        emptyLabel={
          !selectedCategoryId ? "Selecciona una categoría" : "Sin subcategorías"
        }
      />
    </div>
  );

  const selectedChips =
    productIds.length > 0 ? (
      <div className="flex flex-wrap gap-2 pt-1">
        {productIds.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs"
          >
            {getChipLabel(id)}
            <button type="button" onClick={() => removeProduct(id)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
    ) : (
      <p className="text-xs text-muted-foreground">{emptyMessage}</p>
    );

  const searchPlaceholder = !selectedCategoryId
    ? "Selecciona una categoría primero"
    : "Buscar producto por nombre o SKU...";

  return (
    <div className="space-y-3">
      {label ? <Label>{label}</Label> : null}
      {filterControls}

      {searchVariant === "combobox" ? (
        <SearchCombobox
          value={productSearch}
          onValueChange={setProductSearch}
          onSelect={(labelValue) => {
            const product = productByLabel.get(labelValue);
            if (product) addProductById(product.id);
          }}
          options={productOptionLabels}
          placeholder={searchPlaceholder}
          disabled={!selectedCategoryId}
          loading={productsLoading}
          emptyMessage={
            !selectedCategoryId
              ? "Elige una categoría para ver productos."
              : productsLoading
                ? "Cargando productos..."
                : "No hay productos que coincidan."
          }
        />
      ) : (
        <>
          <Input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU"
            disabled={!selectedCategoryId}
          />
          <div className="flex gap-2">
            <div className="relative w-full">
              <select
                className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={!selectedCategoryId || productsLoading}
              >
                <option value="">
                  {productsLoading ? "Cargando productos..." : "Selecciona un producto"}
                </option>
                {productOptions.map((product) => (
                  <option key={product.id} value={product.id}>
                    {formatProductOption(product)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <Button type="button" variant="outline" onClick={addProduct} disabled={!selectedProductId}>
              Agregar
            </Button>
          </div>
        </>
      )}

      {selectedChips}
    </div>
  );
};
