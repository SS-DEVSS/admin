import { useToast } from "@/hooks/use-toast";
import { Category } from "@/models/category";
import {
  createContext,
  Dispatch,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuthContext } from "./auth-context";
import { useAxiosClient } from "@/hooks/useAxiosClient";

interface CategoryRespone {
  id: string;
  message: string;
}

interface ContextCategoryTypes {
  selectedCategory: Category["id"] | null;
  setSelectedCategory: Dispatch<Category["id"] | null>;
  categories: Category[];
  category: Category | null;
  loading: boolean;
  getCategoryById: (
    id: CategoryRespone["id"]
  ) => Promise<Category | undefined>;
  getCategories: () => void;
  addCategory: (
    category: Omit<Category, "id">
  ) => Promise<CategoryRespone | null>;
  updateCategory: (category: Category) => Promise<CategoryRespone | null>;
  deleteCategory: (id: Category["id"]) => void;
}

const CategoryContext = createContext<ContextCategoryTypes>({} as any);

export const useCategoryContext = () => useContext(CategoryContext);

export const CategoryContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const client = useAxiosClient();
  const { toast } = useToast();
  const { authState } = useAuthContext();

  const [selectedCategory, setSelectedCategory] = useState<
    Category["id"] | null
  >(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Start with true to show loader initially
  const [errorMsg, setErrorMsg] = useState("");

  const getCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await client.get("/categories");
      if (Array.isArray(response.data)) {
        setCategories(response.data);
      } else {
        setCategories([]);
      }
    } catch (error: unknown) {
      const message =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "error" in error.response.data
          ? String((error.response.data as { error?: string }).error)
          : "Error al cargar categorías";
      setErrorMsg(message);
      setCategories([]);
      toast({
        title: "Error al cargar categorías",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [client, toast]);

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
      const { data } = await client.get(
        `/categories/${id}?attributes=true&products=true`
      );
      setCategory(data);
      return data;
    } catch (error: unknown) {
      setCategory(null);
      const message =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "error" in error.response.data
          ? String((error.response.data as { error?: string }).error)
          : "No se pudo cargar la categoría";
      toast({
        title: "Error al cargar categoría",
        variant: "destructive",
        description: message,
      });
      return undefined;
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
      setErrorMsg(error.response.data.error);
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
      await getCategories();
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

  return (
    <CategoryContext.Provider
      value={{
        loading,
        selectedCategory,
        setSelectedCategory,
        category,
        categories,
        getCategoryById,
        getCategories,
        addCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};
