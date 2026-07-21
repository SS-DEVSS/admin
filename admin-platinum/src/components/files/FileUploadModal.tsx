import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Image as ImageIcon, FileText, Loader2, X } from 'lucide-react';
import { useFilesContext } from '@/context/files-context';
import { useToast } from '@/hooks/use-toast';
import { normalizeImageFile } from '@/utils/imageUpload';
import { productService } from '@/services/productService';
import { fileService } from '@/services/fileService';
import BulkImageMatchPreview from '@/components/products/BulkImageMatchPreview';

type FileType = 'image' | 'document';

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

interface FileUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

const FileUploadModal = ({ open, onOpenChange, onUploadComplete }: FileUploadModalProps) => {
  const [fileType, setFileType] = useState<FileType>('image');
  const [selectedFiles, setSelectedFiles] = useState<globalThis.File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [matchProductsBySku, setMatchProductsBySku] = useState(false);
  const [productPreview, setProductPreview] = useState<BulkImageResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const { getFiles, filterType } = useFilesContext();
  const { toast } = useToast();

  const acceptedFileTypes = {
    image: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    document: {
      'application/pdf': ['.pdf'],
    },
  };

  const resetProductMatchState = () => {
    setMatchProductsBySku(false);
    setProductPreview(null);
    setPreviewLoading(false);
  };

  const onDrop = useCallback(
    (acceptedFiles: globalThis.File[]) => {
      if (acceptedFiles.length > 0) {
        const next =
          fileType === 'image'
            ? acceptedFiles.map((file) => normalizeImageFile(file))
            : acceptedFiles;
        setSelectedFiles((prev) => [...prev, ...next]);
        setProductPreview(null);
      }
    },
    [fileType]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes[fileType],
    multiple: true,
    disabled: isUploading,
  });

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setProductPreview(null);
  };

  const handleFileTypeChange = (value: FileType) => {
    setFileType(value);
    setSelectedFiles([]);
    setProductPreview(null);
    if (value !== 'image') {
      setMatchProductsBySku(false);
    }
  };

  const handleMatchToggle = (checked: boolean) => {
    setMatchProductsBySku(checked);
    setProductPreview(null);
  };

  const handlePreviewProductMatches = async () => {
    const imageFiles = selectedFiles.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast({
        title: 'Sin imágenes',
        description: 'Selecciona al menos una imagen para analizar coincidencias.',
        variant: 'destructive',
      });
      return;
    }

    setPreviewLoading(true);
    try {
      const result = await productService.previewBulkImages(imageFiles);
      setProductPreview(result as BulkImageResult);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast({
        title: 'Error al analizar',
        description:
          axiosErr.response?.data?.error ??
          (err instanceof Error ? err.message : 'No se pudieron analizar las coincidencias'),
        variant: 'destructive',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'Error',
        description: 'Por favor, selecciona al menos un archivo',
        variant: 'destructive',
      });
      return;
    }

    const imageFiles = selectedFiles.filter((f) => f.type.startsWith('image/'));

    if (matchProductsBySku && imageFiles.length === 0) {
      toast({
        title: 'Sin imágenes',
        description: 'La asociación por SKU solo aplica a archivos de imagen.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      await fileService.uploadFiles(selectedFiles, fileType, (progress) => {
        setUploadProgress(progress);
      });

      const currentType = filterType === 'all' ? undefined : filterType;
      await getFiles(currentType, 1);

      let productMatchMessage = '';
      if (matchProductsBySku && imageFiles.length > 0) {
        const result = (await productService.uploadBulkImages(imageFiles)) as BulkImageResult;
        productMatchMessage = ` Productos: ${result.uploaded} imagen(es) asociada(s), ${result.skipped} omitida(s), ${result.errors} error(es).`;
      }

      toast({
        title: 'Éxito',
        description: `${selectedFiles.length} archivo(s) subido(s) correctamente.${productMatchMessage}`,
        variant: 'success',
      });

      setSelectedFiles([]);
      setUploadProgress(0);
      resetProductMatchState();
      onOpenChange(false);
      onUploadComplete?.();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string }; status?: number } };
      const errorMessage =
        axiosErr.response?.data?.error ??
        (err instanceof Error ? err.message : 'Error al subir los archivos');
      console.error('Upload error:', err);
      toast({
        title: axiosErr.response?.status === 400 ? 'Archivo no válido' : 'Error al subir',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFiles([]);
      setUploadProgress(0);
      resetProductMatchState();
      onOpenChange(false);
    }
  };

  const imageFiles = selectedFiles.filter((f) => f.type.startsWith('image/'));
  const previewImages = imageFiles.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subir Archivos</DialogTitle>
          <DialogDescription>
            Selecciona el tipo de archivo y arrastra o selecciona los archivos a subir
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3">
            <Label htmlFor="fileType">
              Tipo de Archivo<span className="text-red-500">*</span>
            </Label>
            <Select value={fileType} onValueChange={(value) => handleFileTypeChange(value as FileType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona el tipo de archivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <span>Imagen (JPG, PNG, WEBP)</span>
                  </div>
                </SelectItem>
                <SelectItem value="document">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Documento (PDF)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {fileType === 'image' && (
            <label
              htmlFor="match-products-sku"
              className={`flex flex-col gap-1.5 rounded-lg border p-3 transition-colors ${
                isUploading
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  id="match-products-sku"
                  checked={matchProductsBySku}
                  onCheckedChange={(checked) => handleMatchToggle(checked === true)}
                  disabled={isUploading}
                />
                <span className="text-sm font-medium leading-none">
                  Asociar imágenes a productos por SKU
                </span>
              </div>
              <p className="ml-7 text-xs text-muted-foreground">
                El nombre del archivo (sin extensión) debe coincidir con el SKU del producto.
                Las imágenes también se subirán al administrador de archivos.
              </p>
            </label>
          )}

          <div className="grid gap-3">
            <Label>Archivos</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragActive
                  ? 'bg-[#F5F9FD] border-[#0bbff4] cursor-pointer'
                  : selectedFiles.length > 0
                  ? 'bg-green-50 border-green-400 cursor-pointer'
                  : 'border-[#94A3B8] hover:border-[#0bbff4] cursor-pointer'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} disabled={isUploading} />
              {isDragActive ? (
                <p className="text-[#4E5154]">Suelta los archivos aquí...</p>
              ) : selectedFiles.length > 0 ? (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-green-600" />
                  <p className="font-medium">{selectedFiles.length} archivo(s) seleccionado(s)</p>
                  <p className="text-sm text-muted-foreground">
                    Haz clic para seleccionar más archivos
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Arrastra y suelta los archivos aquí o haz clic para seleccionar
                  </p>
                </div>
              )}
            </div>
          </div>

          {matchProductsBySku && selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void handlePreviewProductMatches()}
                disabled={previewLoading || isUploading}
              >
                {previewLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  'Analizar coincidencias con productos'
                )}
              </Button>

              {productPreview && (
                <BulkImageMatchPreview
                  total={productPreview.total}
                  matched={productPreview.matched}
                  skipped={productPreview.skipped}
                  rows={productPreview.rows}
                  maxRows={20}
                />
              )}
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Total: {selectedFiles.length} archivo(s)
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFiles([]);
                    setProductPreview(null);
                  }}
                  disabled={isUploading}
                >
                  Limpiar
                </Button>
              </div>

              {fileType === 'image' && previewImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Vista previa (primeros {Math.min(10, imageFiles.length)} de {imageFiles.length})
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {previewImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-24 object-cover rounded border"
                        />
                        <button
                          onClick={() => handleRemoveFile(selectedFiles.indexOf(file))}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={isUploading}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Subiendo archivos...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isUploading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || selectedFiles.length === 0}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Subir {selectedFiles.length} archivo(s)
                      {matchProductsBySku ? ' y asociar productos' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadModal;
