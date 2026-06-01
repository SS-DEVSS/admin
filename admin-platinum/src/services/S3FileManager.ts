import axiosClient from "./axiosInstance";
import { convertImageToWebP } from "@/utils/imageConverter";
import { normalizeImageFile } from "@/utils/imageUpload";

export const cleanFilePath = (
  path: string | null | undefined,
  startIndex: number,
  endIndex?: number
) => {
  if (!path) return "";
  return decodeURIComponent(path.slice(startIndex, endIndex));
};

export interface UploadFileResponse {
  bucket: string;
  key: string;
  location: string;
  status: number;
}

export const uploadFileToS3 = async (
  file: File,
  prefix: string = "uploads/images/"
): Promise<UploadFileResponse> => {
  const client = axiosClient();
  
  // Convertir imagen a WebP si es una imagen (no documentos PDF)
  let fileToUpload = normalizeImageFile(file);
  if (!prefix.includes("documents") && fileToUpload.type.startsWith("image/")) {
    try {
      fileToUpload = await convertImageToWebP(fileToUpload);
    } catch (error) {
      console.error("[S3FileManager] Error al convertir imagen a WebP, subiendo original:", error);
      // Si falla la conversión, subir el archivo original
      fileToUpload = file;
    }
  }
  
  const formData = new FormData();
  formData.append("file", fileToUpload);

  try {
    // Use backend file upload endpoint instead of direct S3
    const endpoint = prefix.includes("documents") ? "/files/documents" : "/files/images";
    
    const response = await client.post(endpoint, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 120000, // 120 seconds timeout for large files
    });

    const uploadedKey = response.data.key || "";
    const uploadedUrl = response.data.url || "";
    
    // Verificar que el archivo subido sea WebP (si era una imagen)
    const isWebP = uploadedKey.endsWith('.webp') || uploadedUrl.includes('.webp');
    if (!prefix.includes("documents") && file.type.startsWith("image/") && !isWebP) {
      console.warn(`[S3FileManager] ⚠️ ADVERTENCIA: El archivo no parece ser WebP. Verifica la extensión: ${uploadedKey}`);
    }

    // Backend returns { url, key }, format it to match expected response
    return {
      bucket: "",
      key: uploadedKey,
      location: uploadedUrl,
      status: response.status,
    };
  } catch (error: any) {
    console.error("[S3FileManager] Error uploading file:", error);
    const errorMessage = error.response?.data?.error || error.message || "Error uploading file";
    throw new Error(errorMessage);
  }
};

export const deleteFileFromS3 = async (path: string) => {
  const client = axiosClient();
  // Extract file ID from path if needed, or use path directly
  // This depends on your backend implementation
  try {
    await client.delete(`/files/images/${path}`);
  } catch (error) {
    // Try documents endpoint if images fails
    await client.delete(`/files/documents/${path}`);
  }
};
