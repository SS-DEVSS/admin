import { useEffect, useState, useRef } from "react";
import Layout from "@/components/Layouts/Layout";
import { Button } from "@/components/ui/button";
import DashboardPageShell from "@/components/Layouts/DashboardPageShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle, PlusCircle, Search, FolderOpen } from "lucide-react";
import CardSectionLayout from "@/components/Layouts/CardSectionLayout";
import CardTemplate from "@/components/Layouts/CardTemplate";
import { useBrandContext } from "@/context/brand-context";
import { useBrands } from "@/hooks/useBrands";
import { Textarea } from "@/components/ui/textarea";
import { useMemo } from "react";
import { Brand } from "@/models/brand";
import NoData from "@/components/NoData";
import MyDropzone from "@/components/Dropzone";
import { useS3FileManager } from "@/hooks/useS3FileManager";
import Loader from "@/components/Loader";
import FilePickerModal from "@/components/files/FilePickerModal";

const Marcas = () => {
  const { brands, brand, loading, addBrand, updateBrand, getBrands, getBrandById } =
    useBrands();
  const { modalState, closeModal, openModal } = useBrandContext();
  const { uploadFile } = useS3FileManager();
  const { isOpen, title, description } = modalState;
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const savingStartTimeRef = useRef<number | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");
  const [filePickerOpen, setFilePickerOpen] = useState(false);

  const [filterBrandSearch, setFilterBrandSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    logoImgUrl: "",
  });

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (image?.name && image.name !== form.logoImgUrl) {
      setForm({
        ...form,
        logoImgUrl: image.name,
      });
    }
  }, [image]);

  useEffect(() => {
    if (brand && isOpen && isEditMode) {
      setImage(null);
    }
  }, [brand, isOpen, isEditMode]);

  useEffect(() => {
    if (brand) {
      setForm({
        name: brand.name || "",
        description: brand.description || "",
        logoImgUrl: brand.logoImgUrl || "",
      });
      setIsEditMode(true);
    } else {
      setForm({
        name: "",
        description: "",
        logoImgUrl: "",
      });
      setIsEditMode(false);
    }
  }, [brand]);

  useEffect(() => {
    if (!isOpen) {
      setForm({
        name: "",
        description: "",
        logoImgUrl: "",
      });
      setImage({} as File);
      setIsEditMode(false);
    }
  }, [isOpen]);

  useEffect(() => {
    getBrands();
  }, []);

  const handleForm = (e: any) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const validateForm = () => {
    return form.name !== "" && form.description !== "" && form.logoImgUrl;
  };

  const handleSearchFilter = (e: any) => {
    const { value } = e.target;
    setFilterBrandSearch(value.trim());
  };

  const handlePreviewImage = (url: string) => {
    setPreviewImageUrl(url);
    setPreviewDialogOpen(true);
  };

  const handleFileSelect = (fileUrl: string) => {
    setImage(null);
    setForm((prevForm) => ({
      ...prevForm,
      logoImgUrl: fileUrl,
    }));
  };

  const filterBrands = useMemo(
    () =>
      brands.filter((brand: Brand) =>
        brand.name.toLowerCase().includes(filterBrandSearch.toLocaleLowerCase())
      ),
    [brands, filterBrandSearch]
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const startTime = Date.now();
    savingStartTimeRef.current = startTime;

    const brandData = {
      ...form,
      id: brand ? brand.id : "",
    };

    const finishSaving = () => {
      const elapsed = savingStartTimeRef.current ? Date.now() - savingStartTimeRef.current : 0;
      const minDisplayTime = 800;
      const remainingTime = Math.max(0, minDisplayTime - elapsed);
      setTimeout(() => {
        setIsSubmitting(false);
        savingStartTimeRef.current = null;
        closeModal();
      }, remainingTime);
    };

    try {
      if (isEditMode) {
        if (image && image instanceof File && image.name) {
          uploadFile(image, async (_, location) => {
            await updateBrand({ ...brandData, logoImgUrl: location });
            setImage(null);
            finishSaving();
          });
        } else {
          await updateBrand(brandData);
          finishSaving();
        }
      } else {
        if (image && image instanceof File && image.name) {
          uploadFile(image, async (_, location) => {
            await addBrand({ ...form, logoImgUrl: location });
            setImage(null);
            finishSaving();
          });
        }
      }
    } catch (error) {
      setIsSubmitting(false);
      savingStartTimeRef.current = null;
    }
  };

  const handleOpenModal = (brandToEdit = null) => {
    if (brandToEdit) {
      setIsEditMode(true);
      openModal({
        title: "Editar Línea de Producto",
        description: "Edita la línea de producto seleccionada.",
        action: "",
      });
    } else {
      setIsEditMode(false);
      openModal({
        title: "Agregar Línea de Producto",
        description: "Agregar una nueva línea de producto al sistema.",
        action: "",
      });
    }
  };

  return (
    <>
      {isSubmitting && (
        <Loader fullScreen message="Guardando cambios..." />
      )}
      <Layout>
        <DashboardPageShell
          title="Líneas de Producto"
          description="Maneja tus líneas de producto y las categorías asociadas a cada una de ellas"
          filters={
            <>
              <div className="relative flex-1 md:grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar línea de producto..."
                  onChange={handleSearchFilter}
                  value={filterBrandSearch}
                  className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
                />
              </div>
              <Dialog
                  open={isOpen}
                  onOpenChange={(open: boolean) => {
                    if (!open) {
                      setForm({
                        name: "",
                        description: "",
                        logoImgUrl: "",
                      });
                      setIsEditMode(false);
                      closeModal();
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="h-10 px-6 gap-1 shrink-0"
                      onClick={() => handleOpenModal()}
                    >
                      <PlusCircle className="h-3.5 w-3.5 sm:mr-2" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Agregar Línea de Producto
                      </span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[90%] max-w-2xl max-h-[90vh] overflow-y-auto">
                    {loading && isEditMode ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm text-muted-foreground">Cargando línea de producto...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <DialogHeader>
                          <DialogTitle className="mb-2">{title}</DialogTitle>
                          <DialogDescription>{description}</DialogDescription>
                        </DialogHeader>
                        <Label htmlFor="name">
                          Nombre<span className="text-redLabel">*</span>
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          placeholder="ej. Platinum"
                          value={form.name}
                          onChange={handleForm}
                          maxLength={255}
                          required
                        />
                        <Label htmlFor="description">
                          Descripción<span className="text-redLabel">*</span>
                        </Label>
                        <Textarea
                          id="description"
                          name="description"
                          placeholder="ej. Línea premium"
                          value={form.description}
                          onChange={handleForm}
                          required
                        />
                        <div className="flex items-center justify-between">
                          <Label htmlFor="logoImgUrl">
                            Imagen<span className="text-redLabel">*</span>
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFilePickerOpen(true)}
                            type="button"
                          >
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Buscar en archivos
                          </Button>
                        </div>
                        <MyDropzone
                          file={image}
                          fileSetter={setImage}
                          type="image"
                          className="p-8 min-h-[200px]"
                          currentImageUrl={form.logoImgUrl && !image ? form.logoImgUrl : undefined}
                          onImageClick={() => {
                            if (form.logoImgUrl && !image) {
                              handlePreviewImage(form.logoImgUrl);
                            }
                          }}
                        />
                        <DialogDescription>
                          Formatos Válidos: .jpg, .png, .jpeg, .webp
                        </DialogDescription>
                        <DialogFooter>
                          <Button
                            disabled={!validateForm() || isSubmitting}
                            onClick={handleSubmit}
                            type="submit"
                          >
                            {isSubmitting ? "Guardando..." : isEditMode ? "Actualizar Línea de Producto" : "Agregar Línea de Producto"}
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
            </>
          }
        >
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Cargando...</p>
                </div>
              </div>
            ) : brands.length === 0 || filterBrands.length === 0 ? (
              <div className="mt-4">
                <NoData>
                  <AlertTriangle className="text-[#4E5154]" />
                  <p className="text-[#4E5154]">
                    No se ha encontrado ninguna línea de producto
                  </p>
                  <p className="text-[#94A3B8] font-semibold text-sm">
                    Agrega uno en la parte posterior
                  </p>
                </NoData>
              </div>
            ) : (
              <CardSectionLayout>
                {(filterBrands.length > 0 ? filterBrands : brands).map(
                  (brand) => (
                    <CardTemplate
                      key={brand.id}
                      brand={brand}
                      getBrandById={getBrandById}
                      getItems={getBrands}
                    />
                  )
                )}
              </CardSectionLayout>
            )}
        </DashboardPageShell>
      </Layout>
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

export default Marcas;
