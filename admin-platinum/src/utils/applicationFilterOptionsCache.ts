type FilterOptionsCacheEntry = {
  options: Record<string, string[]>;
  flat: boolean;
};

const filterOptionsCache = new Map<string, FilterOptionsCacheEntry>();

export function getCachedFilterOptions(
  categoryId: string,
  options?: { flat?: boolean }
): Record<string, string[]> | null {
  const entry = filterOptionsCache.get(categoryId);
  if (!entry) return null;

  const wantsFlat = options?.flat === true;
  if (wantsFlat && !entry.flat) {
    return null;
  }

  return entry.options;
}

export function setCachedFilterOptions(
  categoryId: string,
  options: Record<string, string[]>,
  cacheOptions?: { flat?: boolean }
): void {
  filterOptionsCache.set(categoryId, {
    options,
    flat: cacheOptions?.flat === true,
  });
}

export function invalidateFilterOptionsCache(categoryId?: string): void {
  if (categoryId) {
    filterOptionsCache.delete(categoryId);
    return;
  }
  filterOptionsCache.clear();
}
