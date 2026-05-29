import { Item } from "@/models/product";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useRef, useState } from "react";
import { useAxiosClient } from "@/hooks/useAxiosClient";

export const useProducts = () => {
  const client = useAxiosClient();
  const { toast } = useToast();

  const [products, setProducts] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const inflightRef = useRef<Promise<void> | null>(null);

  const getProducts = useCallback(async () => {
    if (inflightRef.current) {
      return inflightRef.current;
    }

    const request = (async () => {
      try {
        setLoading(true);
        const { data } = await client.get("/products", {
          params: { page: 1, pageSize: 100 },
          timeout: 120000,
        });
        setProducts(data.products ?? []);
      } catch (error: unknown) {
        console.error("[useProducts] Error fetching products:", error);
        const msg = error instanceof Error ? error.message : "";
        const isTimeout = /timeout|ECONNABORTED/i.test(msg);
        toast({
          title: isTimeout ? "Tiempo de espera agotado" : "Error al cargar productos",
          description: isTimeout
            ? "El servidor no respondió. Comprueba que el backend esté en ejecución (ej. puerto 4000) y VITE_API_BASE_URL."
            : "No se pudieron cargar los productos.",
          variant: "destructive",
        });
      } finally {
        inflightRef.current = null;
        setLoading(false);
      }
    })();

    inflightRef.current = request;
    return request;
  }, [client, toast]);

  const getProductById = useCallback(async (id: string) => {
    try {
      const { data } = await client.get(`/products/${id}`);
      return data;
    } catch (error) {
      console.error("[useProducts] Error fetching product by id:", error);
      return null;
    }
  }, [client]);

  const deleteProduct = async (id: Item["id"]) => {
    try {
      await client.delete(`/products/${id}`);
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  };

  const createProduct = async (productData: unknown) => {
    try {
      setLoading(true);

      const { data } = await client.post("/products", productData, {
        timeout: 120000,
      });

      return data;
    } catch (error: unknown) {
      console.error("Error creating product:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (id: string, productData: unknown) => {
    try {
      setLoading(true);
      const { data } = await client.patch(`/products/${id}`, productData);
      return data;
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    products,
    getProducts,
    getProductById,
    deleteProduct,
    createProduct,
    updateProduct,
  };
};
