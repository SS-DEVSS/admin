/** Hook: subcategory API (getTree, getByCategoryId, create, update, remove). Normalizes tree response to camelCase + children. */
import { useState, useCallback } from "react";
import { useAxiosClient } from "./useAxiosClient";
import { toast } from "./use-toast";
import type { Subcategory, SubcategoryTreeNode } from "../models/subcategory";

function normalizeTreeNode(raw: any): SubcategoryTreeNode {
  const id = raw?.id ?? "";
  const name = raw?.name ?? "";
  const description = raw?.description ?? null;
  const imgUrl = raw?.imgUrl ?? raw?.img_url ?? null;
  const categoryId = raw?.categoryId ?? raw?.category_id ?? null;
  const parentId = raw?.parentId ?? raw?.parent_id ?? null;
  const productCount = raw?.productCount ?? raw?.product_count ?? 0;
  const category = raw?.category;
  const childrenRaw = raw?.children ?? [];
  const children = Array.isArray(childrenRaw)
    ? childrenRaw.map(normalizeTreeNode)
    : [];
  return {
    id,
    name,
    description,
    imgUrl,
    categoryId,
    parentId,
    productCount,
    ...(category && { category }),
    children,
  };
}

export type CreateSubcategoryPayload = {
  name: string;
  description?: string | null;
  imgUrl?: string | null;
  categoryId?: string | null;
  parentId?: string | null;
};

export type UpdateSubcategoryPayload = {
  name?: string;
  description?: string | null;
  imgUrl?: string | null;
};

export const useSubcategories = () => {
  const client = useAxiosClient();
  const [loading, setLoading] = useState(false);

  const getTree = useCallback(async (categoryId: string): Promise<SubcategoryTreeNode[]> => {
    const { data } = await client.get("/subcategories", {
      params: { categoryId, tree: "true" },
    });
    if (!Array.isArray(data)) return [];
    return data.map(normalizeTreeNode);
  }, [client]);

  const getByCategoryId = useCallback(async (
    categoryId: string
  ): Promise<Subcategory[]> => {
    const { data } = await client.get("/subcategories", {
      params: { categoryId },
    });
    return Array.isArray(data) ? data : [];
  }, [client]);

  const create = async (
    payload: CreateSubcategoryPayload
  ): Promise<Subcategory | null> => {
    try {
      setLoading(true);
      const { data } = await client.post("/subcategories", payload);
      toast({
        title: "Subcategoría creada.",
        variant: "success",
      });
      return data;
    } catch (error: any) {
      toast({
        title: "Error al crear subcategoría",
        variant: "destructive",
        description: error.response?.data?.error || error.message,
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const update = async (
    id: string,
    payload: UpdateSubcategoryPayload
  ): Promise<Subcategory | null> => {
    try {
      setLoading(true);
      const { data } = await client.patch(`/subcategories/${id}`, payload);
      toast({ title: "Subcategoría actualizada.", variant: "success" });
      return data;
    } catch (error: any) {
      toast({
        title: "Error al actualizar subcategoría",
        variant: "destructive",
        description: error.response?.data?.error || error.message,
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      await client.delete(`/subcategories/${id}`);
      toast({ title: "Subcategoría eliminada.", variant: "success" });
      return true;
    } catch (error: any) {
      toast({
        title: "Error al eliminar subcategoría",
        variant: "destructive",
        description: error.response?.data?.error || error.message,
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    getTree,
    getByCategoryId,
    create,
    update,
    remove,
    loading,
  };
};
