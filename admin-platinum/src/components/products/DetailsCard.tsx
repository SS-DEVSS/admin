import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCategoryContext } from "@/context/categories-context";
import { useBrands } from "@/hooks/useBrands";
import { useSubcategories } from "@/hooks/useSubcategories";
import type { SubcategoryTreeNode } from "@/models/subcategory";
import { detailsType } from "@/hooks/useFormProduct";
import { Product } from "@/models/product";
import MyDropzone from "@/components/Dropzone";
import { useS3FileManager } from "@/hooks/useS3FileManager";
import { useState, useEffect, useMemo, useDeferredValue } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import axiosClient from "@/services/axiosInstance";
import FeatureProductModal from "./FeatureProductModal";
import { Star, FolderOpen, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import FilePickerModal from "@/components/files/FilePickerModal";

type DetailsCardProps = {
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

const DetailsCard = ({ state, setState, product }: DetailsCardProps) => {
  const { brands } = useBrands();
  const { categories } = useCategoryContext();
  const { getTree } = useSubcategories();
  const [subcategoryTree, setSubcategoryTree] = useState<SubcategoryTreeNode[]>([]);
  const subcategoriesFlat = useMemo(
    () => flattenSubcategoryTree(subcategoryTree),
    [subcategoryTree]
  );
  const [subcategoryMenuOpen, setSubcategoryMenuOpen] = useState(false);
  const [subcategoryMenuSearch, setSubcategoryMenuSearch] = useState("");
  const subcategoryMenuSearchDeferred = useDeferredValue(subcategoryMenuSearch);
  const [subcategoryDrillStack, setSubcategoryDrillStack] = useState<SubcategoryTreeNode[]>([]);
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const { uploadFile, uploading } = useS3FileManager();
  const { toast } = useToast();
  const client = axiosClient();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>(state.imgUrl || "");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");
  const [filePickerOpen, setFilePickerOpen] = useState(false);

  useEffect(() => {
    if (state.imgUrl && !imageFile) setImageUrl(state.imgUrl);
  }, [state.imgUrl, imageFile]);

  useEffect(() => {
    if (product && state.imgUrl) {
      setImageFile((currentFile) => {
        if (currentFile && !(currentFile instanceof File && currentFile.name)) return null;
        return currentFile;
      });
    }
  }, [product, state.imgUrl, imageUrl, imageFile]);

  useEffect(() => {
    if (state.category) {
      const categoryId = typeof state.category === 'string' ? state.category : state.category.id;
      const selectedCategory = categories.find((cat) => cat.id === categoryId);

      if (selectedCategory?.brands && selectedCategory.brands.length > 0) {
        const categoryBrandId = selectedCategory.brands[0].id || "";
        // Only update if brand is not already set or is different
        setState((prevForm) => {
          if (prevForm.brand !== categoryBrandId) {
            return {
              ...prevForm,
              brand: categoryBrandId,
            };
          }
          return prevForm;
        });
      }
    }
  }, [state.category, categories, setState, state.brand]);

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setState((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const categoryId = typeof state.category === "string" ? state.category : state.category?.id;

  useEffect(() => {
    if (!categoryId) {
      setSubcategoryTree([]);
      return;
    }
    getTree(categoryId).then((tree) => setSubcategoryTree(tree));
  }, [categoryId, getTree]);

  const handleCategoryChange = (value: string) => {
    const selectedCategory = categories.find((cat) => cat.id === value);
    const categoryBrandId = selectedCategory?.brands && selectedCategory.brands.length > 0
      ? selectedCategory.brands[0].id || ""
      : "";

    setState((prevForm) => ({
      ...prevForm,
      category: selectedCategory ? { id: selectedCategory.id, name: selectedCategory.name } : null,
      subcategory: null,
      brand: categoryBrandId,
    }));
  };

  const selectSubcategory = (id: string | null, label: string | null) => {
    setState((prevForm) => ({
      ...prevForm,
      subcategory:
        id && label ? { id, name: label } : null,
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

  // Upload image immediately when selected (same behavior for create and edit)
  useEffect(() => {
    if (imageFile && imageFile.name) {
      uploadFile(imageFile, (_key: string, location: string) => {
        setImageUrl(location);
        // Store the full URL (location) instead of just the key
        // The backend can handle both URL and path
        setState((prevForm) => ({
          ...prevForm,
          imgUrl: location, // Use location (full URL) instead of key
        }));
      });
    } else if (!imageFile && !state.imgUrl) {
      // Only clear imageUrl if there's no existing image (not editing)
      // When editing, we want to keep the existing imageUrl
      setImageUrl("");
    }
  }, [imageFile, uploadFile, setState, state.imgUrl]);

  const handlePreviewImage = (url: string) => {
    setPreviewImageUrl(url);
    setPreviewDialogOpen(true);
  };

  const handleDeleteImage = async () => {
    if (!state.id) {
      toast({
        title: "Error",
        variant: "destructive",
        description: "No se puede eliminar la imagen sin un ID de producto",
      });
      return;
    }

    try {
      await client.delete(`/products/${state.id}/images`);

      // Limpiar la imagen del estado
      setImageUrl("");
      setState((prevForm) => ({
        ...prevForm,
        imgUrl: "",
      }));

      toast({
        title: "Imagen eliminada correctamente",
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Error al eliminar imagen",
        variant: "destructive",
        description: error.response?.data?.error || error.message || "Error desconocido",
      });
    }
  };

  const handleFileSelect = (fileUrl: string) => {
    setImageFile(null);
    setImageUrl(fileUrl);
    setState((prevForm) => ({
      ...prevForm,
      imgUrl: fileUrl,
    }));
  };

  return (
    <Card className="w-full flex flex-col mt-5">
      <CardHeader>
        <CardTitle>Detalles</CardTitle>
        <CardDescription>
          Ingrese los detalles
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="sku">
              SKU<span className="text-redLabel">*</span>
            </Label>
            <Input
              id="sku"
              name="sku"
              type="text"
              className="w-full"
              placeholder="SKU"
              onChange={handleFormChange}
              value={state.sku}
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="description">
              Descripción<span className="text-redLabel">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              className="w-full"
              placeholder="Descripción del producto"
              value={state.description}
              onChange={handleFormChange}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="visibleInCatalog"
              checked={state.visibleInCatalog}
              onCheckedChange={(checked) =>
                setState((prev) => ({
                  ...prev,
                  visibleInCatalog: checked === true,
                }))
              }
            />
            <Label htmlFor="visibleInCatalog" className="cursor-pointer">
              Visible en catálogo
            </Label>
          </div>
          <section className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-3 min-w-[200px] flex-1">
              <Label htmlFor="brand">Marca</Label>
              <Select value={state.brand || "none"} disabled>
                <SelectTrigger className="w-full bg-muted cursor-not-allowed">
                  <SelectValue placeholder="Selecciona una marca (opcional)" />
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
                La marca se asigna automáticamente desde la categoría seleccionada
              </p>
            </div>
            <div className="flex flex-col gap-3 min-w-[200px] flex-1">
              <Label htmlFor="category">
                Categoría<span className="text-redLabel">*</span>
              </Label>
              <Select
                onValueChange={handleCategoryChange}
                value={
                  typeof state.category === "string"
                    ? state.category || ""
                    : (state.category?.id || "")
                }
              >
                <SelectTrigger className="w-full">
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
          </section>
          {categoryId && (
            <div className="flex flex-col gap-3 w-full max-w-full">
              <Label htmlFor="subcategory">Subcategoría (opcional)</Label>
              <DropdownMenu
                open={subcategoryMenuOpen}
                onOpenChange={handleSubcategoryMenuOpenChange}
                modal={false}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full min-h-10 justify-between font-normal text-left"
                  >
                    <span className="truncate">
                      {state.subcategory?.id
                        ? (state.subcategory.name ||
                            subcategoriesFlat.find(
                              (s) => s.id === state.subcategory!.id
                            )?.label ||
                            "Selecciona una subcategoría")
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
                        onChange={(e) =>
                          setSubcategoryMenuSearch(e.target.value)
                        }
                        onKeyDown={(e) => e.stopPropagation()}
                        onKeyUp={(e) => e.stopPropagation()}
                        className="h-9 pl-8"
                      />
                    </div>
                  </div>
                  {subcategoryDrillStack.length > 0 && !showSubcategorySearch && (
                    <div className="px-3 py-2 bg-primary/10 border-b border-primary/20">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estás en</p>
                      <p className="text-sm font-semibold truncate" title={[state.category?.name ?? "", ...subcategoryDrillStack.map((n) => n.name)].filter(Boolean).join(" › ")}>
                        {[state.category?.name ?? "", ...subcategoryDrillStack.map((n) => n.name)].filter(Boolean).join(" › ")}
                      </p>
                    </div>
                  )}
                  <div className="max-h-[280px] overflow-y-auto py-1">
                    {showSubcategorySearch ? (
                      <>
                        <DropdownMenuItem
                          onClick={() => selectSubcategory(null, null)}
                        >
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
                              onClick={() =>
                                selectSubcategory(sub.id, sub.label)
                              }
                              className="whitespace-normal py-2"
                            >
                              {sub.label}
                            </DropdownMenuItem>
                          ))
                        )}
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem
                          onClick={() => selectSubcategory(null, null)}
                        >
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
                        {(() => {
                          const nodes =
                            subcategoryDrillStack.length === 0
                              ? subcategoryTree
                              : subcategoryDrillStack[
                                  subcategoryDrillStack.length - 1
                                ]?.children ?? [];
                          const parentNode =
                            subcategoryDrillStack.length > 0
                              ? subcategoryDrillStack[
                                  subcategoryDrillStack.length - 1
                                ]
                              : null;
                          if (parentNode) {
                            const parentLabel = subcategoriesFlat.find(
                              (s) => s.id === parentNode.id
                            )?.label ?? parentNode.name;
                            return (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    selectSubcategory(
                                      parentNode.id,
                                      parentLabel
                                    )
                                  }
                                >
                                  {parentNode.name}
                                </DropdownMenuItem>
                                {nodes.length > 0 && (
                                  <DropdownMenuSeparator />
                                )}
                                {nodes
                                  .filter((n: SubcategoryTreeNode) =>
                                    matchSearch(subcategoryMenuSearchDeferred, n.name)
                                  )
                                  .map((node: SubcategoryTreeNode) => {
                                    const hasChildren =
                                      node.children &&
                                      node.children.length > 0;
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
                                                subcategoriesFlat.find(
                                                  (s) => s.id === node.id
                                                )?.label ?? node.name
                                              )
                                        }
                                        className="flex items-center justify-between py-2"
                                      >
                                        <span className="whitespace-normal">
                                          {node.name}
                                        </span>
                                        {hasChildren && (
                                          <ChevronRight className="h-4 w-4 shrink-0" />
                                        )}
                                      </DropdownMenuItem>
                                    );
                                  })}
                              </>
                            );
                          }
                          return nodes
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
                                          subcategoriesFlat.find(
                                            (s) => s.id === node.id
                                          )?.label ?? node.name
                                        )
                                  }
                                  className="flex items-center justify-between py-2"
                                >
                                  <span className="whitespace-normal">
                                    {node.name}
                                  </span>
                                  {hasChildren && (
                                    <ChevronRight className="h-4 w-4 shrink-0" />
                                  )}
                                </DropdownMenuItem>
                              );
                            });
                        })()}
                      </>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-xs text-muted-foreground">
                Puedes elegir una subcategoría de cualquier nivel o buscar por nombre. Cada opción muestra su jerarquía (ej. Raíz › Nivel 2 › Nivel 3).
              </p>
            </div>
          )}
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="image">
                Imagen<span className="text-redLabel">*</span>
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilePickerOpen(true)}
                type="button"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Buscar en archivos
              </Button>
            </div>
            <div className="relative">
              <MyDropzone
                file={imageFile || undefined}
                fileSetter={setImageFile}
                type="image"
                className="p-8 min-h-[200px]"
                currentImageUrl={(() => {
                  const url = imageUrl && !imageFile ? imageUrl : undefined;
                  return url;
                })()}
                onImageClick={() => {
                  if (imageUrl && !imageFile) {
                    handlePreviewImage(imageUrl);
                  }
                }}
              />
              {imageUrl && !imageFile && (
                <div className="mt-3 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviewImage(imageUrl)}
                    type="button"
                  >
                    Previsualizar
                  </Button>
                  {state.id && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteImage}
                      disabled={uploading}
                      type="button"
                    >
                      Eliminar Imagen
                    </Button>
                  )}
                </div>
              )}
            </div>
            {uploading && (
              <p className="text-sm text-muted-foreground mt-2">Subiendo imagen...</p>
            )}
          </div>
          {product && (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant={product.isFeatured ? "default" : "outline"}
                onClick={() => setFeatureModalOpen(true)}
                className="w-full"
              >
                <Star className={`h-4 w-4 mr-2 ${product.isFeatured ? "fill-yellow-400 text-yellow-400" : ""}`} />
                {product.isFeatured ? "Editar Producto Destacado" : "Destacar Producto"}
              </Button>
              {product.isFeatured && (
                <p className="text-xs text-muted-foreground">
                  Este producto está destacado y se muestra en la página principal.
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <FeatureProductModal
        open={featureModalOpen}
        onOpenChange={setFeatureModalOpen}
        product={product || null}
        applications={(product as any)?.applications || []}
        isCurrentlyFeatured={product?.isFeatured || false}
        currentFeaturedApplicationId={product?.featuredApplicationId || null}
        onSuccess={() => {
          window.location.reload();
        }}
      />
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Vista Previa de Imagen</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex justify-center">
            {previewImageUrl && (
              <img
                src={previewImageUrl}
                alt="Vista previa"
                className="max-w-full max-h-[500px] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <FilePickerModal
        open={filePickerOpen}
        onOpenChange={setFilePickerOpen}
        onSelectFile={handleFileSelect}
        filterType="image"
      />
    </Card>
  );
};

export default DetailsCard;
