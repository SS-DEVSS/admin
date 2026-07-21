import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { productService } from "@/services/productService";
import { toast } from "@/hooks/use-toast";
import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import { Loader2, Upload } from "lucide-react";

type BulkImageRow = {
  status: string;
  sku: string;
  file: string;
  reason?: string;
  productId?: string;
};

type BulkImageResult = {
  total: number;
  matched: number;
  uploaded: number;
  skipped: number;
  errors: number;
  rows: BulkImageRow[];
};

type BulkImageUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
};

const BulkImageUploadDialog = ({ open, onOpenChange, onComplete }: BulkImageUploadDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<BulkImageResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const resetState = () => {
    setFiles([]);
    setPreview(null);
    setPreviewLoading(false);
    setUploadLoading(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetState();
    onOpenChange(next);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files ? Array.from(event.target.files) : [];
    setFiles(selected);
    setPreview(null);
  };

  const handlePreview = async () => {
    if (files.length === 0) {
      toast({ title: "Selecciona imágenes", variant: "destructive" });
      return;
    }
    setPreviewLoading(true);
    try {
      const result = await productService.previewBulkImages(files);
      setPreview(result as BulkImageResult);
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (error instanceof Error ? error.message : "Error al analizar imágenes");
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploadLoading(true);
    try {
      const result = (await productService.uploadBulkImages(files)) as BulkImageResult;
      toast({
        title: "Carga completada",
        description: `${result.uploaded} imagen(es) subida(s). ${result.skipped} omitida(s). ${result.errors} error(es). Las imágenes existentes fueron reemplazadas.`,
      });
      setConfirmOpen(false);
      handleOpenChange(false);
      onComplete?.();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (error instanceof Error ? error.message : "Error al subir imágenes");
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carga masiva de imágenes por SKU</DialogTitle>
            <DialogDescription>
              El nombre del archivo (sin extensión) debe coincidir con el SKU del producto.
            </DialogDescription>
          </DialogHeader>

          <div
            className="border border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/40"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Haz clic para seleccionar imágenes (JPG, PNG, WebP...)
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {files.length > 0 && (
            <p className="text-sm text-muted-foreground">{files.length} archivo(s) seleccionado(s)</p>
          )}

          {preview && (
            <div className="rounded-md border p-3 text-sm space-y-2">
              <p>
                Total: {preview.total} | Coincidencias: {preview.matched} | Omitidos:{" "}
                {preview.skipped}
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {preview.rows.slice(0, 30).map((row) => (
                  <div key={`${row.file}-${row.sku}`} className="text-xs">
                    {row.status === "ok"
                      ? `✓ ${row.file} → ${row.sku}`
                      : `⊘ ${row.file} — ${row.reason ?? "omitido"}`}
                  </div>
                ))}
                {preview.rows.length > 30 && (
                  <p className="text-xs text-muted-foreground">
                    ... y {preview.rows.length - 30} más
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handlePreview()}
              disabled={previewLoading || files.length === 0}
            >
              {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analizar coincidencias"}
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={!preview || preview.matched === 0}>
              Subir imágenes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar carga de imágenes"
        description={`Se subirán imágenes para ${preview?.matched ?? 0} producto(s) coincidente(s).`}
        consequences={[
          "Las imágenes existentes de cada producto coincidente serán reemplazadas.",
          "Los archivos sin SKU coincidente serán omitidos.",
          "Todas las imágenes se convertirán a WebP antes de subirse.",
        ]}
        confirmLabel="Subir imágenes"
        loading={uploadLoading}
        onConfirm={handleUpload}
      />
    </>
  );
};

export default BulkImageUploadDialog;
