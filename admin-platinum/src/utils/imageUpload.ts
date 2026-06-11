/** MIME types accepted for image uploads in admin (banners, products, etc.). */
export const IMAGE_UPLOAD_ACCEPT = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
} as const;

export const IMAGE_UPLOAD_ACCEPT_LABEL = "PNG, JPG/JPEG o WebP";

export const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const IMAGE_UPLOAD_MAX_LABEL = "10 MB";

const EXTENSION_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/** Some browsers/OS exports leave `file.type` empty; infer from extension. */
export const normalizeImageFile = (file: File): File => {
  if (file.type?.startsWith("image/")) return file;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = EXTENSION_TO_MIME[ext];
  if (!mime) return file;
  return new File([file], file.name, { type: mime, lastModified: file.lastModified });
};

export const getDropzoneRejectionMessage = (code: string): string => {
  switch (code) {
    case "file-too-large":
      return `El archivo supera el tamaño máximo de ${IMAGE_UPLOAD_MAX_LABEL}.`;
    case "file-invalid-type":
      return `Formato no permitido. Usa ${IMAGE_UPLOAD_ACCEPT_LABEL}.`;
    default:
      return "No se pudo usar este archivo.";
  }
};
