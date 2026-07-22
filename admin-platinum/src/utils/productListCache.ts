import type { Item } from "@/models/product";
import type { CatalogVisibilityFilter } from "@/models/catalogVisibility";
import { invalidateFilterOptionsCache } from "@/utils/applicationFilterOptionsCache";

type ProductListCacheEntry = {
  products: Item[];
  totalItems: number;
  totalPages: number;
  version: number;
  fetchedAt: number;
};

const cache = new Map<string, ProductListCacheEntry>();
const MAX_ENTRIES = 40;
let listVersion = 0;

export function getProductListVersion(): number {
  return listVersion;
}

export function buildProductListCacheKey(params: {
  categoryId: string | null | undefined;
  page: number;
  pageSize: number;
  search: string;
  subcategoryId: string | null | undefined;
  catalogVisibility: CatalogVisibilityFilter;
  filtersPayload: Record<string, string | string[]>;
}): string {
  return JSON.stringify({
    categoryId: params.categoryId ?? "",
    page: params.page,
    pageSize: params.pageSize,
    search: params.search.trim(),
    subcategoryId: params.subcategoryId ?? "",
    catalogVisibility: params.catalogVisibility,
    filters: params.filtersPayload,
  });
}

export function getProductListCache(
  key: string
): Omit<ProductListCacheEntry, "version" | "fetchedAt"> | null {
  const entry = cache.get(key);
  if (!entry || entry.version !== listVersion) {
    return null;
  }
  return {
    products: entry.products,
    totalItems: entry.totalItems,
    totalPages: entry.totalPages,
  };
}

export function setProductListCache(
  key: string,
  data: {
    products: Item[];
    totalItems: number;
    totalPages: number;
  }
): void {
  cache.set(key, {
    ...data,
    version: listVersion,
    fetchedAt: Date.now(),
  });

  if (cache.size <= MAX_ENTRIES) return;

  const oldest = [...cache.entries()].sort(
    (a, b) => a[1].fetchedAt - b[1].fetchedAt
  );
  for (let i = 0; i < cache.size - MAX_ENTRIES; i++) {
    cache.delete(oldest[i][0]);
  }
}

/** Clears list cache and filter-option cache (e.g. after import or create). */
export function invalidateProductListCache(categoryId?: string): void {
  listVersion += 1;
  cache.clear();
  invalidateFilterOptionsCache(categoryId);
}
