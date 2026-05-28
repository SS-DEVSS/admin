import axiosClient from './axiosInstance';
import { Item } from '@/models/product';

const LIST_REQUEST_TIMEOUT_MS = 120000;

export type ApiListProduct = {
  id: string;
  name: string;
  type: string;
  description?: string;
  sku?: string | null;
  category?: { id: string; name: string };
  idSubcategory?: string | null;
  subcategory?: { id: string; name: string } | null;
  references?: Item["references"];
  applications?: Item["applications"];
  attributeValues?: Item["attributeValues"];
};

export type CategoryProductsResponse = {
  products: ApiListProduct[];
  total: number;
  totalPages: number;
};

export const mapListProductToItem = (product: ApiListProduct): Item => ({
  id: product.id,
  name: product.name,
  type: product.type as Item["type"],
  description: product.description ?? "",
  category: product.category ?? { id: "", name: "" },
  idSubcategory: product.idSubcategory ?? null,
  subcategory: product.subcategory ?? null,
  references: product.references ?? [],
  applications: product.applications ?? [],
  attributeValues: product.attributeValues ?? [],
  variants: product.sku
    ? [
        {
          id: "",
          idProduct: product.id,
          name: product.name,
          sku: product.sku,
          price: 0,
          stockQuantity: 0,
          technicalSheets: [],
          images: [],
          kitItems: [],
          attributeValues: [],
        },
      ]
    : [],
});

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

  getProductById: async (id: string): Promise<ApiListProduct | null> => {
    const client = axiosClient();
    try {
      const response = await client.get<ApiListProduct>(`/products/${id}`, {
        timeout: LIST_REQUEST_TIMEOUT_MS,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  getProductsByCategory: async (
    categoryId: string,
    options?: {
      page?: number;
      pageSize?: number;
      search?: string;
      idSubcategory?: string;
    }
  ): Promise<CategoryProductsResponse> => {
    const client = axiosClient();
    const params: Record<string, string | number | boolean> = {
      page: options?.page ?? 1,
      pageSize: options?.pageSize ?? 100,
      includeHidden: true,
    };
    if (options?.search?.trim()) params.search = options.search.trim();
    if (options?.idSubcategory?.trim()) params.idSubcategory = options.idSubcategory.trim();

    const response = await client.get<CategoryProductsResponse>(
      `/products/category/${categoryId}`,
      { params, timeout: LIST_REQUEST_TIMEOUT_MS }
    );
    return response.data;
  },
};
