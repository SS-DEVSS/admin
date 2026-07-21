import { useEffect, useState } from "react";
import {
  MoreVertical,
  PlusCircle,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardTitle } from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Brand } from "@/models/brand";
import { useLocation } from "react-router-dom";
import { useBrandContext } from "@/context/brand-context";
import { Category } from "@/models/category";
import { Separator } from "../ui/separator";
import { cleanFilePath } from "@/services/S3FileManager";
import { Button } from "../ui/button";
import {
  getDisplayImageUrl,
  getImageClassName,
  IMAGE_PLACEHOLDER_BG,
  IMAGE_PLACEHOLDER_BG_CLASS,
  isMissingImageUrl,
  onImageErrorFallback,
} from "@/utils/imagePlaceholder";
import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import { useAxiosClient } from "@/hooks/useAxiosClient";
import { toast } from "@/hooks/use-toast";
import { useBrands } from "@/hooks/useBrands";
import { useCategoryContext } from "@/context/categories-context";

type CategoryDeletePreview = {
  productCount: number;
  subcategoryCount: number;
  attributeCount: number;
  canDelete: boolean;
};

type CardTemplateProps = {
  category?: Category;
  brand?: Brand;
  date?: Date;
  getItems?: () => void;
  getBrandById?: (id: Brand["id"]) => void;
};

