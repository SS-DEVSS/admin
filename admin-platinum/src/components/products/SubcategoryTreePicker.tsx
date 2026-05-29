import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SubcategoryTreeNode } from "@/models/subcategory";

type SubcategoryTreePickerProps = {
  tree: SubcategoryTreeNode[];
  value: string;
  onChange: (subcategoryId: string) => void;
  disabled?: boolean;
  emptyLabel?: string;
};

const matchSearch = (query: string, text: string) =>
  !query.trim() || text.toLowerCase().includes(query.trim().toLowerCase());

const flattenSubcategoryHits = (
  nodes: SubcategoryTreeNode[],
  path: string[] = []
): { id: string; label: string }[] => {
  const hits: { id: string; label: string }[] = [];
  for (const node of nodes) {
    if (!node.id || !node.name) continue;
    const currentPath = [...path, node.name];
    hits.push({ id: node.id, label: currentPath.join(" › ") });
    if (node.children?.length) {
      hits.push(...flattenSubcategoryHits(node.children, currentPath));
    }
  }
  return hits;
};

const findSubcategoryPathLabels = (
  nodes: SubcategoryTreeNode[],
  targetId: string,
  path: string[] = []
): string[] | null => {
  for (const node of nodes) {
    if (!node.id || !node.name) continue;
    const currentPath = [...path, node.name];
    if (node.id === targetId) return currentPath;
    if (node.children?.length) {
      const found = findSubcategoryPathLabels(node.children, targetId, currentPath);
      if (found) return found;
    }
  }
  return null;
};

/** Ruta de nodos desde la raíz hasta el id (incluye el nodo seleccionado). */
const findNodePathInTree = (
  nodes: SubcategoryTreeNode[],
  targetId: string,
  path: SubcategoryTreeNode[] = []
): SubcategoryTreeNode[] | null => {
  for (const node of nodes) {
    if (!node.id) continue;
    const nextPath = [...path, node];
    if (node.id === targetId) return nextPath;
    if (node.children?.length) {
      const found = findNodePathInTree(node.children, targetId, nextPath);
      if (found) return found;
    }
  }
  return null;
};

/** Nivel del menú al reabrir: dentro del seleccionado si tiene hijos; si no, en su nivel hermano. */
const drillStackForSelection = (
  tree: SubcategoryTreeNode[],
  selectedId: string
): SubcategoryTreeNode[] => {
  if (selectedId === "all") return [];
  const path = findNodePathInTree(tree, selectedId);
  if (!path?.length) return [];
  const selectedNode = path[path.length - 1];
  const hasChildren = (selectedNode.children?.length ?? 0) > 0;
  return hasChildren ? path : path.slice(0, -1);
};

export default function SubcategoryTreePicker({
  tree,
  value,
  onChange,
  disabled = false,
  emptyLabel = "Sin subcategorías",
}: SubcategoryTreePickerProps) {
  const [open, setOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [drillStack, setDrillStack] = useState<SubcategoryTreeNode[]>([]);
  const menuSearchDeferred = useDeferredValue(menuSearch);

  const syncDrillStackFromValue = useCallback(
    (selectedId: string) => {
      setDrillStack(drillStackForSelection(tree, selectedId));
    },
    [tree]
  );

  useEffect(() => {
    syncDrillStackFromValue(value);
    setMenuSearch("");
  }, [tree, value, syncDrillStackFromValue]);

  const searchQuery = menuSearchDeferred.trim().toLowerCase();
  const searchHits = useMemo(
    () =>
      searchQuery
        ? flattenSubcategoryHits(tree).filter((hit) =>
            hit.label.toLowerCase().includes(searchQuery)
          )
        : [],
    [tree, searchQuery]
  );
  const showGlobalSearch = searchQuery.length > 0;

  const selectedLabel = useMemo(() => {
    if (value === "all") {
      return tree.length === 0 ? emptyLabel : "Todas las subcategorías";
    }
    const path = findSubcategoryPathLabels(tree, value);
    return path ? path.join(" › ") : "Subcategoría seleccionada";
  }, [value, tree, emptyLabel]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      syncDrillStackFromValue(value);
      setMenuSearch("");
    } else {
      setMenuSearch("");
    }
  };

  const selectSubcategory = (id: string) => {
    onChange(id);
    syncDrillStackFromValue(id);
    setOpen(false);
    setMenuSearch("");
  };

  const currentNodes =
    drillStack.length > 0
      ? drillStack[drillStack.length - 1].children ?? []
      : tree;

  const currentParent = drillStack.length > 0 ? drillStack[drillStack.length - 1] : null;

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-between px-3 font-normal"
          disabled={disabled}
        >
          <span className="truncate text-left text-sm">{selectedLabel}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-[240px] p-0"
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b p-2" onPointerDown={(e) => e.stopPropagation()}>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar subcategoría..."
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="h-9 pl-8"
            />
          </div>
        </div>

        {drillStack.length > 0 && !showGlobalSearch ? (
          <div className="border-b border-primary/20 bg-primary/10 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estás en
            </p>
            <p className="truncate text-sm font-semibold">
              {drillStack.map((node) => node.name).join(" › ")}
            </p>
          </div>
        ) : null}

        <div className="max-h-[280px] overflow-y-auto py-1">
          {showGlobalSearch ? (
            searchHits.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No hay coincidencias
              </div>
            ) : (
              searchHits.map((hit) => (
                <DropdownMenuItem key={hit.id} onClick={() => selectSubcategory(hit.id)}>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    {value === hit.id ? <Check className="h-4 w-4 shrink-0" /> : <span className="w-4" />}
                    <span className="truncate">{hit.label}</span>
                  </span>
                </DropdownMenuItem>
              ))
            )
          ) : (
            <>
              {drillStack.length > 0 ? (
                <>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    onClick={() => setDrillStack((prev) => prev.slice(0, -1))}
                    className="text-muted-foreground"
                  >
                    ← Volver un nivel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}

              {drillStack.length === 0 ? (
                <DropdownMenuItem onClick={() => selectSubcategory("all")}>
                  <span className="flex items-center gap-2">
                    {value === "all" ? <Check className="h-4 w-4" /> : <span className="w-4" />}
                    Todas las subcategorías
                  </span>
                </DropdownMenuItem>
              ) : currentParent ? (
                <DropdownMenuItem onClick={() => selectSubcategory(currentParent.id!)}>
                  <span className="flex items-center gap-2">
                    {value === currentParent.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="w-4" />
                    )}
                    {currentParent.name}
                  </span>
                </DropdownMenuItem>
              ) : null}

              {currentNodes.length > 0 ? <DropdownMenuSeparator /> : null}

              {currentNodes
                .filter((node) => matchSearch(menuSearchDeferred, node.name ?? ""))
                .map((node) => {
                  const hasChildren = (node.children?.length ?? 0) > 0;
                  const isSelected = value === node.id;
                  return (
                    <DropdownMenuItem
                      key={node.id}
                      onSelect={(e) => {
                        if (hasChildren) e.preventDefault();
                      }}
                      onClick={() =>
                        hasChildren
                          ? setDrillStack((prev) => [...prev, node])
                          : selectSubcategory(node.id!)
                      }
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {isSelected ? <Check className="h-4 w-4 shrink-0" /> : <span className="w-4 shrink-0" />}
                        <span className="truncate">{node.name}</span>
                      </span>
                      {hasChildren ? <ChevronRight className="h-4 w-4 shrink-0" /> : null}
                    </DropdownMenuItem>
                  );
                })}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
