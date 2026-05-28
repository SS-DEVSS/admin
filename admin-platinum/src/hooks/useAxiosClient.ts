import { getSharedAxiosClient } from "@/services/axiosInstance";
import type { AxiosInstance } from "axios";

/** Instancia axios compartida en toda la app. */
export const useAxiosClient = (): AxiosInstance => getSharedAxiosClient();
