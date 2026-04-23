import { Variant } from "./item";

export interface TechnicalSheet {
  id?: string;
  title: string;
  path?: string;
  url?: string;
  imgUrl?: string | null;
  description: string;
  variant?: Variant | null;
  /** Productos relacionados (desde el backend) */
  products?: Array<{ id: string; name: string }> | null;
  /** Referencias vinculadas (texto libre). */
  references?: string[] | null;
}

/** **/
export type Document = {
  id: string;
  title: string;
  document_url?: string;
};
