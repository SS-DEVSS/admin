import { useEffect, useMemo, useState, useDeferredValue } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Star, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useCategoryContext } from "@/context/categories-context";
import { useBrands } from "@/hooks/useBrands";
import { useSubcategories } from "@/hooks/useSubcategories";
import type { SubcategoryTreeNode } from "@/models/subcategory";
import { detailsType } from "@/hooks/useFormProduct";
import { Product } from "@/models/product";
import { Application } from "@/models/application";
import FeatureProductModal from "./FeatureProductModal";

type ProductSettingsSidebarProps = {
  state: detailsType;
  setState: React.Dispatch<React.SetStateAction<detailsType>>;
  product?: Product | null;
};

function flattenSubcategoryTree(
  nodes: SubcategoryTreeNode[],
  path: string[] = []
): { id: string; name: string; label: string }[] {
  const result: { id: string; name: string; label: string }[] = [];
  for (const node of nodes) {
    const currentPath = [...path, node.name];
    const label = currentPath.join(" › ");
    result.push({ id: node.id, name: node.name, label });
    if (node.children?.length) {
      result.push(...flattenSubcategoryTree(node.children, currentPath));
    }
  }
  return result;
}

const matchSearch = (query: string, name: string) =>
  !query.trim() || name.toLowerCase().includes(query.trim().toLowerCase());

