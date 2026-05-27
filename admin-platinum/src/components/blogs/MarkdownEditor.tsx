import { useEffect, useMemo, useRef } from "react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  MenuButtonBold,
  MenuButtonBulletedList,
  MenuButtonCode,
  MenuButtonCodeBlock,
  MenuButtonIndent,
  MenuButtonHorizontalRule,
  MenuButtonItalic,
  MenuButtonOrderedList,
  MenuButtonUnindent,
  MenuButtonUnderline,
  MenuButtonEditLink,
  MenuControlsContainer,
  MenuDivider,
  MenuSelectHeading,
  RichTextEditor,
  MenuButtonImageUpload,
  type RichTextEditorRef,
} from "mui-tiptap";
import { Label } from "@/components/ui/label";
import { useS3FileManager } from "@/hooks/useS3FileManager";
import { useToast } from "@/hooks/use-toast";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  label?: string;
  required?: boolean;
};

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Escribe aquí...",
  minHeight = "200px",
  label = "Contenido",
  required = false,
}: MarkdownEditorProps) {
  const rteRef = useRef<RichTextEditorRef>(null);
  const lastValueRef = useRef(value);
  const { uploadFile, uploading } = useS3FileManager();
  const { toast } = useToast();

  const extensions = useMemo(
    () => [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    [placeholder]
  );

  useEffect(() => {
    const editor = rteRef.current?.editor;
    if (!editor || editor.isDestroyed) return;
    if (value === lastValueRef.current) return;

    lastValueRef.current = value;
    if (!editor.isFocused) {
      queueMicrotask(() => {
        if (!editor || editor.isDestroyed) return;
        editor.commands.setContent(value || "", { emitUpdate: false });
      });
    }
  }, [value]);

  const handleUploadFiles = async (files: File[]) => {
    if (!files.length) return [];

    const firstFile = files[0];
    if (!firstFile.type.startsWith("image/")) {
      toast({
        title: "Selecciona una imagen",
        description: "Solo se permiten archivos de imagen.",
        variant: "destructive",
      });
      return [];
    }

    try {
      const location = await new Promise<string>((resolve, reject) => {
        uploadFile(firstFile, (_key, uploadedLocation) => {
          if (!uploadedLocation) {
            reject(new Error("No se recibió URL de la imagen"));
            return;
          }
          resolve(uploadedLocation);
        }).catch(reject);
      });

      return [{ src: location }];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo subir la imagen.";
      toast({
        title: "Error al subir la imagen",
        description: message,
        variant: "destructive",
      });
      return [];
    }
  };

  return (
    <div className="space-y-3">
      {label ? (
        <Label>
          {required ? <span className="text-red-500">*</span> : null} {label}
        </Label>
      ) : null}

      <RichTextEditor
        ref={rteRef}
        extensions={extensions}
        shouldRerenderOnTransaction
        content={value || ""}
        onUpdate={({ editor }) => {
          const html = editor.getHTML();
          lastValueRef.current = html;
          onChange(html);
        }}
        RichTextFieldProps={{
          variant: "outlined",
          className: "bg-background",
          sx: {
            "& .MuiTiptap-RichTextField-content": {
              minHeight,
            },
            "& .ProseMirror": {
              wordBreak: "break-word",
            },
            "& .ProseMirror ol, & .ProseMirror ul": {
              paddingLeft: "1.5rem",
              marginLeft: "0.5rem",
            },
            "& .ProseMirror li": {
              margin: "0.15rem 0",
            },
          },
        }}
        renderControls={() => (
          <MenuControlsContainer>
            <MenuSelectHeading
              tooltipTitle="Estilos"
              labels={{
                empty: "Cambiar a...",
                paragraph: "Párrafo",
                heading1: "Título 1",
                heading2: "Título 2",
                heading3: "Título 3",
                heading4: "Título 4",
                heading5: "Título 5",
                heading6: "Título 6",
              }}
            />
            <MenuDivider />
            <MenuButtonBold tooltipLabel="Negrita" />
            <MenuButtonItalic tooltipLabel="Cursiva" />
            <MenuButtonUnderline tooltipLabel="Subrayado" />
            <MenuDivider />
            <MenuButtonBulletedList tooltipLabel="Lista con viñetas" />
            <MenuButtonOrderedList tooltipLabel="Lista numerada" />
            <MenuButtonIndent tooltipLabel="Aumentar sangría" />
            <MenuButtonUnindent tooltipLabel="Disminuir sangría" />
            <MenuDivider />
            <MenuButtonEditLink tooltipLabel="Enlace" />
            <MenuButtonImageUpload
              tooltipLabel="Subir imagen"
              disabled={uploading}
              onUploadFiles={handleUploadFiles}
            />
            <MenuDivider />
            <MenuButtonCode tooltipLabel="Código" />
            <MenuButtonCodeBlock tooltipLabel="Bloque de código" />
            <MenuButtonHorizontalRule tooltipLabel="Línea horizontal" />
          </MenuControlsContainer>
        )}
      />
    </div>
  );
}
