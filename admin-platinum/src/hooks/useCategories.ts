import { Category } from "@/models/category";
import axiosClient from "@/services/axiosInstance";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "./use-toast";
import { useAuthContext } from "@/context/auth-context";

interface CategoryRespone {
  id: string;
  message: string;
}

export const useCategories = () => {
  const client = axiosClient();
  const { toast } = useToast();
  const { authState } = useAuthContext();

  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState({});
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState("");

  const getCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await client.get("/categories");
      setCategories(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (authState.isAuthenticated && !authState.loading) {
      void getCategories();
    } else if (!authState.loading) {
      setCategories([]);
      setLoading(false);
    }
  }, [authState.isAuthenticated, authState.loading, getCategories]);

  const getCategoryById = async (id: CategoryRespone["id"]) => {
    try {
      setLoading(true);
      const { data } = await client.get(
        `/categories/${id}?attributes=true&products=true`
      );
      setCategory(data);
      return data;
    } catch (error) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: Category["id"]) => {
    try {
      setLoading(true);
      const response = await client.delete(`/categories/${id}`);
      toast({
        title: "Categoría eliminada correctamente.",
        variant: "success",
        description: response.data.message,
      });
      await getCategories();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || "Error al eliminar la categoría");
      toast({
        title: "Error al eliminar categoría",
        variant: "destructive",
        description: errorMsg,
      });
    } finally {
      setLoading(false);
      setErrorMsg("");
    }
  };

  const addCategory = async (
    category: Omit<Category, "id">
  ): Promise<CategoryRespone | null> => {
    try {
      const headers = {
        "Content-Type": "application/json",
      };
      setLoading(true);
      const response = await client.post<CategoryRespone>(
        "/categories",
        category,
        { headers }
      );
      toast({
        title: "Categoría agregada correctamente.",
        variant: "success",
        description: response.data.message,
      });
      return response.data;
    } catch (error: any) {
      toast({
        title: "Error al crear categoría",
        variant: "destructive",
        description: error.response.data.error,
      });
      return null;
    } finally {
      setLoading(false);
      setErrorMsg("");
    }
  };

  const updateCategory = async (category: Category): Promise<CategoryRespone | null> => {
    try {
      const headers = {
        "Content-Type": "application/json",
      };
      setLoading(true);
      const response = await client.patch<CategoryRespone>(
        `/categories/${category.id}`,
        category,
        {
          headers,
        }
      );
      toast({
        title: "Categoría actualizada correctamente.",
        variant: "success",
        description: response.data.message || "La categoría se actualizó exitosamente.",
      });
      await getCategories(); // Recargar la lista después de actualizar
      return response.data;
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || "Error al actualizar la categoría");
      toast({
        title: "Error al actualizar categoría",
        variant: "destructive",
        description: errorMsg,
      });
      return null;
    } finally {
      setLoading(false);
      setErrorMsg("");
    }
  };

  return {
    loading,
    categories,
    category,
    getCategories,
    getCategoryById,
    deleteCategory,
    addCategory,
    updateCategory,
  };
};
