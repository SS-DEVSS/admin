import { TechnicalSheet } from "@/models/technicalSheet";
import axiosClient from "@/services/axiosInstance";
import { useState } from "react";
import { useToast } from "./use-toast";

type CreateTechnicalSheetPayload = Omit<TechnicalSheet, "id"> & {
  productIds?: string[];
  applications?: string[];
};

type UpdateTechnicalSheetPayload = {
  title?: string;
  description?: string;
  path?: string;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      message?: string;
      response?: { data?: { error?: string } };
    };
    return maybeError.response?.data?.error || maybeError.message || fallback;
  }
  return fallback;
};

export const useTs = () => {
  const client = axiosClient();
  const { toast } = useToast();

  const [technicalSheets, setTechnicalSheets] = useState<TechnicalSheet[]>([]);
  const [technicalSheet, setTechnicalSheet] = useState<TechnicalSheet | null>(
    {} as TechnicalSheet
  );
  const [loading, setLoading] = useState<boolean>(true); // Start with true to show loader initially

  const addTechnicalSheet = async (ts: CreateTechnicalSheetPayload) => {
    try {
      const headers = {
        "Content-Type": "application/json",
      };
      setLoading(true);
      await client.post("/ts/", ts, { headers });
      await getTechnicalSheets();
      toast({
        title: "Boletín creado correctamente.",
        variant: "success",
      });
    } catch (error: unknown) {
      toast({
        title: "Error al crear boletín",
        variant: "destructive",
        description: getErrorMessage(error, "No se pudo crear el boletín"),
      });
    } finally {
      setLoading(false);
    }
  };

  const getTechnicalSheets = async (search?: string): Promise<TechnicalSheet[] | null> => {
    try {
      setLoading(true);
      const data = await client.get("/ts", {
        params: {
          page: 1,
          pageSize: 100,
          ...(search?.trim() ? { search: search.trim() } : {}),
        },
      });
      setTechnicalSheets(data.data.technicalSheets || []);
      return data.data.technicalSheets;
    } catch (error) {
      console.error("Error fetching technical sheets:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getTsById = async (
    id: TechnicalSheet["id"]
  ): Promise<TechnicalSheet | null> => {
    try {
      setLoading(true);
      const data = await client.get(`/ts/${id}`);
      setTechnicalSheet(data.data);
      return data.data;
    } catch (error) {
      console.error("Error fetching technicalsheet:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteTechnicalSheet = async (id: TechnicalSheet["id"]) => {
    try {
      setLoading(true);
      await client.delete(`/ts/${id}`);
      await getTechnicalSheets();
      toast({
        title: "Boletín eliminado correctamente.",
        variant: "success",
      });
    } catch (error: unknown) {
      toast({
        title: "Error al eliminar boletín",
        variant: "destructive",
        description: getErrorMessage(error, "No se pudo eliminar el boletín"),
      });
    } finally {
      setLoading(false);
    }
  };

  const addProductsToTechSheet = async (
    id: TechnicalSheet["id"],
    productIds: string[],
    options?: { silent?: boolean }
  ) => {
    if (!id || productIds.length === 0) return;
    try {
      setLoading(true);
      await client.post(`/ts/${id}/products`, { productIds }, { headers: { "Content-Type": "application/json" } });
      await getTechnicalSheets();
      if (!options?.silent) {
        toast({ title: "Productos agregados al boletín.", variant: "success" });
      }
    } catch (error: unknown) {
      toast({
        title: "Error al agregar productos",
        variant: "destructive",
        description: getErrorMessage(error, "No se pudieron agregar productos"),
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeProductsFromTechSheet = async (
    id: TechnicalSheet["id"],
    productIds: string[],
    options?: { silent?: boolean }
  ) => {
    if (!id || productIds.length === 0) return;
    try {
      setLoading(true);
      await client.delete(`/ts/${id}/products`, { data: { productIds } });
      await getTechnicalSheets();
      if (!options?.silent) {
        toast({ title: "Productos quitados del boletín.", variant: "success" });
      }
    } catch (error: unknown) {
      toast({
        title: "Error al quitar productos",
        variant: "destructive",
        description: getErrorMessage(error, "No se pudieron quitar productos"),
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateReferencesForTechSheet = async (
    id: TechnicalSheet["id"],
    references: string[],
    options?: { silent?: boolean }
  ) => {
    if (!id) return;
    try {
      setLoading(true);
      await client.patch(
        `/ts/${id}/references`,
        { references },
        { headers: { "Content-Type": "application/json" } }
      );
      await getTechnicalSheets();
      if (!options?.silent) {
        toast({ title: "Referencias actualizadas.", variant: "success" });
      }
    } catch (error: unknown) {
      toast({
        title: "Error al actualizar referencias",
        variant: "destructive",
        description: getErrorMessage(error, "No se pudieron actualizar referencias"),
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationsForTechSheet = async (
    id: TechnicalSheet["id"],
    applications: string[],
    options?: { silent?: boolean }
  ) => {
    if (!id) return;
    try {
      setLoading(true);
      await client.patch(
        `/ts/${id}/applications`,
        { applications },
        { headers: { "Content-Type": "application/json" } }
      );
      await getTechnicalSheets();
      if (!options?.silent) {
        toast({ title: "Aplicaciones actualizadas.", variant: "success" });
      }
    } catch (error: unknown) {
      toast({
        title: "Error al actualizar aplicaciones",
        variant: "destructive",
        description: getErrorMessage(error, "No se pudieron actualizar aplicaciones"),
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateTechnicalSheet = async (
    id: TechnicalSheet["id"],
    payload: UpdateTechnicalSheetPayload
  ): Promise<boolean> => {
    if (!id) return false;
    try {
      setLoading(true);
      await client.patch(`/ts/${id}`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      await getTechnicalSheets();
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error al actualizar boletín",
        variant: "destructive",
        description: getErrorMessage(error, "No se pudo actualizar el boletín"),
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    technicalSheet,
    technicalSheets,
    loading,
    addTechnicalSheet,
    getTechnicalSheets,
    getTsById,
    deleteTechnicalSheet,
    addProductsToTechSheet,
    removeProductsFromTechSheet,
    updateReferencesForTechSheet,
    updateApplicationsForTechSheet,
    updateTechnicalSheet,
  };
};