const ProductSettingsSidebar = ({
  state,
  setState,
  product,
}: ProductSettingsSidebarProps) => {
  const { brands } = useBrands();
  const { categories } = useCategoryContext();
  const { getTree } = useSubcategories();
  const [subcategoryTree, setSubcategoryTree] = useState<SubcategoryTreeNode[]>([]);
  const [subcategoryMenuOpen, setSubcategoryMenuOpen] = useState(false);
  const [subcategoryMenuSearch, setSubcategoryMenuSearch] = useState("");
  const subcategoryMenuSearchDeferred = useDeferredValue(subcategoryMenuSearch);
  const [subcategoryDrillStack, setSubcategoryDrillStack] = useState<SubcategoryTreeNode[]>([]);
  const [featureModalOpen, setFeatureModalOpen] = useState(false);

  const subcategoriesFlat = useMemo(
    () => flattenSubcategoryTree(subcategoryTree),
    [subcategoryTree]
  );

  const categoryId =
    typeof state.category === "string" ? state.category : state.category?.id;

  useEffect(() => {
    if (state.category) {
      const id =
        typeof state.category === "string" ? state.category : state.category.id;
      const selectedCategory = categories.find((cat) => cat.id === id);

      if (selectedCategory?.brands && selectedCategory.brands.length > 0) {
        const categoryBrandId = selectedCategory.brands[0].id || "";
        setState((prevForm) => {
          if (prevForm.brand !== categoryBrandId) {
            return { ...prevForm, brand: categoryBrandId };
          }
          return prevForm;
        });
      }
    }
  }, [state.category, categories, setState]);

  useEffect(() => {
    if (!categoryId) {
      setSubcategoryTree([]);
      return;
    }
    getTree(categoryId).then((tree) => setSubcategoryTree(tree));
  }, [categoryId, getTree]);

  const handleCategoryChange = (value: string) => {
    const selectedCategory = categories.find((cat) => cat.id === value);
    const categoryBrandId =
      selectedCategory?.brands && selectedCategory.brands.length > 0
        ? selectedCategory.brands[0].id || ""
        : "";

    setState((prevForm) => ({
      ...prevForm,
      category: selectedCategory
        ? { id: selectedCategory.id, name: selectedCategory.name }
        : null,
      subcategory: null,
      brand: categoryBrandId,
    }));
  };

  const selectSubcategory = (id: string | null, label: string | null) => {
    setState((prevForm) => ({
      ...prevForm,
      subcategory: id && label ? { id, name: label } : null,
    }));
    setSubcategoryMenuOpen(false);
    setSubcategoryDrillStack([]);
    setSubcategoryMenuSearch("");
  };

  const subcategorySearchQuery = subcategoryMenuSearchDeferred.trim().toLowerCase();
  const subcategorySearchHits =
    subcategorySearchQuery.length > 0
      ? subcategoriesFlat.filter((s) =>
          s.label.toLowerCase().includes(subcategorySearchQuery)
        )
      : [];
  const showSubcategorySearch = subcategorySearchQuery.length > 0;

  const handleSubcategoryMenuOpenChange = (open: boolean) => {
    setSubcategoryMenuOpen(open);
    if (!open) {
      setSubcategoryDrillStack([]);
      setSubcategoryMenuSearch("");
    }
  };

  const goBackSubcategory = () =>
    setSubcategoryDrillStack((prev) => prev.slice(0, -1));
  const drillIntoSubcategory = (node: SubcategoryTreeNode) =>
    setSubcategoryDrillStack((prev) => [...prev, node]);

  return (
    <>
      <div className="flex w-full min-w-0 flex-col gap-5">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="visibleInCatalog-sidebar"
                checked={state.visibleInCatalog}
                onCheckedChange={(checked) =>
                  setState((prev) => ({
                    ...prev,
                    visibleInCatalog: checked === true,
                  }))
                }
              />
              <Label htmlFor="visibleInCatalog-sidebar" className="cursor-pointer text-sm">
                Visible en catálogo
              </Label>
            </div>

            {product && (
              <div className="space-y-2 border-t pt-4">
                <Button
                  type="button"
                  variant={product.isFeatured ? "default" : "outline"}
                  onClick={() => setFeatureModalOpen(true)}
                  className="w-full"
                >
                  <Star
                    className={`h-4 w-4 mr-2 ${product.isFeatured ? "fill-yellow-400 text-yellow-400" : ""}`}
                  />
                  {product.isFeatured ? "Editar destacado" : "Destacar producto"}
                </Button>
                {product.isFeatured && (
                  <p className="text-xs text-muted-foreground">
                    Visible en la página principal.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Organización</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-sidebar">
              Categoría<span className="text-red-500">*</span>
            </Label>
            <Select
              onValueChange={handleCategoryChange}
              value={
                typeof state.category === "string"
                  ? state.category || ""
                  : state.category?.id || ""
              }
            >
              <SelectTrigger id="category-sidebar" className="w-full">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Categorías</SelectLabel>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id || ""}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {categoryId && (
            <div className="space-y-2">
              <Label htmlFor="subcategory-sidebar">Subcategoría (opcional)</Label>
              <DropdownMenu
                open={subcategoryMenuOpen}
                onOpenChange={handleSubcategoryMenuOpenChange}
                modal={false}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    id="subcategory-sidebar"
                    variant="outline"
                    className="w-full min-h-10 justify-between font-normal text-left"
                  >
                    <span className="truncate">
                      {state.subcategory?.id
                        ? state.subcategory.name ||
                          subcategoriesFlat.find((s) => s.id === state.subcategory!.id)
                            ?.label ||
                          "Selecciona una subcategoría"
                        : "Selecciona una subcategoría"}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px] p-0"
                  align="start"
                  side="bottom"
                  avoidCollisions={false}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                  modal={false}
                >
                  <div
                    className="p-2 border-b"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Buscar subcategoría..."
                        value={subcategoryMenuSearch}
                        onChange={(e) => setSubcategoryMenuSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        onKeyUp={(e) => e.stopPropagation()}
                        className="h-9 pl-8"
                      />
                    </div>
                  </div>
                  <div className="max-h-[240px] overflow-y-auto py-1">
                    {showSubcategorySearch ? (
                      <>
                        <DropdownMenuItem onClick={() => selectSubcategory(null, null)}>
                          Ninguna
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {subcategorySearchHits.length === 0 ? (
                          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                            No hay coincidencias
                          </div>
                        ) : (
                          subcategorySearchHits.map((sub) => (
                            <DropdownMenuItem
                              key={sub.id}
                              onClick={() => selectSubcategory(sub.id, sub.label)}
                              className="whitespace-normal py-2"
                            >
                              {sub.label}
                            </DropdownMenuItem>
                          ))
                        )}
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => selectSubcategory(null, null)}>
                          Ninguna
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {subcategoryDrillStack.length > 0 && (
                          <>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              onClick={goBackSubcategory}
                              className="text-muted-foreground"
                            >
                              ← Volver
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {(subcategoryDrillStack.length === 0
                          ? subcategoryTree
                          : subcategoryDrillStack[subcategoryDrillStack.length - 1]
                              ?.children ?? []
                        )
                          .filter((n: SubcategoryTreeNode) =>
                            matchSearch(subcategoryMenuSearchDeferred, n.name)
                          )
                          .map((node: SubcategoryTreeNode) => {
                            const hasChildren =
                              node.children && node.children.length > 0;
                            return (
                              <DropdownMenuItem
                                key={node.id}
                                onSelect={(e) => {
                                  if (hasChildren) e.preventDefault();
                                }}
                                onClick={() =>
                                  hasChildren
                                    ? drillIntoSubcategory(node)
                                    : selectSubcategory(
                                        node.id,
                                        subcategoriesFlat.find((s) => s.id === node.id)
                                          ?.label ?? node.name
                                      )
                                }
                                className="flex items-center justify-between py-2"
                              >
                                <span className="whitespace-normal">{node.name}</span>
                                {hasChildren && (
                                  <ChevronRight className="h-4 w-4 shrink-0" />
                                )}
                              </DropdownMenuItem>
                            );
                          })}
                      </>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="brand-sidebar">Marca</Label>
            <Select value={state.brand || "none"} disabled>
              <SelectTrigger
                id="brand-sidebar"
                className="w-full bg-muted cursor-not-allowed"
              >
                <SelectValue placeholder="Sin marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Marcas</SelectLabel>
                  <SelectItem value="none">Sin marca</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id || ""}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Se asigna automáticamente desde la categoría
            </p>
          </div>
          </CardContent>
        </Card>
      </div>

      <FeatureProductModal
        open={featureModalOpen}
        onOpenChange={setFeatureModalOpen}
        product={product || null}
        applications={(product?.applications ?? []) as Application[]}
        isCurrentlyFeatured={product?.isFeatured || false}
        currentFeaturedApplicationId={product?.featuredApplicationId || null}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </>
  );
};

export default ProductSettingsSidebar;
