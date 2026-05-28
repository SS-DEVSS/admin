import { Item } from "@/models/product";
import axiosClient from "@/services/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useState } from "react";

export const useProducts = () => {
  const client = axiosClient();
  const { toast } = useToast();

  const [products, setProducts] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  const getProducts = useCallback(async () => {
    try {
      setLoading(true);
      const firstPage = await client.get(`/products?type=all&page=1&pageSize=100`);

      const { totalPages, products: firstPageProducts } = firstPage.data;
      let allProducts = [...firstPageProducts];

      if (totalPages > 1) {
        for (let page = 2; page <= totalPages; page++) {
          const pageData = await client.get(
            `/products?type=all&page=${page}&pageSize=100`
          );
          allProducts = [...allProducts, ...pageData.data.products];
        }
      }

      setProducts(allProducts);
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
      setLoading(false);
    }
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
      await getProducts();
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

      getProducts().catch((err) => {
        console.error("Error refreshing products list:", err);
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
      await getProducts();
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
