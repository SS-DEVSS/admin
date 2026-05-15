import { useState, useCallback } from "react";
import axiosClient from "@/services/axiosInstance";

const PREVIEW_UPLOAD_MAX_BYTES = 17 * 1024 * 1024;

interface Attribute {
  id: string;
  name: string;
  csvName?: string | null;
  required?: boolean;
}

interface CoreAttribute {
  id: string;
  name: string;
  csvName: string;
  type: 'core';
}

interface PreviewResult {
  headers: string[];
  attributes: Attribute[];
  coreAttributes: CoreAttribute[];
  suggestedMappings: { [csvColumn: string]: string };
  requiredAttributes: string[];
  coreProductFields: string[];
}

interface UseImportPreviewResult {
  preview: PreviewResult | null;
  loading: boolean;
  error: string | null;
  fetchPreview: (file: File, importType: string, categoryId: string) => Promise<void>;
  clearPreview: () => void;
}

export const useImportPreview = (): UseImportPreviewResult => {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = useCallback(async (file: File, importType: string, categoryId: string) => {
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const client = axiosClient();
      const formData = new FormData();
      const previewPayload =
        file.size > PREVIEW_UPLOAD_MAX_BYTES
          ? file.slice(0, PREVIEW_UPLOAD_MAX_BYTES, file.type || undefined)
          : file;
      formData.append("file", previewPayload, file.name);
      formData.append("importType", importType);
      formData.append("categoryId", categoryId);

      const response = await client.post<PreviewResult>("/import/preview", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30 * 60 * 1000,
      });

      setPreview(response.data);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Error al obtener la vista previa del archivo.";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return { preview, loading, error, fetchPreview, clearPreview };
};
