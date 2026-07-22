type FilterOptionsCacheEntry = {
  options: Record<string, string[]>;
};

const filterOptionsCache = new Map<string, FilterOptionsCacheEntry>();

export function getCachedFilterOptions(
  categoryId: string
): Record<string, string[]> | null {
  return filterOptionsCache.get(categoryId)?.options ?? null;
}

export function setCachedFilterOptions(
  categoryId: string,
  options: Record<string, string[]>
): void {
  filterOptionsCache.set(categoryId, { options });
}

export function invalidateFilterOptionsCache(categoryId?: string): void {
  if (categoryId) {
    filterOptionsCache.delete(categoryId);
    return;
  }
  filterOptionsCache.clear();
}
