/** Convierte una ruta S3 o URL parcial en URL pública para mostrar imágenes. */
export function resolvePublicImageUrl(path?: string | null): string | undefined {
  if (!path?.trim()) return undefined;

  const trimmed = path.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const base = import.meta.env.VITE_AWS_S3_BUCKET_PUBLIC_URL;
  if (!base) return trimmed;

  const baseUrl = base.endsWith("/") ? base : `${base}/`;
  const cleanPath = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  return `${baseUrl}${cleanPath}`;
}
