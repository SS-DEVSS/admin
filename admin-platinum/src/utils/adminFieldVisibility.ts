/** Base product details form field (not category attributes). Hidden in admin; name falls back to SKU on save. */
export const isHiddenProductDetailsNameField = (): boolean => true;

export const resolveProductNameForSave = (name: string | undefined, sku: string | undefined): string => {
  const trimmedName = name?.trim() ?? "";
  if (trimmedName) return trimmedName;
  return sku?.trim() ?? "";
};
