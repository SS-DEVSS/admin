import {
  CategoryAtributes,
  CategoryResponse,
  normalizeCategoryAttributeFromApi,
  CategoryAttributeApi,
} from "@/models/category";

export type ApplicationFilterMap = Record<string, string[]>;

export type ActiveApplicationFilterChip = {
  attributeId: string;
  attributeName: string;
  value: string;
};

const STORAGE_PREFIX = "products-application-filters";

export function sortApplicationFilterAttributes(
  attributes: CategoryAtributes[]
): CategoryAtributes[] {
  return [...attributes].sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function getApplicationAttributesFromCategory(
  category: CategoryResponse | null | undefined
): CategoryAtributes[] {
  const raw = category?.attributes?.application ?? [];
  return sortApplicationFilterAttributes(
    raw.map((attr) =>
      normalizeCategoryAttributeFromApi(attr as CategoryAttributeApi)
    )
  );
}

export function normalizeApplicationFilterValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

export function countActiveApplicationFilters(
  filters: ApplicationFilterMap
): number {
  return Object.values(filters).reduce(
    (total, values) => total + values.filter((value) => value.trim()).length,
    0
  );
}

export function countActiveApplicationFilterAttributes(
  filters: ApplicationFilterMap
): number {
  return Object.values(filters).filter((values) =>
    values.some((value) => value.trim())
  ).length;
}

export function buildApplicationFiltersPayload(
  filters: ApplicationFilterMap
): Record<string, string | string[]> {
  return Object.fromEntries(
    Object.entries(sanitizeApplicationFilters(filters)).map(([key, values]) => [
      key,
      values.length === 1 ? values[0] : values,
    ])
  );
}

export function sanitizeApplicationFilters(
  filters: ApplicationFilterMap
): ApplicationFilterMap {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, values]) => [
        key,
        values.map((value) => value.trim()).filter(Boolean),
      ])
      .filter(([, values]) => (values as string[]).length > 0)
  );
}

export function flattenActiveApplicationFilters(
  filters: ApplicationFilterMap,
  attributes: CategoryAtributes[]
): ActiveApplicationFilterChip[] {
  const attributeById = new Map(
    attributes
      .filter((attr): attr is CategoryAtributes & { id: string } => !!attr.id)
      .map((attr) => [attr.id, attr])
  );

  const chips: ActiveApplicationFilterChip[] = [];

  for (const [attributeId, values] of Object.entries(filters)) {
    const attribute = attributeById.get(attributeId);
    const attributeName =
      attribute?.display_name || attribute?.name || "Atributo";

    for (const value of values) {
      if (!value.trim()) continue;
      chips.push({ attributeId, attributeName, value: value.trim() });
    }
  }

  return chips;
}

export function removeApplicationFilterValue(
  filters: ApplicationFilterMap,
  attributeId: string,
  value: string
): ApplicationFilterMap {
  const next = { ...filters };
  const remaining = (next[attributeId] ?? []).filter((item) => item !== value);
  if (remaining.length === 0) {
    delete next[attributeId];
  } else {
    next[attributeId] = remaining;
  }
  return next;
}

export function toggleApplicationFilterValue(
  filters: ApplicationFilterMap,
  attributeId: string,
  value: string,
  selected: boolean
): ApplicationFilterMap {
  const next = { ...filters };
  const current = next[attributeId] ?? [];

  if (selected) {
    if (!current.includes(value)) {
      next[attributeId] = [...current, value];
    }
  } else {
    const remaining = current.filter((item) => item !== value);
    if (remaining.length === 0) {
      delete next[attributeId];
    } else {
      next[attributeId] = remaining;
    }
  }

  return sanitizeApplicationFilters(next);
}

function storageKey(categoryId: string): string {
  return `${STORAGE_PREFIX}:${categoryId}`;
}

function normalizeStoredFilters(raw: unknown): ApplicationFilterMap {
  if (!raw || typeof raw !== "object") return {};

  const normalized: ApplicationFilterMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const values = normalizeApplicationFilterValues(value);
    if (values.length > 0) {
      normalized[key] = values;
    }
  }
  return normalized;
}

export function loadApplicationFilters(categoryId: string): ApplicationFilterMap {
  try {
    const raw = localStorage.getItem(storageKey(categoryId));
    if (!raw) return {};
    return normalizeStoredFilters(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveApplicationFilters(
  categoryId: string,
  filters: ApplicationFilterMap
): void {
  const active = sanitizeApplicationFilters(filters);
  if (Object.keys(active).length === 0) {
    localStorage.removeItem(storageKey(categoryId));
    return;
  }
  localStorage.setItem(storageKey(categoryId), JSON.stringify(active));
}

export function clearApplicationFiltersStorage(categoryId: string): void {
  localStorage.removeItem(storageKey(categoryId));
}
