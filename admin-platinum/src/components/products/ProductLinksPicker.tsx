import { useMemo, useState } from "react";
import { Item } from "@/models/product";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, X } from "lucide-react";
import SearchCombobox from "@/components/products/SearchCombobox";

type ProductLinksPickerProps = {
  products: Item[];
  productsLoading: boolean;
  productIds: string[];
  onChange: (productIds: string[]) => void;
  label?: string;
  emptyMessage?: string;
  searchVariant?: "default" | "combobox";
};

const getProductSku = (product: Item) => product.variants?.[0]?.sku?.trim() || "";

const formatProductOption = (product: Item) => {
  const sku = getProductSku(product);
  return sku ? `${product.name} (${sku})` : product.name;
};

export default function ProductLinksPicker({
  products,
  productsLoading,
  productIds,
  onChange,
  label = "Productos vinculados",
  emptyMessage = "Sin productos vinculados.",
  searchVariant = "combobox",
}: ProductLinksPickerProps) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("all");

  const selectedProducts = useMemo(
    () => products.filter((product) => productIds.includes(product.id)),
    [products, productIds]
  );

  const categoryOptions = useMemo(() => {
    const categories = new Map<string, string>();
    products.forEach((product) => {
      const id = product.category?.id?.trim();
      const name = product.category?.name?.trim();
      if (id && name) categories.set(id, name);
    });
    return Array.from(categories.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const subcategoryOptions = useMemo(() => {
    if (selectedCategoryId === "all") return [];
    const subcategories = new Map<string, string>();
    products.forEach((product) => {
      if (product.category?.id !== selectedCategoryId) return;
      const id = product.subcategory?.id?.trim();
      const name = product.subcategory?.name?.trim();
      if (id && name) subcategories.set(id, name);
    });
    return Array.from(subcategories.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [products, selectedCategoryId]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (productIds.includes(product.id)) return false;
      if (selectedCategoryId !== "all" && product.category?.id !== selectedCategoryId) {
        return false;
      }
      if (
        selectedSubcategoryId !== "all" &&
        product.subcategory?.id !== selectedSubcategoryId
      ) {
        return false;
      }
      return true;
    });
  }, [products, selectedCategoryId, selectedSubcategoryId, productIds]);

  const productOptions = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return filteredProducts.filter((product) => {
      if (!query) return true;
      const searchableText = [
        product.name || "",
        ...(product.variants || []).map((variant) => variant.sku || ""),
      ]
        .join(" ")
        .toLowerCase();
      return searchableText.includes(query);
    });
  }, [filteredProducts, productSearch]);

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

  const filterControls = (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="relative">
        <select
          className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm"
          value={selectedCategoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          <option value="all">Todas las categorias</option>
          {categoryOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
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
          disabled={selectedCategoryId === "all" || subcategoryOptions.length === 0}
        >
          <option value="all">
            {selectedCategoryId === "all"
              ? "Selecciona una categoria"
              : subcategoryOptions.length === 0
                ? "Sin subcategorias"
                : "Todas las subcategorias"}
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
    selectedProducts.length > 0 ? (
      <div className="flex flex-wrap gap-2 pt-1">
        {selectedProducts.map((product) => (
          <span
            key={product.id}
            className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs"
          >
            {product.name}
            <button type="button" onClick={() => removeProduct(product.id)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
    ) : (
      <p className="text-xs text-muted-foreground">{emptyMessage}</p>
    );

  return (
    <div className="space-y-3">
      {label ? <Label>{label}</Label> : null}
      {filterControls}

      {searchVariant === "combobox" ? (
        <SearchCombobox
          value={productSearch}
          onValueChange={setProductSearch}
          onSelect={(label) => {
            const product = productByLabel.get(label);
            if (product) addProductById(product.id);
          }}
          options={productOptionLabels}
          placeholder={
            productsLoading ? "Cargando productos..." : "Buscar producto por nombre o SKU..."
          }
          disabled={productsLoading}
          emptyMessage="No hay productos que coincidan."
        />
      ) : (
        <>
          <Input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU"
          />
          <div className="flex gap-2">
            <div className="relative w-full">
              <select
                className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={productsLoading}
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
}
