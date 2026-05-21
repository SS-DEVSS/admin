/** UI display labels for reference core fields (CSV/import column names unchanged). */
export const REFERENCE_FIELD_LABELS = {
  sku: "SKU",
  referenceBrand: "Marca de Intercambio",
  referenceNumber: "Intercambio",
  typeOfPart: "Producto",
  /** OEM / Aftermarket on reference records only */
  referenceType: "Origen",
  description: "Descripción",
} as const;

export type ReferenceFieldLabelKey = keyof typeof REFERENCE_FIELD_LABELS;

export const getReferenceFieldLabel = (field: ReferenceFieldLabelKey): string =>
  REFERENCE_FIELD_LABELS[field];
