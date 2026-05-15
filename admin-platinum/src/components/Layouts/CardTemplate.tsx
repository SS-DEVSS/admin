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
}: CardTemplateProps) => {
  const { setSelectedBrand, openModal: openModalBrand } = useBrandContext();
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();

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

  const renderImage = () => {
    const imageUrl = getImageUrl();

    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
          alt={`${brand ? brand?.name : category?.name} image`}
          className="h-[300px] w-full object-cover rounded-t-lg bg-[#D9D9D9] mx-auto"
        />
      );
    }

    // Fallback SVG placeholder
    return (
      <div className="h-[300px] w-full flex items-center justify-center bg-gray-200 rounded-t-lg mx-auto">
        <svg
          className="w-20 h-20 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
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
        <div className="hidden h-[300px] w-full flex items-center justify-center bg-gray-200 rounded-t-lg mx-auto">
          <svg
            className="w-20 h-20 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
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
    </>
  );
};

export default CardTemplate;
