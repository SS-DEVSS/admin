import { Dispatch, useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { CheckCircle2, FileText } from "lucide-react";

interface MyDropzoneProps {
  file?: File | null;
  fileSetter: Dispatch<React.SetStateAction<File | null>>;
  type?: "document" | "image";
  className?: string;
  currentImageUrl?: string; // URL de la imagen actual (si existe)
  onImageClick?: () => void; // Callback para cuando se hace click en la imagen actual
  emptyTextStyle?: "default" | "reference"; // reference = dos líneas, segunda en azul subrayado
}

const MyDropzone = ({ file, fileSetter, type, className, currentImageUrl, onImageClick, emptyTextStyle = "default" }: MyDropzoneProps) => {
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
    (acceptedFiles: File[], rejectedFiles: any) => {
      setError(null);
      if (rejectedFiles.length > 0) {
        setError("Selecciona un archivo válido.");
        return;
      }

      if (acceptedFiles.length > 0) {
        const sanitizedFiles = acceptedFiles.map((file) => {
          const sanitizedFile = new File(
            [file],
            file.name ? file.name.replace(/[()]/g, "") : "file",
            {
              type: file.type,
            }
          );
          return sanitizedFile;
        });
        fileSetter(sanitizedFiles[0]);
      }
    },
    [fileSetter]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:
      type === "document"
        ? {
          "application/pdf": [],
          "image/png": [],
          "image/jpeg": [],
          "image/jpg": [],
        }
        : { "image/png": [], "image/jpeg": [], "image/jpg": [], "image/webp": [] },
    maxSize: 5000 * 1000,
  });

  const test = (path: string | undefined): string => {
    if (!path) return "";
    return path.includes("https") ? path.split("/uploads/")[1] : path;
  };

  // Si hay una imagen actual y no se ha seleccionado un nuevo archivo, mostrar vista previa en el mismo recuadro
  const showCurrentImagePreview = currentImageUrl && !file && !previewUrl && type === "image";
  const showPreview = previewUrl && type === "image";
  const showDocumentSelected = type === "document" && !!(file && file.name);
  const showText = !showCurrentImagePreview && !showPreview && !showDocumentSelected;

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
  if (showCurrentImagePreview) {
    return (
      <div
        {...getRootProps()}
        className={`${className} flex flex-col items-center justify-center min-h-[200px] cursor-pointer ${isDragActive ? "bg-[#F5F9FD] border-[#0bbff4]" : ""}`}
      >
        <input {...getInputProps()} />
        <img
          src={currentImageUrl}
          className="max-w-full max-h-[280px] object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onImageClick?.();
          }}
        />
        <p className="text-sm text-muted-foreground mt-2 text-center">
          Arrastra otra imagen o haz clic para cambiar
        </p>
        {error && <p className="text-center text-red-500 mt-2">{error}</p>}
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
              <img
                src={previewUrl}
                alt="Vista previa"
                className="max-w-full max-h-[300px] object-contain rounded-lg mb-2"
              />
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
        </>
      )}

      {error && <p className="text-center text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default MyDropzone;