const CardTemplate = ({
  brand,
  category,
  getBrandById,
  getItems,
}: CardTemplateProps) => {
  const { setSelectedBrand, openModal: openModalBrand } = useBrandContext();
  const { brands, deleteBrand } = useBrands();
  const { getCategories } = useCategoryContext();
  const client = useAxiosClient();
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();

  const [categoryDeleteOpen, setCategoryDeleteOpen] = useState(false);
  const [categoryDeletePreview, setCategoryDeletePreview] = useState<CategoryDeletePreview | null>(null);
  const [categoryDeleteLoading, setCategoryDeleteLoading] = useState(false);
  const [categoryDeleteError, setCategoryDeleteError] = useState<string | null>(null);
  const [brandDeleteOpen, setBrandDeleteOpen] = useState(false);
  const [brandDeleteLoading, setBrandDeleteLoading] = useState(false);
  const [duplicateLoading, setDuplicateLoading] = useState(false);

  const viewCategoriesFromBrand = (id: Brand["id"]) => {
    setSelectedBrand(id);
    navigate("/dashboard/categorias");
  };

  const navigateCreateCategory = (id: Brand["id"]) => {
    setSelectedBrand(id);
    navigate("/dashboard/categorias/nueva");
  };

  const handleEditBrand = () => {
    if (getBrandById) {
      getBrandById(brand?.id!);
      openModalBrand({
        title: "Editar Marca",
        description: "Edita la marca seleccionada.",
        action: "",
      });
    }
  };

  const handleCategoryDeleteClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!category?.id) return;
    try {
      const { data } = await client.get<CategoryDeletePreview>(
        `/categories/${category.id}/delete-preview`
      );
      if (!data.canDelete) {
        toast({
          title: "No se puede eliminar la categoría",
          description: `Tiene ${data.productCount} producto(s) asociado(s). Elimínalos primero desde Productos.`,
          variant: "destructive",
        });
        return;
      }
      setCategoryDeletePreview(data);
      setCategoryDeleteError(null);
      setCategoryDeleteOpen(true);
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Error al verificar la categoría";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleCategoryDeleteConfirm = async () => {
    if (!category?.id) return;
    setCategoryDeleteLoading(true);
    setCategoryDeleteError(null);
    try {
      await client.delete(`/categories/${category.id}`);
      toast({ title: "Categoría eliminada", variant: "success" });
      setCategoryDeleteOpen(false);
      await getCategories(true);
      getItems?.();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Error al eliminar categoría";
      setCategoryDeleteError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setCategoryDeleteLoading(false);
    }
  };

  const handleDuplicateCategory = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!category?.id) return;
    setDuplicateLoading(true);
    try {
      const { data } = await client.post(`/categories/${category.id}/duplicate`);
      toast({ title: "Categoría duplicada", variant: "success" });
      await getCategories(true);
      getItems?.();
      if (data?.id) {
        navigate(`/dashboard/categorias/editar/${data.id}`);
      }
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Error al duplicar categoría";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setDuplicateLoading(false);
    }
  };

  const handleBrandDeleteConfirm = async () => {
    if (!brand?.id) return;
    setBrandDeleteLoading(true);
    try {
      await deleteBrand(brand.id);
      setBrandDeleteOpen(false);
    } catch {
      /* toast handled in hook */
    } finally {
      setBrandDeleteLoading(false);
    }
  };

  const getImageUrl = () => {
    if (brand) {
      if (brand.logoImgUrl) {
        // Si ya es una URL completa, usarla directamente
        if (brand.logoImgUrl.startsWith('http://') || brand.logoImgUrl.startsWith('https://')) {
          return brand.logoImgUrl;
        }
        return `${import.meta.env.VITE_AWS_S3_BUCKET_PUBLIC_URL}${cleanFilePath(
          brand.logoImgUrl,
          76
        )}`;
      }
    } else if (category) {
      if (category.imgUrl) {
        // Si ya es una URL completa, usarla directamente
        if (category.imgUrl.startsWith('http://') || category.imgUrl.startsWith('https://')) {
          return category.imgUrl;
        }
        return `${import.meta.env.VITE_AWS_S3_BUCKET_PUBLIC_URL}${cleanFilePath(
          category.imgUrl,
          76
        )}`;
      }
    }
    return null;
  };

  const rawImageUrl = getImageUrl();
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [brand?.id, brand?.logoImgUrl, category?.id, category?.imgUrl]);

  const showPlaceholderStyle =
    isMissingImageUrl(rawImageUrl) || imageLoadFailed;

  const renderImage = () => {
    return (
      <div
        className={`h-[300px] w-full flex items-center justify-center rounded-t-lg overflow-hidden ${
          showPlaceholderStyle ? IMAGE_PLACEHOLDER_BG_CLASS : "bg-white"
        }`}
        style={
          showPlaceholderStyle
            ? { backgroundColor: IMAGE_PLACEHOLDER_BG }
            : undefined
        }
      >
        <img
          src={getDisplayImageUrl(rawImageUrl)}
          onError={(event) => {
            setImageLoadFailed(true);
            onImageErrorFallback(event);
          }}
          alt={`${brand ? brand?.name : category?.name} image`}
          className={getImageClassName(
            showPlaceholderStyle ? null : rawImageUrl,
            "max-h-full max-w-full object-contain"
          )}
        />
      </div>
    );
  };

  const isCategoryListCard = pathname === "/dashboard/categorias" && Boolean(category?.id);

  return (
    <>
      <Card
        className={cn(
          "w-full",
          isCategoryListCard && "cursor-pointer hover:shadow-md transition-shadow"
        )}
        onClick={
          isCategoryListCard
            ? () => navigate(`/dashboard/categorias/editar/${category!.id}`)
            : undefined
        }
        role={isCategoryListCard ? "link" : undefined}
        tabIndex={isCategoryListCard ? 0 : undefined}
        onKeyDown={
          isCategoryListCard
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/dashboard/categorias/editar/${category!.id}`);
                }
              }
            : undefined
        }
      >
        {renderImage()}
        <CardContent className="border-t">
          <div className="flex justify-between items-center pt-8">
            <CardTitle className="!text-xl capitalize">
              {(brand ? brand?.name : category?.name)?.toLowerCase()}
            </CardTitle>
            {pathname === "/dashboard/marcas" && brand && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md p-1 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Acciones"
                  >
                    <MoreVertical className="hover:cursor-pointer w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleEditBrand}>
                      Editar Marca
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={brands.length <= 1}
                      onClick={() => setBrandDeleteOpen(true)}
                    >
                      Eliminar Marca
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isCategoryListCard && category && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md p-1 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Acciones"
                  >
                    <MoreVertical className="hover:cursor-pointer w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-44" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      disabled={duplicateLoading}
                      onClick={(e) => void handleDuplicateCategory(e)}
                    >
                      Duplicar categoría
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => void handleCategoryDeleteClick(e)}
                    >
                      Eliminar categoría
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <CardDescription className="leading-7">
            {brand ? brand?.description : category?.description}
          </CardDescription>
        </CardContent>
        {category && category!.brands && (
          <section>
            <Separator />
            <CardContent className="mt-4">
              <p className="font-bold">Marcas Asociadas</p>
              <div className="rounded-md my-3 py-1 flex flex-wrap gap-2">
                {category!.brands.map((brand: any) => (
                  <Badge
                    className="text-sm font-medium px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md"
                    key={brand!.id}
                  >
                    <span className="capitalize">{brand!.name.toLowerCase()}</span>
                  </Badge>
                ))}
              </div>
              {category.products && category.products.length > 0 && (
                <p className="font-medium text-sm text-slate-400">
                  {category.products.length} productos asociados a la categoría.
                </p>
              )}
            </CardContent>
          </section>
        )}
        {brand?.categories?.length! > 0 && (
          <>
            <Separator />
            <CardContent className="mt-3">
              <p className="mb-4 text-md font-600">Categorías Asociadas</p>
              <section className="flex flex-wrap gap-2">
                {brand?.categories?.map((category: Category) => (
                  <Badge
                    key={category.id}
                    onClick={() => viewCategoriesFromBrand(brand.id)}
                    className="text-sm font-medium px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer flex items-center gap-1.5 group"
                  >
                    <span className="capitalize">{category.name.toLowerCase()}</span>
                  </Badge>
                ))}
              </section>
            </CardContent>
          </>
        )}
        {brand && (
          <CardContent>
            <Button
              variant="outline"
              onClick={() => navigateCreateCategory(brand.id)}
              className="rounded-full flex gap-2"
            >
              Agregar Categoría <PlusCircle />
            </Button>
          </CardContent>
        )}
      </Card>

      <ConfirmActionDialog
        open={categoryDeleteOpen}
        onOpenChange={setCategoryDeleteOpen}
        title="Eliminar categoría"
        description={`Se eliminará la categoría "${category?.name}".`}
        consequences={[
          `Se eliminarán ${categoryDeletePreview?.subcategoryCount ?? 0} subcategoría(s).`,
          `Se eliminarán ${categoryDeletePreview?.attributeCount ?? 0} atributo(s) del template.`,
          "Los productos no se eliminan (la categoría debe estar vacía).",
          "Esta acción no se puede deshacer.",
        ]}
        loading={categoryDeleteLoading}
        error={categoryDeleteError}
        onConfirm={handleCategoryDeleteConfirm}
      />

      <ConfirmActionDialog
        open={brandDeleteOpen}
        onOpenChange={setBrandDeleteOpen}
        title="Eliminar marca"
        description={`Se eliminará la marca "${brand?.name}".`}
        consequences={[
          "Los productos y categorías permanecerán en el sistema.",
          "Solo se quitará la vinculación con esta marca.",
          "Debe existir al menos una marca en el sistema.",
        ]}
        loading={brandDeleteLoading}
        onConfirm={handleBrandDeleteConfirm}
      />
    </>
  );
};

export default CardTemplate;
