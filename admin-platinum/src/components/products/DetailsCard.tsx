import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { detailsType } from "@/hooks/useFormProduct";
import { Product } from "@/models/product";
import MyDropzone from "@/components/Dropzone";
import { useS3FileManager } from "@/hooks/useS3FileManager";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import axiosClient from "@/services/axiosInstance";
import { FolderOpen, Trash2 } from "lucide-react";
import FilePickerModal from "@/components/files/FilePickerModal";

type DetailsCardProps = {
  state: detailsType;
  setState: React.Dispatch<React.SetStateAction<detailsType>>;
  product?: Product | null;
  children?: React.ReactNode;
};

const DetailsCard = ({ state, setState, product, children }: DetailsCardProps) => {
  const { uploadFile, uploading } = useS3FileManager();
  const { toast } = useToast();
  const client = axiosClient();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>(state.imgUrl || "");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");
  const [filePickerOpen, setFilePickerOpen] = useState(false);

  useEffect(() => {
    if (state.imgUrl && !imageFile) setImageUrl(state.imgUrl);
  }, [state.imgUrl, imageFile]);

  useEffect(() => {
    if (product && state.imgUrl) {
      setImageFile((currentFile) => {
        if (currentFile && !(currentFile instanceof File && currentFile.name))
          return null;
        return currentFile;
      });
    }
  }, [product, state.imgUrl, imageUrl, imageFile]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setState((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  useEffect(() => {
    if (imageFile && imageFile.name) {
      uploadFile(imageFile, (_key: string, location: string) => {
        setImageUrl(location);
        setState((prevForm) => ({
          ...prevForm,
          imgUrl: location,
        }));
      });
    } else if (!imageFile && !state.imgUrl) {
      setImageUrl("");
    }
  }, [imageFile, uploadFile, setState, state.imgUrl]);

  const handlePreviewImage = (url: string) => {
    setPreviewImageUrl(url);
    setPreviewDialogOpen(true);
  };

  const handleDeleteImage = async () => {
    if (!state.id) {
      setImageFile(null);
      setImageUrl("");
      setState((prevForm) => ({
        ...prevForm,
        imgUrl: "",
      }));
      return;
    }

    try {
      await client.delete(`/products/${state.id}/images`);
      setImageUrl("");
      setState((prevForm) => ({
        ...prevForm,
        imgUrl: "",
      }));
      toast({
        title: "Imagen eliminada correctamente",
        variant: "success",
      });
    } catch (error: unknown) {
      const apiError = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      toast({
        title: "Error al eliminar imagen",
        variant: "destructive",
        description:
          apiError.response?.data?.error ||
          apiError.message ||
          "Error desconocido",
      });
    }
  };

  const handleFileSelect = (fileUrl: string) => {
    setImageFile(null);
    setImageUrl(fileUrl);
    setState((prevForm) => ({
      ...prevForm,
      imgUrl: fileUrl,
    }));
  };

  const hasExistingImage = Boolean(imageUrl && !imageFile);

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>
            SKU, descripción, imagen y atributos del producto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="sku">
              SKU<span className="text-red-500">*</span>
            </Label>
            <Input
              id="sku"
              name="sku"
              type="text"
              className="w-full"
              placeholder="SKU del producto"
              onChange={handleFormChange}
              value={state.sku}
            />
          </div>

          <div className="space-y-2 border-t pt-6">
            <Label htmlFor="description">
              Descripción<span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              className="w-full min-h-[140px] resize-y"
              placeholder="Descripción del producto"
              value={state.description}
              onChange={handleFormChange}
            />
          </div>

          <div className="space-y-3 border-t pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Label>Multimedia</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Imagen principal del producto
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilePickerOpen(true)}
                type="button"
                className="w-full shrink-0 sm:w-auto"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Buscar en archivos
              </Button>
            </div>
            {hasExistingImage ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
                    <button
                      type="button"
                      className="flex h-full w-full items-center justify-center"
                      onClick={() => handlePreviewImage(imageUrl)}
                    >
                      <img
                        src={imageUrl}
                        alt="Imagen del producto"
                        className="h-full w-full object-contain p-1"
                      />
                    </button>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        aria-label="Eliminar imagen"
                        disabled={uploading}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteImage();
                        }}
                        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md transition-transform hover:scale-105 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <MyDropzone
                    file={imageFile || undefined}
                    fileSetter={setImageFile}
                    type="image"
                    variant="compact"
                    className="h-28 w-28 shrink-0"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreviewImage(imageUrl)}
                  type="button"
                >
                  Previsualizar
                </Button>
              </div>
            ) : (
              <MyDropzone
                file={imageFile || undefined}
                fileSetter={setImageFile}
                type="image"
                className="p-6 min-h-[140px]"
                currentImageUrl={
                  imageUrl && !imageFile ? imageUrl : undefined
                }
                onImageClick={() => {
                  if (imageUrl && !imageFile) {
                    handlePreviewImage(imageUrl);
                  }
                }}
              />
            )}
            {uploading && (
              <p className="text-sm text-muted-foreground">Subiendo imagen...</p>
            )}
          </div>

          {children ? (
            <div className="border-t pt-6">{children}</div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Vista Previa de Imagen</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex justify-center">
            {previewImageUrl && (
              <img
                src={previewImageUrl}
                alt="Vista previa"
                className="max-w-full max-h-[500px] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <FilePickerModal
        open={filePickerOpen}
        onOpenChange={setFilePickerOpen}
        onSelectFile={handleFileSelect}
        filterType="image"
      />
    </>
  );
};

export default DetailsCard;
