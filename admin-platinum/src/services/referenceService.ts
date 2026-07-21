import { Reference } from "@/models/reference";
import axiosClient from "./axiosInstance";

export async function createReferenceForProduct(
  productId: string,
  reference: Reference
): Promise<Reference> {
  const client = axiosClient();
  const { data } = await client.post("/references", {
    idProduct: productId,
    referenceBrand: reference.referenceBrand ?? null,
    referenceNumber: reference.referenceNumber,
    typeOfPart: reference.typeOfPart ?? null,
    type: reference.type || "Aftermarket",
    description: reference.description ?? null,
    attributes: [],
  });
  return { ...(data.reference as Reference), isNew: false };
}

export async function persistNewReferences(
  productId: string,
  references: Reference[]
): Promise<void> {
  const pending = references.filter((reference) => reference.isNew);
  for (const reference of pending) {
    await createReferenceForProduct(productId, reference);
  }
}
