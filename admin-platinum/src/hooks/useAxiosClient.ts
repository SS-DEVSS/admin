import { useMemo } from "react";
import axiosClient from "@/services/axiosInstance";
import type { AxiosInstance } from "axios";

/** Una sola instancia de axios por componente; evita bucles en useEffect por deps inestables. */
export const useAxiosClient = (): AxiosInstance =>
  useMemo(() => axiosClient(), []);
