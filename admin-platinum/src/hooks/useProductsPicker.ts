import { Item } from "@/models/product";
import { Reference } from "@/models/reference";
import axiosClient from "@/services/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useEffect, useRef, useState } from "react";

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

const PICKER_PAGE_SIZE = 100;
const PICKER_REQUEST_TIMEOUT_MS = 120000;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const loadIdRef = useRef(0);

  const fetchPickerPage = useCallback(
    (page: number) =>
      client.get("/products/picker", {
        params: { page, pageSize: PICKER_PAGE_SIZE },
        timeout: PICKER_REQUEST_TIMEOUT_MS,
      }),
    [client]
  );

  const loadProducts = useCallback(async () => {
    const loadId = ++loadIdRef.current;

    try {
      setLoading(true);
      setLoadingMore(false);
      setProducts([]);

      const firstPage = await fetchPickerPage(1);
      if (loadId !== loadIdRef.current) return;

      const totalPages: number = firstPage.data.totalPages ?? 1;
      const firstProducts: PickerProduct[] = firstPage.data.products ?? [];
      setProducts(firstProducts.map(toPickerItem));
      setLoading(false);

      if (totalPages <= 1) return;

      setLoadingMore(true);
      for (let page = 2; page <= totalPages; page += 1) {
        const response = await fetchPickerPage(page);
        if (loadId !== loadIdRef.current) return;

        const pageProducts: PickerProduct[] = response.data.products ?? [];
        setProducts((current) => [
          ...current,
          ...pageProducts.map(toPickerItem),
        ]);
      }
    } catch (error: unknown) {
      if (loadId !== loadIdRef.current) return;

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
      if (loadId === loadIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [fetchPickerPage, toast]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  return { products, loading, loadingMore, reloadProducts: loadProducts };
};
