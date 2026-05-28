import { useMemo, useState, useEffect, useCallback } from "react";
import { Item } from "@/models/product";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, X } from "lucide-react";
import SearchCombobox from "@/components/products/SearchCombobox";
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

const flattenSubcategoryOptions = (nodes: SubcategoryTreeNode[]): [string, string][] => {
  const result: [string, string][] = [];
  const walk = (items: SubcategoryTreeNode[]) => {
    for (const node of items) {
      const id = node.id?.trim();
      const name = node.name?.trim();
      if (id && name) result.push([id, name]);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(nodes);
  return result.sort((a, b) => a[1].localeCompare(b[1]));
};

const formatProductOption = (product: Item) => {
  const sku = getProductSku(product);
  return sku ? `${product.name} (${sku})` : product.name;
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
  const { categories, getCategories, loading: categoriesLoading } = useCategoryContext();
  const { getTree } = useSubcategories();

  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("all");
  const [subcategoryTree, setSubcategoryTree] = useState<SubcategoryTreeNode[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<Item[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    void getCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const timer = setTimeout(() => setDebouncedSearch(productSearch.trim()), 400);
    return () => clearTimeout(timer);
  }, [productSearch]);

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

  const subcategoryOptions = useMemo(
    () => flattenSubcategoryOptions(subcategoryTree),
    [subcategoryTree]
  );

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
        search: debouncedSearch || undefined,
        idSubcategory:
          selectedSubcategoryId !== "all" ? selectedSubcategoryId : undefined,
      });

      let items = (first.products ?? []).map(mapListProductToItem);

      if (first.totalPages > 1) {
        for (let page = 2; page <= first.totalPages; page += 1) {
          const next = await productService.getProductsByCategory(selectedCategoryId, {
            page,
            pageSize: 100,
            search: debouncedSearch || undefined,
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
  }, [selectedCategoryId, selectedSubcategoryId, debouncedSearch, toast]);

  useEffect(() => {
    void loadCategoryProducts();
  }, [loadCategoryProducts]);

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
    if (fromList) return fromList.name;
    if (selectedProductLabels[id]) return selectedProductLabels[id];
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
      <div className="relative">
        <select
          className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm disabled:opacity-50"
          value={selectedSubcategoryId}
          onChange={(e) => {
            setSelectedSubcategoryId(e.target.value);
            setSelectedProductId("");
          }}
          disabled={!selectedCategoryId || subcategoryOptions.length === 0}
        >
          <option value="all">
            {!selectedCategoryId
              ? "Selecciona una categoría"
              : subcategoryOptions.length === 0
                ? "Sin subcategorías"
                : "Todas las subcategorías"}
          </option>
          {subcategoryOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
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
    : productsLoading
      ? "Cargando productos..."
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
          disabled={!selectedCategoryId || productsLoading}
          emptyMessage={
            !selectedCategoryId
              ? "Elige una categoría para ver productos."
              : "No hay productos que coincidan."
          }
        />
      ) : (
        <>
          <Input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU"
            disabled={!selectedCategoryId || productsLoading}
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
