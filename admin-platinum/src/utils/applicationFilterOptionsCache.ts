type FilterOptionsCacheEntry = {
  options: Record<string, string[]>;
  flat: boolean;
};

type FilterOptionsCacheQuery = {
  flat?: boolean;
  filters?: Record<string, string | string[]>;
};

const filterOptionsCache = new Map<string, FilterOptionsCacheEntry>();

function buildFilterOptionsCacheKey(
  categoryId: string,
  query?: FilterOptionsCacheQuery
): string {
  const flat = query?.flat === true ? "1" : "0";
  const filters = query?.filters;

  if (!filters || Object.keys(filters).length === 0) {
    return `${categoryId}|${flat}|`;
  }

  const serialized = Object.entries(filters)
    .filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (Array.isArray(value)) return value.some((item) => String(item).trim());
      return String(value).trim() !== "";
    })
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:${value.map((item) => String(item).trim()).filter(Boolean).join(",")}`;
      }
      return `${key}:${String(value).trim()}`;
    })
    .join(";");

  return `${categoryId}|${flat}|${serialized}`;
}

export function getCachedFilterOptions(
  categoryId: string,
  query?: FilterOptionsCacheQuery
): Record<string, string[]> | null {
  const cacheKey = buildFilterOptionsCacheKey(categoryId, query);
  const entry = filterOptionsCache.get(cacheKey);
  if (!entry) return null;

  const wantsFlat = query?.flat === true;
  if (wantsFlat && !entry.flat) {
    return null;
  }

  return entry.options;
}

export function setCachedFilterOptions(
  categoryId: string,
  options: Record<string, string[]>,
  query?: FilterOptionsCacheQuery
): void {
  const cacheKey = buildFilterOptionsCacheKey(categoryId, query);
  filterOptionsCache.set(cacheKey, {
    options,
    flat: query?.flat === true,
  });
}

export function invalidateFilterOptionsCache(categoryId?: string): void {
  if (!categoryId) {
    filterOptionsCache.clear();
    return;
  }

  const prefix = `${categoryId}|`;
  for (const key of filterOptionsCache.keys()) {
    if (key.startsWith(prefix)) {
      filterOptionsCache.delete(key);
    }
  }
}
