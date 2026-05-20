import Layout from "@/components/Layouts/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  Import,
  PlusCircle,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useDeferredValue } from "react";
import { Category } from "@/models/category";
import { useCategories } from "@/hooks/useCategories";
import { useSubcategories } from "@/hooks/useSubcategories";
import type { SubcategoryTreeNode } from "@/models/subcategory";
import DataTable from "@/modules/products/ProductsTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogVisibilityFilter } from "@/models/catalogVisibility";

type DrillLevel =
  | { type: "category"; category: Category }
  | { type: "subcategory"; category: Category; node: SubcategoryTreeNode };

const matchSearch = (query: string, name: string) =>
  !query.trim() || name.toLowerCase().includes(query.trim().toLowerCase());

type SearchHit = { category: Category; subcategoryId: string | null; label: string };

function flattenSearchHits(
  categories: Category[],
  treeByCategory: Record<string, SubcategoryTreeNode[]>
): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const cat of categories) {
    if (!cat.id) continue;
    hits.push({ category: cat, subcategoryId: null, label: cat.name ?? "" });
    const tree = treeByCategory[cat.id] ?? [];
    const walk = (nodes: SubcategoryTreeNode[], path: string[]) => {
      for (const node of nodes) {
        const currentPath = [...path, node.name];
        const label = [cat.name, ...currentPath].join(" › ");
        hits.push({ category: cat, subcategoryId: node.id, label });
        if (node.children?.length) walk(node.children, currentPath);
      }
    };
    walk(tree, []);
  }
  return hits;
}

