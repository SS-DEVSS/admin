import { Dispatch, useCallback, useState, useEffect } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { CheckCircle2, FileText, Plus, X } from "lucide-react";
import {
  getDropzoneRejectionMessage,
  IMAGE_UPLOAD_ACCEPT,
  IMAGE_UPLOAD_MAX_BYTES,
  normalizeImageFile,
} from "@/utils/imageUpload";

interface MyDropzoneProps {
  file?: File | null;
  fileSetter: Dispatch<React.SetStateAction<File | null>>;
  type?: "document" | "image";
  className?: string;
  currentImageUrl?: string; // URL de la imagen actual (si existe)
  /** Nombre del documento ya guardado (modo edición, sin File local). */
  currentDocumentName?: string;
  onImageClick?: () => void; // Callback para cuando se hace click en la imagen actual
  emptyTextStyle?: "default" | "reference"; // reference = dos líneas, segunda en azul subrayado
  /** Botón pequeño encima de la vista previa para quitar el archivo sin filas de botones debajo */
  imageOverlayRemove?: boolean;
  /** Texto cuando ya hay imagen guardada (modo edición). */
  currentImageLabel?: string;
  /** Cuadrado compacto con ícono + para reemplazar imagen. */
  variant?: "default" | "compact";
}

const MyDropzone = ({
  file,
  fileSetter,
  type,
  className,
  currentImageUrl,
  currentDocumentName,
  onImageClick,
  emptyTextStyle = "default",
  imageOverlayRemove = false,
  currentImageLabel = "Imagen actual adjunta",
  variant = "default",
}: MyDropzoneProps) => {
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Generar y limpiar URL de previsualización cuando cambia el archivo
  useEffect(() => {
    // Verificar que file sea realmente un File object válido
    if (file && file instanceof File && file.name && type === "image") {
      try {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        // Limpiar URL anterior cuando cambie el archivo o se desmonte
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (error) {
        console.error("Error creating object URL:", error);
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }
  }, [file, type]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);
      if (rejectedFiles.length > 0) {
        const code = rejectedFiles[0]?.errors[0]?.code ?? "unknown";
        setError(getDropzoneRejectionMessage(code));
        return;
      }

      if (acceptedFiles.length > 0) {
        const raw = acceptedFiles[0];
        const normalized = type === "image" ? normalizeImageFile(raw) : raw;
        const sanitizedFile = new File(
          [normalized],
          normalized.name ? normalized.name.replace(/[()]/g, "") : "file",
          { type: normalized.type }
        );
        fileSetter(sanitizedFile);
      }
    },
    [fileSetter, type]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:
      type === "document"
        ? {
            "application/pdf": [".pdf"],
            "image/png": [".png"],
            "image/jpeg": [".jpg", ".jpeg"],
          }
        : IMAGE_UPLOAD_ACCEPT,
    maxSize: type === "document" ? 70 * 1024 * 1024 : IMAGE_UPLOAD_MAX_BYTES,
  });

  const test = (path: string | undefined): string => {
    if (!path) return "";
    return path.includes("https") ? path.split("/uploads/")[1] : path;
  };

  // Si hay una imagen actual y no se ha seleccionado un nuevo archivo, mostrar vista previa en el mismo recuadro
  const showCurrentImagePreview = currentImageUrl && !file && !previewUrl && type === "image";
  const showPreview = previewUrl && type === "image";
  const showDocumentSelected = type === "document" && !!(file && file.name);
  const showCurrentDocument =
    type === "document" && !file && !!currentDocumentName?.trim();
  const showText =
    !showCurrentImagePreview && !showPreview && !showDocumentSelected && !showCurrentDocument;

  const emptyStateContent =
    emptyTextStyle === "reference" ? (
      <div className="text-center">
        <p className="text-muted-foreground leading-8">
          Arrastra una imagen aquí o
        </p>
        <p className="text-blue-600 underline cursor-pointer mt-0.5">
          haz clic para seleccionar
        </p>
      </div>
    ) : (
      <p className={`${isDragActive ? "text-[#4E5154]" : "text-[#94A3B8]"} text-center leading-8`}>
        Arrastra una imagen aquí o <br />
        <span className="underline hover:cursor-pointer">haz clic para seleccionar</span>
      </p>
    );

  // Vista previa cuando ya hay imagen guardada: mismo recuadro con la imagen
  if (showCurrentImagePreview && variant !== "compact") {
    return (
      <div
        {...getRootProps()}
        className={`${className} border border-dashed rounded-lg flex flex-col items-center justify-center min-h-[200px] cursor-pointer bg-green-50 border-green-400 px-4 py-6 ${
          isDragActive ? "bg-[#F5F9FD] border-[#0bbff4]" : ""
        }`}
      >
        <input {...getInputProps()} />
        <CheckCircle2 className="h-8 w-8 text-green-600 mb-2" />
        <p className="text-sm font-semibold text-[#4E5154] mb-2 text-center">
          {currentImageLabel}
        </p>
        <img
          src={currentImageUrl}
          alt={currentImageLabel}
          className="max-w-full max-h-[280px] object-contain rounded-lg border bg-white cursor-pointer hover:opacity-90 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onImageClick?.();
          }}
        />
        <p className="text-sm text-muted-foreground mt-3 text-center">
          Arrastra otra imagen o haz clic para reemplazar la portada
        </p>
        {error && <p className="text-center text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        {...getRootProps()}
        className={`border border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
          isDragActive
            ? "bg-[#F5F9FD] border-[#0bbff4]"
            : showPreview
              ? "bg-green-50 border-green-400"
              : "border-muted-foreground/30 hover:bg-muted/40 hover:border-muted-foreground/50"
        } ${className ?? ""}`}
      >
        <input {...getInputProps()} />
        {showPreview && previewUrl ? (
          <img
            src={previewUrl}
            alt="Vista previa"
            className="h-full w-full object-contain rounded-lg p-1"
          />
        ) : (
          <Plus className="h-6 w-6 text-muted-foreground" aria-hidden />
        )}
        <span className="sr-only">Agregar o reemplazar imagen</span>
        {error && <p className="sr-only">{error}</p>}
      </div>
    );
  }

  // Layout normal cuando no hay imagen actual
  return (
    <div
      {...getRootProps()}
      className={`${isDragActive
        ? "bg-[#F5F9FD] border-[#0bbff4]"
        : file && file.name
          ? "bg-green-50 border-green-400"
          : showCurrentDocument
            ? "bg-green-50 border-green-400"
            : ""
        } border border-dashed rounded-lg ${className} flex flex-col items-center justify-center`}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p
          className={`${isDragActive ? "text-[#4E5154]" : "text-[#94A3B8]"
            } text-center`}
        >
          Drop the files here ...
        </p>
      ) : (
        <>
          {showPreview && (
            <div className="w-full flex flex-col items-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mb-2" />
              <p className="text-sm font-semibold text-[#4E5154] mb-2">
                Archivo cargado correctamente
              </p>
              <div className="relative mb-2 inline-block max-w-full">
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  className="max-w-full max-h-[300px] object-contain rounded-lg"
                />
                {imageOverlayRemove ? (
                  <button
                    type="button"
                    aria-label="Quitar archivo"
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background/95 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileSetter(null);
                    }}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>
              <div className="inline-flex items-center gap-2 rounded-md bg-white/80 border px-3 py-2 max-w-full">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-[#4E5154] truncate max-w-[260px]">
                  {file && file.name ? test(file.name) : "Vista previa"}
                </span>
              </div>
              <p className="text-center text-[#94A3B8] mt-2 text-sm underline hover:cursor-pointer">
                Haz clic para reemplazar el archivo
              </p>
            </div>
          )}
          {showText && emptyStateContent}
          {showDocumentSelected && (
            <div className="w-full flex flex-col items-center gap-2 px-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <p className="text-sm font-semibold text-[#4E5154]">
                Archivo cargado correctamente
              </p>
              <div className="inline-flex items-center gap-2 rounded-md bg-white/80 border px-3 py-2 max-w-full">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-[#4E5154] truncate max-w-[260px]">
                  {file?.name}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] underline hover:cursor-pointer">
                Haz clic para reemplazar el archivo
              </p>
            </div>
          )}
          {showCurrentDocument && (
            <div className="w-full flex flex-col items-center gap-2 px-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <p className="text-sm font-semibold text-[#4E5154]">Documento actual adjunto</p>
              <div className="inline-flex items-center gap-2 rounded-md bg-white/80 border px-3 py-2 max-w-full">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-[#4E5154] truncate max-w-[260px]">
                  {currentDocumentName}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] underline hover:cursor-pointer">
                Haz clic para reemplazar el archivo
              </p>
            </div>
          )}
        </>
      )}

      {error && <p className="text-center text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default MyDropzone;
