export type Reference = {
  id: string;
  sku: string;
  referenceBrand: string | null;
  referenceNumber: string;
  typeOfPart: string | null;
  type: string;
  description: string | null;
  attributeValues?: any[];
  isNew?: boolean;
};
