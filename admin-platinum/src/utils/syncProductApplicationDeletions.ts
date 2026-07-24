import { AxiosInstance } from "axios";

const DELETE_BATCH_SIZE = 500;
const DELETE_TIMEOUT_MS = 120_000;
const DELETE_ALL_TIMEOUT_MS = 300_000;

type SyncProductApplicationDeletionsParams = {
  client: AxiosInstance;
  productId: string;
  applicationIdsToDelete: string[];
  remainingApplicationCount: number;
};

export async function syncProductApplicationDeletions({
  client,
  productId,
  applicationIdsToDelete,
  remainingApplicationCount,
}: SyncProductApplicationDeletionsParams): Promise<void> {
  if (applicationIdsToDelete.length === 0) return;

  if (remainingApplicationCount === 0) {
    await client.delete(`/applications/product/${productId}`, {
      timeout: DELETE_ALL_TIMEOUT_MS,
    });
    return;
  }

  if (applicationIdsToDelete.length === 1) {
    await client.delete(`/applications/${applicationIdsToDelete[0]}`, {
      timeout: DELETE_TIMEOUT_MS,
    });
    return;
  }

  for (let index = 0; index < applicationIdsToDelete.length; index += DELETE_BATCH_SIZE) {
    const batch = applicationIdsToDelete.slice(index, index + DELETE_BATCH_SIZE);
    await client.delete("/applications/bulk", {
      data: { applicationIds: batch },
      timeout: DELETE_TIMEOUT_MS,
    });
  }
}
