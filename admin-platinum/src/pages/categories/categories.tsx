import Layout from "@/components/Layouts/Layout";
import { Button } from "@/components/ui/button";
import DashboardPageShell from "@/components/Layouts/DashboardPageShell";
import { Input } from "@/components/ui/input";
import { AlertTriangle, PlusCircle, Search } from "lucide-react";
import CardSectionLayout from "@/components/Layouts/CardSectionLayout";
import CardTemplate from "@/components/Layouts/CardTemplate";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useLocation } from "react-router-dom";
import { Category } from "@/models/category";
import { useBrands } from "@/hooks/useBrands";
import { Brand } from "@/models/brand";
import { useEffect, useState } from "react";
import { useMemo } from "react";
import NoData from "@/components/NoData";
import { useBrandContext } from "@/context/brand-context";
import { useCategoryContext } from "@/context/categories-context";

const Categorias = () => {
  const { selectedBrand, setSelectedBrand } = useBrandContext();
  const { categories, loading, getCategories } = useCategoryContext();
  const { brands } = useBrands();
  const location = useLocation();

  const [searchFilter, setSearchFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState<Brand["id"]>("");

  // Recargar categorías cuando se vuelve a esta página
  useEffect(() => {
    void getCategories(true);
  }, [location.pathname, getCategories]);

  useEffect(() => {
    if (selectedBrand) {
      setBrandFilter(selectedBrand);
      setSelectedBrand(null);
    }
  }, []);

  const handleSearchFilter = (e: any) => {
    const { value } = e.target;
    setSearchFilter(value);
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((category: Category) => {
      const matchesSearch =
        !searchFilter ||
        category.name.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesBrand =
        !brandFilter ||
        brandFilter === "-" ||
        category.brands?.some((brand: any) => brand.id === brandFilter);

      return matchesSearch && matchesBrand;
    });
  }, [searchFilter, brandFilter, categories]);

  return (
    <Layout>
      <DashboardPageShell
        title="Categorías"
        description="Maneja tus categorías."
        filters={
          <>
            <div className="relative w-full lg:flex-1 lg:min-w-[140px] md:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar Categoría..."
                value={searchFilter}
                onChange={handleSearchFilter}
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
              />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="flex-1 min-w-[160px] md:w-[280px] lg:flex-none">
                  <SelectValue placeholder="Selecciona una marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Marcas</SelectLabel>
                    <SelectItem value={"-"}>Seleccionar</SelectItem>
                    {brands.map((brand: Brand) => (
                      <SelectItem key={brand.id} value={brand.id!}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Link to="/dashboard/categorias/nueva" className="shrink-0">
                <Button size="sm" className="h-10 px-6 gap-1">
                  <PlusCircle className="h-3.5 w-3.5 sm:mr-2" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Agregar Categoría
                  </span>
                </Button>
              </Link>
            </div>
          </>
        }
      >
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando...</p>
              </div>
            </div>
          ) : categories.length === 0 || filteredCategories.length === 0 ? (
            <div className="mt-4">
              <NoData>
                <AlertTriangle className="text-[#4E5154]" />
                <p className="text-[#4E5154]">
                  No se ha creado ninguna categoría
                </p>
                <p className="text-[#94A3B8] font-semibold text-sm">
                  Agrega uno en la parte posterior
                </p>
              </NoData>
            </div>
          ) : (
            <CardSectionLayout>
              {(filteredCategories.length > 0
                ? filteredCategories
                : categories
              ).map((categoria: Category) => (
                <CardTemplate
                  category={categoria}
                  key={categoria.id}
                  getItems={() => void getCategories(true)}
                />
              ))}
            </CardSectionLayout>
          )}
      </DashboardPageShell>
    </Layout>
  );
};

export default Categorias;
