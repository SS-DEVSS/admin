import { Brand } from "./brand";

export type Category = {
  id?: string;
  name: string;
  imgUrl: string;
  description: string;
  brands?: Brand[];
  attributes?: CategoryAtributes[];
  products?: string[];
};

export type CategoryResponse = {
  id?: string;
  name: string;
  imgUrl: string;
  description: string;
  brands?: Brand[];
  attributes?: {
    product: CategoryAtributes[];
    variant: CategoryAtributes[];
    reference?: CategoryAtributes[];
    application?: CategoryAtributes[];
  };
  products?: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
  }>;
};

export enum CategoryAttributesTypes {
  STRING = "string",
  NUMERIC = "number",
  DATE = "date",
  BOOLEAN = "boolean",
}

export const typesArray = Object.values(CategoryAttributesTypes);

export type CategoryAtributes = {
  id?: string;
  name: string;
  csv_name?: string;
  display_name?: string;
  required: boolean;
  type: CategoryAttributesTypes;
  order: number;
  scope: "PRODUCT" | "VARIANT" | "REFERENCE" | "APPLICATION";
  id_category?: string;
  visibleInCatalog?: boolean;
  visibleInProductDetail?: boolean;
  filterRequired?: boolean;
};

export type CategoryAttributeApi = CategoryAtributes & {
  csvName?: string | null;
  displayName?: string | null;
  visible_in_catalog?: boolean;
  visible_in_product_detail?: boolean;
  filter_required?: boolean;
  filterRequired?: boolean;
};

export function normalizeCategoryAttributeFromApi(
  attr: CategoryAttributeApi
): CategoryAtributes {
  return {
    id: attr.id,
    name: attr.name,
    csv_name: attr.csv_name ?? attr.csvName ?? undefined,
    display_name: attr.display_name ?? attr.displayName ?? undefined,
    required: attr.required,
    type: attr.type,
    order: attr.order,
    scope: attr.scope,
    id_category: attr.id_category,
    visibleInCatalog:
      attr.visibleInCatalog ?? attr.visible_in_catalog ?? true,
    visibleInProductDetail:
      attr.visibleInProductDetail ?? attr.visible_in_product_detail ?? true,
    filterRequired: attr.filterRequired ?? attr.filter_required ?? true,
  };
}
