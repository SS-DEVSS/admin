import { Item } from "@/models/product";
import { Reference } from "@/models/reference";
import axiosClient from "@/services/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

type PickerReference = {
  id: string;
  sku: string;
  referenceBrand: string | null;
  referenceNumber: string;
  type: string;
  productId: string;
};

type PickerProduct = {
  id: string;
  name: string;
  type: string;
  sku?: string | null;
  category?: { id: string; name: string };
  subcategory?: { id: string; name: string };
  references?: PickerReference[];
  applications?: Item["applications"];
};

const PICKER_PAGE_SIZE = 200;

const toPickerReference = (reference: PickerReference): Reference => ({
  id: reference.id,
  sku: reference.sku,
  referenceBrand: reference.referenceBrand,
  referenceNumber: reference.referenceNumber,
  typeOfPart: null,
  type: reference.type,
  description: null,
});

const toPickerItem = (product: PickerProduct): Item => ({
  id: product.id,
  name: product.name,
  type: product.type as Item["type"],
  description: "",
  category: product.category ?? { id: "", name: "" },
  subcategory: product.subcategory ?? null,
  idSubcategory: product.subcategory?.id ?? null,
  references: (product.references ?? []).map(toPickerReference),
  applications: product.applications ?? [],
  attributeValues: [],
  variants: product.sku
    ? [
        {
          id: "",
          idProduct: product.id,
          name: product.name,
          sku: product.sku,
          price: 0,
          stockQuantity: 0,
          technicalSheets: [],
          images: [],
          kitItems: [],
          attributeValues: [],
        },
      ]
    : [],
});

export const useProductsPicker = () => {
  const client = axiosClient();
  const { toast } = useToast();
  const [products, setProducts] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadProducts();
    // Carga única al montar; incluir loadProducts/client dispara refetch en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const firstPage = await client.get("/products/picker", {
        params: { page: 1, pageSize: PICKER_PAGE_SIZE },
      });

      const totalPages: number = firstPage.data.totalPages ?? 1;
      const firstProducts: PickerProduct[] = firstPage.data.products ?? [];
      let allProducts = [...firstProducts];

      if (totalPages > 1) {
        const otherPages = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            client.get("/products/picker", {
              params: { page: index + 2, pageSize: PICKER_PAGE_SIZE },
            })
          )
        );
        otherPages.forEach((response) => {
          allProducts = [...allProducts, ...(response.data.products ?? [])];
        });
      }

      setProducts(allProducts.map(toPickerItem));
    } catch (error: unknown) {
      console.error("[useProductsPicker] Error fetching products:", error);
      const msg = error instanceof Error ? error.message : "";
      const isTimeout = /timeout|ECONNABORTED/i.test(msg);
      toast({
        title: isTimeout ? "Tiempo de espera agotado" : "Error al cargar productos",
        description: isTimeout
          ? "El servidor no respondió. Intenta de nuevo en unos segundos."
          : "No se pudieron cargar los productos para el selector.",
        variant: "destructive",
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return { products, loading, reloadProducts: loadProducts };
};
