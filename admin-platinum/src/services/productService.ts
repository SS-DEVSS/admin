import axiosClient from './axiosInstance';
import { Product } from '@/models/product';

export interface FeaturedProduct {
  id: string;
  name: string;
  sku: string;
  description: string;
  isFeatured: boolean;
  featuredApplicationId: string | null;
  featuredApplication?: {
    id: string;
    sku: string;
    origin: string | null;
    attributeValues?: Array<{
      id: string;
      idAttribute: string;
      valueString?: string | null;
      valueNumber?: number | null;
      valueBoolean?: boolean | null;
      valueDate?: string | null;
      attribute?: {
        id: string;
        name: string;
        displayName?: string;
        order: number;
      };
    }>;
  };
  images?: Array<{
    id: string;
    path: string;
    order: number;
  }>;
}

export interface GetFeaturedProductsResponse {
  products: FeaturedProduct[];
}

export const productService = {
  /**
   * Get all featured products
   */
  getFeaturedProducts: async (): Promise<GetFeaturedProductsResponse> => {
    const client = axiosClient();
    const response = await client.get<GetFeaturedProductsResponse>('/products/featured');
    return response.data;
  },

  /**
   * Set a product as featured with a selected application
   */
  setFeaturedProduct: async (
    productId: string,
    applicationId: string | null
  ): Promise<any> => {
    const client = axiosClient();
    const response = await client.post(`/products/${productId}/feature`, {
      applicationId,
    });
    return response.data;
  },

  bulkUpdateCatalogVisibility: async (
    productIds: string[],
    visibleInCatalog: boolean
  ): Promise<{ updatedCount: number }> => {
    const client = axiosClient();
    const response = await client.patch<{ updatedCount: number }>(
      '/products/bulk/catalog-visibility',
      { productIds, visibleInCatalog }
    );
    return response.data;
  },

  getProductById: async (id: string): Promise<Product | null> => {
    const client = axiosClient();
    try {
      const response = await client.get<Product>(`/products/${id}`, {
        timeout: 120000,
      });
      return response.data;
    } catch {
      return null;
    }
  },
};