const Products = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { categories = [] } = useCategories();
  const { getTree } = useSubcategories();
  const [searchFilter, setSearchFilter] = useState(() => {
    const saved = localStorage.getItem('products-search-filter');
    return saved || "";
  });
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [subcategoryTreeByCategory, setSubcategoryTreeByCategory] = useState<
    Record<string, SubcategoryTreeNode[]>
  >({});

  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [filterMenuSearch, setFilterMenuSearch] = useState("");
  const filterMenuSearchDeferred = useDeferredValue(filterMenuSearch);
  const [drillStack, setDrillStack] = useState<DrillLevel[]>([]);
  const [catalogVisibilityFilter, setCatalogVisibilityFilter] =
    useState<CatalogVisibilityFilter>("all");

  const handleSearchFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchFilter(value);
    if (value) {
      localStorage.setItem('products-search-filter', value);
    } else {
      localStorage.removeItem('products-search-filter');
    }
  };

  const selectCategoryAndSubcategory = (cat: Category | null, subId: string | null) => {
    setCategory(cat);
    setSubcategoryId(subId);
    if (cat?.id) {
      localStorage.setItem("products-selected-category", cat.id);
    } else {
      localStorage.removeItem("products-selected-category");
    }
    setFilterMenuOpen(false);
  };

  const goBack = () => setDrillStack((prev) => prev.slice(0, -1));
  const drillIntoCategory = (cat: Category) => setDrillStack((prev) => [...prev, { type: "category", category: cat }]);
  const drillIntoSubcategory = (cat: Category, node: SubcategoryTreeNode) =>
    setDrillStack((prev) => [...prev, { type: "subcategory", category: cat, node }]);

  const handleFilterOpenChange = (open: boolean) => {
    setFilterMenuOpen(open);
    if (!open) {
      setDrillStack([]);
      setFilterMenuSearch("");
    }
  };

  const searchQuery = filterMenuSearchDeferred.trim().toLowerCase();
  const globalSearchHits =
    searchQuery.length > 0
      ? flattenSearchHits(categories, subcategoryTreeByCategory).filter((hit) =>
          hit.label.toLowerCase().includes(searchQuery)
        )
      : [];
  const showGlobalSearch = searchQuery.length > 0;

  // Precargar árbol de subcategorías por categoría para armar el menú jerárquico
  useEffect(() => {
    if (!categories.length) return;

    let isCancelled = false;

    const loadAllTrees = async () => {
      try {
        const entries = await Promise.all(
          categories
            .filter((cat): cat is Category & { id: string } => !!cat.id)
            .map(async (cat) => {
              const tree = await getTree(cat.id!);
              return [cat.id!, tree] as const;
            })
        );

        if (!isCancelled) {
          const map: Record<string, SubcategoryTreeNode[]> = {};
          for (const [catId, tree] of entries) {
            map[catId] = tree;
          }
          setSubcategoryTreeByCategory(map);
        }
      } catch {
        // Silenciar errores de carga de árbol en filtros
      }
    };

    loadAllTrees();

    return () => {
      isCancelled = true;
    };
  }, [categories, getTree]);

  useEffect(() => {
    if (categories.length === 0) return;
    const fromUrl = searchParams.get('categoryId');
    const subFromUrl = searchParams.get('subcategoryId');
    if (fromUrl) {
      const cat = categories.find((c) => c.id === fromUrl);
      if (cat) {
        setCategory(cat);
        setSubcategoryId(subFromUrl || null);
      }
      return;
    }

    const savedCategoryId = localStorage.getItem("products-selected-category");
    const savedCategory = savedCategoryId ? categories.find((cat) => cat.id === savedCategoryId) : null;
    if (savedCategory) {
      setCategory(savedCategory);
    } else {
      setCategory(categories[0]);
      localStorage.setItem('products-selected-category', categories[0].id || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const getSelectedFilterLabel = () => {
    if (!category) return "Todas las categorías";
    if (!subcategoryId) return category.name;

    const tree = category.id ? subcategoryTreeByCategory[category.id] : undefined;
    if (!tree) return category.name;

    const findPath = (nodes: SubcategoryTreeNode[], targetId: string, path: string[] = []): string[] | null => {
      for (const node of nodes) {
        const currentPath = [...path, node.name];
        if (node.id === targetId) return currentPath;
        if (node.children && node.children.length) {
          const found = findPath(node.children, targetId, currentPath);
          if (found) return found;
        }
      }
      return null;
    };

    const path = findPath(tree, subcategoryId);
    if (!path) return category.name;
    return `${category.name} › ${path.join(" › ")}`;
  };

  return (
    <Layout>
      <div className="w-full max-w-full">
        <Card className="border-0 shadow-none w-full">
          <CardHeader className="flex flex-row items-end p-0 m-0 pb-6 w-full">
            <div className="flex flex-col gap-3">
              <CardTitle>Productos</CardTitle>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative ml-0 flex-1 md:grow-0">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar Producto..."
                    value={searchFilter}
                    onChange={handleSearchFilter}
                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
                  />
                </div>
                <DropdownMenu open={filterMenuOpen} onOpenChange={handleFilterOpenChange} modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full lg:w-[320px] justify-between"
                    >
                      <span className="truncate text-left">
                        {getSelectedFilterLabel()}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[280px] p-0"
                    align="start"
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
                          placeholder="Buscar categoría o subcategoría..."
                          value={filterMenuSearch}
                          onChange={(e) => setFilterMenuSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          onKeyUp={(e) => e.stopPropagation()}
                          className="h-9 pl-8"
                        />
                      </div>
                    </div>
                    {drillStack.length > 0 && !showGlobalSearch && (
                      <div className="px-3 py-2 bg-primary/10 border-b border-primary/20">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estás en</p>
                        <p className="text-sm font-semibold truncate" title={drillStack.map((d) => d.type === "category" ? d.category.name : d.node.name).join(" › ")}>
                          {drillStack.map((d) => (d.type === "category" ? d.category.name : d.node.name)).join(" › ")}
                        </p>
                      </div>
                    )}
                    <div className="max-h-[300px] overflow-y-auto py-1">
                      {showGlobalSearch ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => selectCategoryAndSubcategory(null, null)}
                          >
                            Todas las categorías
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {globalSearchHits.length === 0 ? (
                            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                              No hay coincidencias
                            </div>
                          ) : (
                            globalSearchHits.map((hit) => (
                              <DropdownMenuItem
                                key={`${hit.category.id ?? ""}-${hit.subcategoryId ?? "all"}`}
                                onClick={() =>
                                  selectCategoryAndSubcategory(
                                    hit.category,
                                    hit.subcategoryId
                                  )
                                }
                              >
                                {hit.label}
                              </DropdownMenuItem>
                            ))
                          )}
                        </>
                      ) : (
                        <>
                          {drillStack.length > 0 && (
                            <>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                onClick={goBack}
                                className="text-muted-foreground"
                              >
                                ← Volver
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {drillStack.length === 0 && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  selectCategoryAndSubcategory(null, null)
                                }
                              >
                                Todas las categorías
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {categories
                                .filter((cat) =>
                                  matchSearch(filterMenuSearchDeferred, cat.name ?? "")
                                )
                                .map((cat) => {
                                  if (!cat.id) return null;
                                  const tree =
                                    subcategoryTreeByCategory[cat.id];
                                  const hasChildren =
                                    tree && tree.length > 0;
                                  return (
                                    <DropdownMenuItem
                                      key={cat.id}
                                      onSelect={(e) => {
                                        if (hasChildren) e.preventDefault();
                                      }}
                                      onClick={() =>
                                        hasChildren
                                          ? drillIntoCategory(cat)
                                          : selectCategoryAndSubcategory(
                                              cat,
                                              null
                                            )
                                      }
                                      className="flex items-center justify-between"
                                    >
                                      <span>{cat.name}</span>
                                      {hasChildren && (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </DropdownMenuItem>
                                  );
                                })}
                            </>
                          )}
                          {drillStack.length > 0 &&
                            (() => {
                              const top =
                                drillStack[drillStack.length - 1];
                              if (top.type === "category") {
                                const catId =
                                  top.category.id ?? "";
                                const nodes =
                                  subcategoryTreeByCategory[catId] ?? [];
                                return (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        selectCategoryAndSubcategory(
                                          top.category,
                                          null
                                        )
                                      }
                                    >
                                      Todas las subcategorías
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {nodes
                                      .filter((n: SubcategoryTreeNode) =>
                                        matchSearch(
                                          filterMenuSearchDeferred,
                                          n.name
                                        )
                                      )
                                      .map((node: SubcategoryTreeNode) => {
                                        const hasChildren =
                                          node.children &&
                                          node.children.length > 0;
                                        return (
                                          <DropdownMenuItem
                                            key={node.id}
                                            onSelect={(e) => {
                                              if (hasChildren)
                                                e.preventDefault();
                                            }}
                                            onClick={() =>
                                              hasChildren
                                                ? drillIntoSubcategory(
                                                    top.category,
                                                    node
                                                  )
                                                : selectCategoryAndSubcategory(
                                                    top.category,
                                                    node.id
                                                  )
                                            }
                                            className="flex items-center justify-between"
                                          >
                                            <span>{node.name}</span>
                                            {hasChildren && (
                                              <ChevronRight className="h-4 w-4" />
                                            )}
                                          </DropdownMenuItem>
                                        );
                                      })}
                                  </>
                                );
                              }
                              const nodes = top.node.children ?? [];
                              return (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      selectCategoryAndSubcategory(
                                        top.category,
                                        top.node.id
                                      )
                                    }
                                  >
                                    {top.node.name}
                                  </DropdownMenuItem>
                                  {nodes.length > 0 && (
                                    <DropdownMenuSeparator />
                                  )}
                                  {nodes
                                    .filter((n: SubcategoryTreeNode) =>
                                      matchSearch(
                                        filterMenuSearchDeferred,
                                        n.name
                                      )
                                    )
                                    .map((node: SubcategoryTreeNode) => {
                                      const hasChildren =
                                        node.children &&
                                        node.children.length > 0;
                                      return (
                                        <DropdownMenuItem
                                          key={node.id}
                                          onSelect={(e) => {
                                            if (hasChildren)
                                              e.preventDefault();
                                          }}
                                          onClick={() =>
                                            hasChildren
                                              ? drillIntoSubcategory(
                                                  top.category,
                                                  node
                                                )
                                              : selectCategoryAndSubcategory(
                                                  top.category,
                                                  node.id
                                                )
                                          }
                                          className="flex items-center justify-between"
                                        >
                                          <span>{node.name}</span>
                                          {hasChildren && (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                        </DropdownMenuItem>
                                      );
                                    })}
                                </>
                              );
                            })()}
                        </>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Select
                  value={catalogVisibilityFilter}
                  onValueChange={(value) =>
                    setCatalogVisibilityFilter(value as CatalogVisibilityFilter)
                  }
                >
                  <SelectTrigger className="w-full lg:w-[220px]">
                    <SelectValue placeholder="Visibilidad en catálogo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos (visibles y ocultos)</SelectItem>
                    <SelectItem value="visible">Visibles en catálogo</SelectItem>
                    <SelectItem value="hidden">Ocultos en catálogo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="rounded-lg flex bg-[#F4F4F5]">
                <div
                  onClick={() => navigate("/dashboard/importaciones")}
                  className="flex hover:cursor-pointer gap-3 items-center hover:bg-primary hover:text-white hover:[&>svg]:text-white rounded-lg m-1 px-3"
                >
                  <Import />
                  <Button
                    className="hover:bg-transparent hover:text-white"
                    variant={"ghost"}
                  >
                    Importar
                  </Button>
                </div>
              </div>
              <Link to="/dashboard/producto/new-product">
                <Button size="sm" className="h-10 px-6 gap-1">
                  <PlusCircle className="h-3.5 w-3.5 mr-2" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Agregar Producto
                  </span>
                </Button>
              </Link>
            </div>
          </CardHeader>
          <div>
            <DataTable
              category={category}
              searchFilter={searchFilter}
              subcategoryId={subcategoryId}
              catalogVisibilityFilter={catalogVisibilityFilter}
            />
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Products;
