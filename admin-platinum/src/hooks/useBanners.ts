import { Banner } from "@/models/banner";
import axiosClient from "@/services/axiosInstance";
import { useEffect } from "react";
import { useState } from "react";
import { toast } from "./use-toast";

export type AddBannerPayload = {
  desktopPath: string;
  /** Si no se envía, el backend usa la misma imagen que `desktopPath` para móvil. */
  mobilePath?: string;
  title?: string;
  altText?: string;
};

export type UpdateBannerPayload = {
  mobilePath?: string;
  desktopPath?: string;
  title?: string | null;
  altText?: string | null;
};

export const useBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const client = axiosClient();

  useEffect(() => {
    getAllBanners();
  }, []);

  const getAllBanners = async () => {
    try {
      setLoading(true);
      const { data } = await client.get(`/banners?page=1&pageSize=500`);
      setBanners(data.banners ?? []);
    } catch (error: unknown) {
      console.error("[useBanners] getAllBanners:", error);
    } finally {
      setLoading(false);
    }
  };

  const addBanner = async (payload: AddBannerPayload): Promise<boolean> => {
    try {
      setLoading(true);
      const headers = {
        "Content-Type": "application/json",
      };
      const response = await client.post(`/banners/`, payload, { headers });
      toast({
        title: "Banner agregado correctamente.",
        variant: "success",
        description: response.data?.message ?? "El banner ya está disponible en el sitio público.",
      });
      await getAllBanners();
      return true;
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ??
        error?.response?.data?.message ??
        error?.message ??
        "No se pudo crear el banner.";
      toast({
        title: "Error al crear banner",
        variant: "destructive",
        description: msg,
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateBanner = async (id: string, payload: UpdateBannerPayload): Promise<boolean> => {
    try {
      setLoading(true);
      await client.patch(`/banners/${id}`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      toast({
        title: "Banner actualizado",
        variant: "success",
        description: "Los cambios ya están guardados.",
      });
      await getAllBanners();
      return true;
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ??
        error?.response?.data?.message ??
        error?.message ??
        "No se pudo actualizar el banner.";
      toast({
        title: "Error al actualizar",
        variant: "destructive",
        description: msg,
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reorderBanners = async (orderedIds: string[]) => {
    try {
      setLoading(true);
      await client.put(
        `/banners/reorder`,
        { orderedIds },
        { headers: { "Content-Type": "application/json" } }
      );
      toast({
        title: "Orden actualizado",
        variant: "success",
        description: "El carrusel del sitio usará este orden.",
      });
      await getAllBanners();
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ??
        error?.response?.data?.message ??
        error?.message ??
        "No se pudo guardar el orden.";
      toast({
        title: "Error al reordenar",
        variant: "destructive",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteBanner = async (id: Banner["id"]) => {
    try {
      setLoading(true);
      const response = await client.delete(`/banners/${id}`);
      toast({
        title: "Banner eliminado correctamente.",
        variant: "success",
        description: response.data?.message ?? "Se eliminó el registro.",
      });
      await getAllBanners();
    } catch (error: any) {
      const msg = error?.response?.data?.error ?? error?.message ?? "Error al eliminar.";
      toast({
        title: "Error al eliminar banner",
        variant: "destructive",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return { loading, banners, addBanner, updateBanner, reorderBanners, deleteBanner, getAllBanners };
};
