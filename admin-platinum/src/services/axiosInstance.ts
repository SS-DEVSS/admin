import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";
import { supabase } from "./supabase";

const axiosClient = (token: string | null = null): AxiosInstance => {
  const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

  const client = axios.create({
    baseURL,
    timeout: 60000,
    withCredentials: false,
  });

  client.interceptors.request.use(async (config: any) => {
    config.headers = config.headers || {};

    // Set Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Get session synchronously if possible, otherwise await
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
      } catch (error) {
        // If session retrieval fails, continue without token
        // The backend will return 401 if authentication is required
      }
    }

    // Set Content-Type based on the data being sent
    // If it's FormData, let axios set it automatically (it will include boundary)
    // Otherwise, use application/json
    if (!(config.data instanceof FormData)) {
      if (!config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/json";
      }
    }
    // If it's FormData, don't set Content-Type - axios will set it with the boundary

    return config;
  });

  client.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error: AxiosError) => {
      try {
        const { response } = error;
        // Solo cerrar sesión si es realmente un error de autenticación (401)
        if (response?.status === 401) {
          const errorData = response?.data as any;
          // No cerrar si es un error de validación que viene como 401
          if (!errorData?.error?.includes('validation') && !errorData?.error?.includes('Invalid')) {
            await supabase.auth.signOut();
            window.location.href = "/login";
          }
        }
      } catch (e) {
        // Silently handle interceptor errors
      }
      throw error;
    }
  );

  return client;
};

/** Instancia compartida para evitar múltiples interceptores y peticiones duplicadas. */
let sharedClient: AxiosInstance | null = null;

export const getSharedAxiosClient = (): AxiosInstance => {
  if (!sharedClient) {
    sharedClient = axiosClient();
  }
  return sharedClient;
};

export default axiosClient;
