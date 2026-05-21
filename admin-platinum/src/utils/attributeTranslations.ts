/**
 * Translation utility for attribute names from English to Spanish
 * Used to display attributes in Spanish throughout the UI
 */

import { REFERENCE_FIELD_LABELS } from '@/constants/referenceFieldLabels';

// Core attribute translations (for products, references, applications)
export const coreAttributeTranslations: Record<string, string> = {
  // Products
  'SKU': 'SKU',
  'Name': 'Nombre',
  'Description': 'Descripción',

  // References (UI labels)
  'Reference Brand': REFERENCE_FIELD_LABELS.referenceBrand,
  'ReferenceNumber': REFERENCE_FIELD_LABELS.referenceNumber,
  'Reference Number': REFERENCE_FIELD_LABELS.referenceNumber,
  'Part Type': REFERENCE_FIELD_LABELS.typeOfPart,
  'PartType': REFERENCE_FIELD_LABELS.typeOfPart,
  'Reference Type': REFERENCE_FIELD_LABELS.referenceType,
  'ReferenceType': REFERENCE_FIELD_LABELS.referenceType,
  'Número de Intercambio': REFERENCE_FIELD_LABELS.referenceNumber,
  'Tipo de Parte': REFERENCE_FIELD_LABELS.typeOfPart,
  'Tipo de parte': REFERENCE_FIELD_LABELS.typeOfPart,
  'Tipo de Referencia': REFERENCE_FIELD_LABELS.referenceType,
  /** Reference CSV column "Tipo" (OEM/Aftermarket); only when isCoreAttribute is true */
  'Tipo': REFERENCE_FIELD_LABELS.referenceType,
  'Marca de Referencia': REFERENCE_FIELD_LABELS.referenceBrand,
  'Número de Referencia': REFERENCE_FIELD_LABELS.referenceNumber,

  // Applications
  'Origin': 'Origen',

  // Common variations
  'referenceBrand': REFERENCE_FIELD_LABELS.referenceBrand,
  'referenceNumber': REFERENCE_FIELD_LABELS.referenceNumber,
  'partType': REFERENCE_FIELD_LABELS.typeOfPart,
  'referenceType': REFERENCE_FIELD_LABELS.referenceType,
  'productName': 'Nombre de Producto',
  'name': 'Nombre',
  'description': REFERENCE_FIELD_LABELS.description,
  'sku': REFERENCE_FIELD_LABELS.sku,
  'origin': 'Origen',
};

// Common category attribute translations
export const categoryAttributeTranslations: Record<string, string> = {
  // Common product/reference/application attributes
  'System': 'Sistema',
  'Type': 'Tipo',
  'Tipo': 'Tipo',
  'Model': 'Modelo',
  'Submodel': 'Submodelo',
  'Year': 'Año',
  'Engine Liters': 'Litros del Motor',
  'Engine_Liters': 'Litros del Motor',
  'Engine CC': 'CC del Motor',
  'Engine_CC': 'CC del Motor',
  'Engine CID': 'CID del Motor',
  'Engine_CID': 'CID del Motor',
  'Engine Cylinders': 'Cilindros del Motor',
  'Engine_Cylinders': 'Cilindros del Motor',
  'Engine Block': 'Bloque del Motor',
  'Engine_Block': 'Bloque del Motor',
  'Engine Description': 'Motor Descripción',
  'Engine_Description': 'Motor Descripción',
  'Motor_Descripcion': 'Motor Descripción',
  'Specifications': 'Especificaciones',
  'Manufacturer': 'Fabricante',
  'Brand': 'Marca',
  'Category': 'Categoría',

  // Common variations
  'model': 'Modelo',
  'submodel': 'Submodelo',
  'year': 'Año',
  'año': 'Año',
  'anio': 'Año',
  'system': 'Sistema',
  'type': 'Tipo',
  'brand': 'Marca',
  'category': 'Categoría',
  'manufacturer': 'Fabricante',
  'specifications': 'Especificaciones',
};

/**
 * Translates an attribute name from English to Spanish
 * @param attributeName - The English attribute name
 * @param isCoreAttribute - Whether this is a core attribute (default: false)
 * @returns The Spanish translation or the original name if no translation found
 */
export const translateAttributeName = (
  attributeName: string | null | undefined,
  isCoreAttribute: boolean = false
): string => {
  if (!attributeName) return '';

  const trimmedName = attributeName.trim();
  if (!trimmedName) return '';

  // First check core attributes if it's a core attribute
  if (isCoreAttribute) {
    const coreTranslation = coreAttributeTranslations[trimmedName];
    if (coreTranslation) return coreTranslation;
  }

  // Check category attributes
  const categoryTranslation = categoryAttributeTranslations[trimmedName];
  if (categoryTranslation) return categoryTranslation;

  // Try case-insensitive matching
  const lowerName = trimmedName.toLowerCase();
  for (const [key, value] of Object.entries(categoryAttributeTranslations)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  if (isCoreAttribute) {
    for (const [key, value] of Object.entries(coreAttributeTranslations)) {
      if (key.toLowerCase() === lowerName) {
        return value;
      }
    }
  }

  // If no translation found, return original (capitalize first letter for better display)
  return trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);
};
