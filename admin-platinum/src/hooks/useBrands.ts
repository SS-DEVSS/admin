import { Brand } from "@/models/brand";
import axiosClient from "@/services/axiosInstance";
import { useEffect, useState } from "react";
import { useToast } from "./use-toast";

export const useBrands = () => {
  const client = axiosClient();
  const { toast } = useToast();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [brand, setBrand] = useState<Brand | null>({} as Brand);
  const [loading, setLoading] = useState<boolean>(true); // Start with true to show loader initially
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    getBrands();
  }, []);

  const getBrands = async () => {
    try {
      setLoading(true);
      const data = await client.get("/brands");
      setBrands(data.data);
    } catch (error) {
      console.error("Error fetching brands:", error);
    } finally {
      setLoading(false);
    }
  };

  const getBrandById = async (id: Brand["id"]) => {
    try {
      setLoading(true);
      const data = await client.get(`/brands/${id}`);
      setBrand(data.data);
      return data.data;
    } catch (error) {
      console.error("Error fetching brands:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBrand = async (id: Brand["id"]) => {
    try {
      setLoading(true);
      await client.delete(`/brands/${id}`);
      await getBrands();
      toast({
        title: "Línea de producto eliminada correctamente.",
        variant: "success",
      });
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || "Error inesperado.");
      toast({
        title: "Error al eliminar línea de producto",
        variant: "destructive",
        description: errorMsg,
      });
    } finally {
      setLoading(false);
      setErrorMsg("");
    }
  };

  const addBrand = async (brand: Brand) => {
    try {
      const headers = {
        "Content-Type": "application/json",
      };
      setLoading(true);
      const response = await client.post("/brands/", brand, { headers });
      toast({
        title: "Línea de producto creada correctamente.",
        variant: "success",
        description: response.data.message,
      });
      await getBrands();
    } catch (error: any) {
      setErrorMsg(error.response.data.error);
      toast({
        title: "Error al crear línea de producto",
        variant: "destructive",
        description: errorMsg,
      });
    } finally {
      setLoading(false);
      setErrorMsg("");
    }
  };

  const updateBrand = async (brand: Brand) => {
    try {
      const headers = {
        "Content-Type": "application/json",
      };
      setLoading(true);
      const response = await client.patch(`/brands/${brand.id}`, brand, {
        headers,
      });
      toast({
        title: "Línea de producto actualizada correctamente.",
        variant: "success",
        description: response.data.message,
      });
      await getBrands();
    } catch (error: any) {
      setErrorMsg(error.response.data.error);
      toast({
        title: "Error al actualizar línea de producto",
        variant: "destructive",
        description: errorMsg,
      });
    } finally {
      setLoading(false);
      setErrorMsg("");
    }
  };

  return {
    brands,
    brand,
    loading,
    getBrands,
    getBrandById,
    deleteBrand,
    addBrand,
    updateBrand,
  };
};
