import axiosClient from './axiosInstance';
import { convertImageToWebP } from '@/utils/imageConverter';
import { normalizeImageFile } from '@/utils/imageUpload';

const prepareImageForUpload = async (file: globalThis.File): Promise<globalThis.File> => {
  const normalized = normalizeImageFile(file);
  if (!normalized.type.startsWith('image/')) {
    throw new Error('Formato no reconocido. Usa PNG, JPG/JPEG o WebP.');
  }
  try {
    return await convertImageToWebP(normalized);
  } catch {
    return normalized;
  }
};

export interface File {
  id: string;
  name: string;
  type: 'image' | 'document';
  s3Key: string;
  url: string;
  size: number;
  mimeType: string | null;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListFilesResponse {
  files: File[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface BulkDeleteResponse {
  message: string;
  deletedCount: number;
  errors: string[];
}

export const fileService = {
  /**
   * Get all files with optional filtering, search, sorting, and pagination
   */
  getFiles: async (
    type?: 'image' | 'document',
    page: number = 1,
    limit: number = 20,
    searchQuery?: string,
    sortBy?: 'name' | 'createdAt',
    sortOrder?: 'asc' | 'desc'
  ): Promise<ListFilesResponse> => {
    const client = axiosClient();
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (searchQuery) params.append('search', searchQuery);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await client.get<ListFilesResponse>(`/files?${params.toString()}`);
    return response.data;
  },

  /**
   * Upload a single file
   */
  uploadFile: async (
    file: globalThis.File,
    type: 'image' | 'document'
  ): Promise<{ id: string; url: string; key: string }> => {
    const client = axiosClient();
    const fileToSend = type === 'image' ? await prepareImageForUpload(file) : file;
    const formData = new FormData();
    formData.append('file', fileToSend);

    const endpoint = type === 'document' ? '/files/documents' : '/files/images';
    const response = await client.post<{ id: string; url: string; key: string }>(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000,
    });

    return response.data;
  },

  /**
   * Upload multiple files
   */
  uploadFiles: async (
    files: globalThis.File[],
    type: 'image' | 'document',
    onProgress?: (progress: number) => void
  ): Promise<Array<{ id: string; url: string; key: string }>> => {
    const results: Array<{ id: string; url: string; key: string }> = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await fileService.uploadFile(files[i] as globalThis.File, type);
        results.push(result);
        if (onProgress) {
          onProgress(((i + 1) / total) * 100);
        }
      } catch (error) {
        console.error(`Error uploading file ${files[i].name}:`, error);
        throw error;
      }
    }

    return results;
  },

  /**
   * Delete a single file
   */
  deleteFile: async (fileId: string, type: 'image' | 'document'): Promise<void> => {
    const client = axiosClient();
    const endpoint = type === 'document' ? `/files/documents/${fileId}` : `/files/images/${fileId}`;
    await client.delete(endpoint);
  },

  /**
   * Delete multiple files in bulk
   */
  bulkDeleteFiles: async (fileIds: string[]): Promise<BulkDeleteResponse> => {
    const client = axiosClient();
    const response = await client.delete<BulkDeleteResponse>('/files/bulk', {
      data: { fileIds },
    });
    return response.data;
  },
};
