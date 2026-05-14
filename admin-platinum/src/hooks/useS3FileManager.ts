import { useState } from "react";
import { deleteFileFromS3, uploadFileToS3 } from "@/services/S3FileManager";
import { toast } from "./use-toast";

export const useS3FileManager = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (
    file: File,
    onSuccess: (key: string, location: string) => void,
    options?: {
      destination?: "image" | "document";
      successToast?: { title: string; description?: string };
    }
  ) => {
    if (!file || !file.type) {
      console.warn("[useS3FileManager] Invalid file provided");
      return;
    }

    // Prevent multiple simultaneous uploads
    if (uploading) {
      console.warn("[useS3FileManager] Upload already in progress");
      toast({
        title: "Subida en curso",
        description: "Espera a que termine la subida anterior.",
        variant: "default",
      });
      return;
    }

    setUploading(true);
    setError(null);
    
    const fileNameLen = file.name.length + 66;
    if (fileNameLen > 255) {
      setUploading(false);
      toast({
        title: "El nombre de la imagen tiene que ser menor a 255 characteres.",
        variant: "destructive",
      });
      throw new Error(
        "El nombre de la imagen tiene que ser menor a 255 characteres"
      );
    }
    
    try {
      const extension = file.type.split("/")[1];
      let data: any;
      if (options?.destination === "document" || extension === "pdf") {
        data = await uploadFileToS3(file, "uploads/documents/");
      } else {
        data = await uploadFileToS3(file);
      }
      
      if (data && data.key && data.location) {
        if (options?.successToast) {
          toast({
            title: options.successToast.title,
            description: options.successToast.description,
            variant: "success",
          });
        }
        onSuccess(data.key, data.location);
      } else {
        throw new Error("Upload failed: invalid response");
      }
    } catch (e: any) {
      const errorMessage = e.message || "Error uploading file";
      setError(errorMessage);
      setUploading(false);
      console.error("[useS3FileManager] Upload error:", errorMessage);
      const isTimeout = /timeout|ECONNABORTED/i.test(errorMessage);
      toast({
        title: isTimeout ? "Tiempo de espera agotado" : "Error al subir",
        description: isTimeout
          ? "El servidor no respondió a tiempo. Comprueba que el backend esté en ejecución (ej. puerto 4000) y que la URL en VITE_API_BASE_URL sea correcta."
          : errorMessage,
        variant: "destructive",
      });
      throw e;
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (path: string, onSuccess: () => void) => {
    try {
      await deleteFileFromS3(path);
      onSuccess();
    } catch (e: any) {
      setError(e.message || "Error deleting file");
      console.error(e);
    }
  };

  return { uploading, error, uploadFile, deleteFile };
};
