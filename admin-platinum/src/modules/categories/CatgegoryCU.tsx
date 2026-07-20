import MyDropzone from "@/components/Dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBrandContext } from "@/context/brand-context";
import { useBrands } from "@/hooks/useBrands";
import { useS3FileManager } from "@/hooks/useS3FileManager";
import {
  Category,
  CategoryAttributeApi,
  CategoryAtributes,
  normalizeCategoryAttributeFromApi,
} from "@/models/category";
import {
  ChevronLeft,
  PlusCircleIcon,
  XCircleIcon,
  Info,
  FolderOpen,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CardAtributesVariants from "./CardAtributesVariants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import Loader from "@/components/Loader";
import FilePickerModal from "@/components/files/FilePickerModal";
import SubcategoryTree from "./SubcategoryTree";

type CategoryCUProps = {
  category?: Category | null;
  addCategory?: (category: Omit<Category, "id">) => void;
  updateCategory?: (category: Category) => void | Promise<any>;
};

export interface formTypes {
  name: string;
  description: string;
  imgUrl: string;
  brands: string[];
  attributes: CategoryAtributes[];
}

const validateApplicationFilterRequiredPrefix = (
  attributes: CategoryAtributes[],
): boolean => {
  const applicationAttributes = attributes
    .filter((attr) => attr.scope === "APPLICATION")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  let sawOptional = false;
  for (const attribute of applicationAttributes) {
    const isRequired = attribute.filterRequired !== false;
    if (sawOptional && isRequired) return false;
    if (!isRequired) sawOptional = true;
  }
  return true;
};

const CategoryCU = ({
  category,
  addCategory,
  updateCategory,
}: CategoryCUProps) => {
  const { selectedBrand } = useBrandContext();
  const { brands } = useBrands();
  const { uploadFile, uploading } = useS3FileManager();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedBrandIds, setSelectedBrandIds] = useState<Set<string>>(
    new Set(),
  );
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>(category?.imgUrl || "");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [form, setForm] = useState<formTypes>({
    name: "",
    description: "",
    imgUrl: "",
    brands: [],
    attributes: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingStartTime, setSavingStartTime] = useState<number | null>(null);
  const [attributeConfirmOpen, setAttributeConfirmOpen] = useState(false);
  const pendingSubmitFormRef = useRef<formTypes | null>(null);
  const [brandSearchQuery, setBrandSearchQuery] = useState("");

  useEffect(() => {
    if (selectedBrand) {
      setSelectedBrandIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(selectedBrand);
        return newSet;
      });
      setForm({
        ...form,
        brands: [...form.brands, selectedBrand],
      });
    }
  }, []);

  useEffect(() => {
    if (category) {
      // Transformar attributes si viene como objeto (CategoryResponse) a array plano
      let attributesArray: CategoryAtributes[] = [];
      if (category.attributes) {
        if (Array.isArray(category.attributes)) {
          attributesArray = category.attributes.map(
            normalizeCategoryAttributeFromApi,
          );
        } else if (typeof category.attributes === "object") {
          const attrsObj = category.attributes as {
            product?: CategoryAttributeApi[];
            variant?: CategoryAttributeApi[];
            reference?: CategoryAttributeApi[];
            application?: CategoryAttributeApi[];
          };
          attributesArray = [
            ...(attrsObj.product || []),
            ...(attrsObj.variant || []),
            ...(attrsObj.reference || []),
            ...(attrsObj.application || []),
          ].map((a) => normalizeCategoryAttributeFromApi(a));
        }
      }

      setForm({
        ...category,
        brands:
          category.brands
            ?.map((b) => b.id)
            .filter((id): id is string => !!id) || [],
        attributes: attributesArray,
      });
      // No establecer image.name con la URL, solo imageUrl
      // Set image to null so MyDropzone can display currentImageUrl
      setImage(null);
      setImageUrl(category.imgUrl || "");
      const tempSet = new Set();

      category.brands!.forEach((brand) => {
        if (brand.id) {
          tempSet.add(brand.id);
        }
      });
      setSelectedBrandIds(tempSet as Set<string>);
    }
  }, [category]);

  // Update imageUrl when image is uploaded
  useEffect(() => {
    if (
      image &&
      image.name &&
      image.name !== category?.imgUrl &&
      image instanceof File
    ) {
      uploadFile(image, (_key: string, location: string) => {
        setImageUrl(location);
        setForm((prevForm) => ({
          ...prevForm,
          imgUrl: location,
        }));
      });
    }
  }, [image]);

  const handlePreviewImage = (url: string) => {
    setPreviewImageUrl(url);
    setPreviewDialogOpen(true);
  };

  const handleDeleteImage = async () => {
    if (!category?.id) {
      toast({
        title: "Error",
        variant: "destructive",
        description: "No se puede eliminar la imagen sin un ID de categoría",
      });
      return;
    }

    try {
      // Limpiar la imagen del estado
      setImageUrl("");
      setImage({ name: "" } as File);
      setForm((prevForm) => ({
        ...prevForm,
        imgUrl: "",
      }));

      toast({
        title: "Imagen eliminada correctamente",
        variant: "success",
        description: "La imagen se eliminará al guardar los cambios",
      });
    } catch (error: any) {
      toast({
        title: "Error al eliminar imagen",
        variant: "destructive",
        description:
          error.response?.data?.error || error.message || "Error desconocido",
      });
    }
  };

  const handleFileSelect = (fileUrl: string) => {
    setImage(null);
    setImageUrl(fileUrl);
    setForm((prevForm) => ({
      ...prevForm,
      imgUrl: fileUrl,
    }));
  };

  useEffect(() => {
    if (image?.name && image.name !== form.imgUrl) {
      setForm({
        ...form,
        imgUrl: image.name,
      });
    }
  }, [image]);

  const handleFormInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });
  };

  const toggleBrandSelection = (brandId: string) => {
    const isSelected = selectedBrandIds.has(brandId);
    const newSet = new Set(selectedBrandIds);
    if (isSelected) {
      newSet.delete(brandId);
      setForm((f) => ({
        ...f,
        brands: f.brands.filter((id) => id !== brandId),
      }));
    } else {
      newSet.add(brandId);
      setForm((f) => ({ ...f, brands: [...f.brands, brandId] }));
    }
    setSelectedBrandIds(newSet);
  };

  const validateForm = useMemo(() => {
    // Validación básica: nombre y descripción siempre requeridos
    const basicValidation =
      form.name.trim() !== "" && form.description.trim() !== "";

    // Si es una categoría nueva, requiere imagen, brands y attributes
    if (!category) {
      return (
        basicValidation &&
        (form.imgUrl?.trim() !== "" || imageUrl?.trim() !== "") &&
        form.brands.length > 0 &&
        form.attributes.length > 0
      );
    }

    // Si es edición, solo requiere nombre y descripción
    // La imagen puede estar vacía si se eliminó, pero eso se maneja en el submit
    return basicValidation;
  }, [form, category, imageUrl]);

  const handleSubmit = async (
    form: formTypes,
    options?: { skipAttributeConfirm?: boolean },
  ) => {
    let abortedForAttributeConfirm = false;
    try {
      if (!validateApplicationFilterRequiredPrefix(form.attributes)) {
        toast({
          title: "Configuración de filtros inválida",
          description:
            "Los filtros requeridos en web deben ser consecutivos desde el primero. No puede haber un filtro requerido después de uno opcional.",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);
      setSavingStartTime(Date.now());
      if (category && updateCategory) {
        // Editing existing category - formato según Postman
        const originalBrandIds =
          category.brands
            ?.map((b) => b.id)
            .filter((id): id is string => !!id) || [];
        const currentBrandIds = form.brands;
        const brandsToAdd = currentBrandIds.filter(
          (id) => !originalBrandIds.includes(id),
        );
        const brandsToDelete = originalBrandIds.filter(
          (id) => !currentBrandIds.includes(id),
        );

        // Transformar attributes de objeto a array si es necesario
        let originalAttributesArray: CategoryAtributes[] = [];
        if (category.attributes) {
          if (Array.isArray(category.attributes)) {
            originalAttributesArray = category.attributes;
          } else if (typeof category.attributes === "object") {
            // Es un objeto con product, variant, application, etc.
            const attrsObj = category.attributes as any;
            originalAttributesArray = [
              ...(attrsObj.product || []),
              ...(attrsObj.variant || []),
              ...(attrsObj.reference || []),
              ...(attrsObj.application || []),
            ];
          }
        }

        const originalAttributeIds = originalAttributesArray
          .map((attr) => attr.id)
          .filter((id): id is string => !!id);
        const currentAttributeIds = form.attributes
          .map((attr) => attr.id)
          .filter((id): id is string => !!id);
        const attributesToAdd = form.attributes
          .filter((attr) => !attr.id || !originalAttributeIds.includes(attr.id))
          .map((attr) => ({
            name: attr.display_name || attr.name,
            csvName: attr.csv_name || attr.name,
            displayName: attr.display_name || attr.name,
            type: attr.type,
            required: attr.required,
            order: attr.order,
            scope: attr.scope.toLowerCase(),
            visibleInCatalog: attr.visibleInCatalog ?? true,
            visibleInProductDetail: attr.visibleInProductDetail ?? true,
            ...(attr.scope === "APPLICATION"
              ? { filterRequired: attr.filterRequired !== false }
              : {}),
          }));
        const attributesToDelete = originalAttributeIds.filter(
          (id) => !currentAttributeIds.includes(id),
        );

        const attributesToUpdate = form.attributes
          .filter(
            (attr): attr is CategoryAtributes & { id: string } =>
              !!attr.id && originalAttributeIds.includes(attr.id),
          )
          .map((attr) => {
            const rawOrig = originalAttributesArray.find(
              (a) => a.id === attr.id,
            );
            if (!rawOrig) return null;
            const orig = normalizeCategoryAttributeFromApi(
              rawOrig as CategoryAttributeApi,
            );
            const formDisplay = (attr.display_name || "").trim();
            const origDisplay = (orig.display_name || orig.name || "").trim();
            const formCsv = (attr.csv_name || "").trim();
            const origCsv = (orig.csv_name || "").trim();
            const typeMatch =
              String(attr.type).toLowerCase() ===
              String(orig.type).toLowerCase();
            const catalogMatch =
              (attr.visibleInCatalog ?? true) ===
              (orig.visibleInCatalog ?? true);
            const detailMatch =
              (attr.visibleInProductDetail ?? true) ===
              (orig.visibleInProductDetail ?? true);
            const filterRequiredMatch =
              attr.scope !== "APPLICATION" ||
              (attr.filterRequired !== false) ===
                (orig.filterRequired !== false);
            if (
              formDisplay === origDisplay &&
              formCsv === origCsv &&
              attr.required === orig.required &&
              typeMatch &&
              attr.order === orig.order &&
              attr.scope === orig.scope &&
              catalogMatch &&
              detailMatch &&
              filterRequiredMatch
            ) {
              return null;
            }
            const label =
              (attr.display_name || attr.name || orig.name || "").trim() ||
              orig.name;
            return {
              id: attr.id,
              name: label,
              csvName: attr.csv_name || orig.csv_name,
              displayName: attr.display_name || orig.display_name,
              type: attr.type,
              required: attr.required,
              order: attr.order,
              scope: attr.scope.toLowerCase(),
              visibleInCatalog: attr.visibleInCatalog ?? true,
              visibleInProductDetail: attr.visibleInProductDetail ?? true,
              ...(attr.scope === "APPLICATION"
                ? { filterRequired: attr.filterRequired !== false }
                : {}),
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        const updatePayload: Record<string, unknown> = {
          name: form.name,
          description: form.description,
          imgUrl: imageUrl || category.imgUrl, // Usar imageUrl si está disponible, sino la original
        };

        if (brandsToAdd.length > 0 || brandsToDelete.length > 0) {
          const brandsUpdate: { add?: string[]; remove?: string[] } = {};
          if (brandsToAdd.length > 0) {
            brandsUpdate.add = brandsToAdd;
          }
          if (brandsToDelete.length > 0) {
            brandsUpdate.remove = brandsToDelete;
          }
          updatePayload.brands = brandsUpdate;
        }

        if (
          attributesToAdd.length > 0 ||
          attributesToDelete.length > 0 ||
          attributesToUpdate.length > 0
        ) {
          updatePayload.attributes = {};
          if (attributesToAdd.length > 0) {
            (updatePayload.attributes as { add: unknown[] }).add =
              attributesToAdd;
          }
          if (attributesToUpdate.length > 0) {
            (updatePayload.attributes as { update: unknown[] }).update =
              attributesToUpdate;
          }
          if (attributesToDelete.length > 0) {
            (updatePayload.attributes as { delete: string[] }).delete =
              attributesToDelete;
          }
        }

        const hasAttributeChanges =
          attributesToAdd.length > 0 ||
          attributesToDelete.length > 0 ||
          attributesToUpdate.length > 0;

        if (hasAttributeChanges && !options?.skipAttributeConfirm) {
          pendingSubmitFormRef.current = form;
          setAttributeConfirmOpen(true);
          abortedForAttributeConfirm = true;
          return;
        }

        // Si hay una nueva imagen (File object), subirla primero
        if (
          image &&
          image instanceof File &&
          image.name &&
          image.name !== category.imgUrl
        ) {
          await new Promise<void>((resolve, reject) => {
            uploadFile(image, async (_, location) => {
              try {
                const response = await updateCategory({
                  id: category.id, // El ID va en el objeto Category para la URL
                  ...updatePayload,
                  imgUrl: location,
                } as any);
                if (response) {
                  navigate("/dashboard/categorias");
                }
                resolve();
              } catch (error) {
                reject(error);
              }
            });
          });
        } else {
          // Si no hay nueva imagen, actualizar directamente
          // Si imageUrl está vacío, significa que se eliminó la imagen
          if (!imageUrl && category.imgUrl) {
            updatePayload.imgUrl = null;
          }
          const response = await updateCategory({
            id: category.id, // El ID va en el objeto Category para la URL
            ...updatePayload,
          } as any);
          if (response) {
            navigate("/dashboard/categorias");
          }
        }
      } else if (addCategory && image) {
        // Creating new category - formato según Postman
        await new Promise<void>((resolve, reject) => {
          uploadFile(image, async (_, location) => {
            try {
              const createPayload = {
                name: form.name,
                description: form.description,
                imgUrl: location,
                brands: form.brands, // Array de strings (IDs)
                attributes: form.attributes.map((attr) => ({
                  name: attr.display_name || attr.name,
                  csvName: attr.csv_name || attr.name,
                  displayName: attr.display_name || attr.name,
                  type: attr.type,
                  required: attr.required,
                  order: attr.order,
                  scope: attr.scope,
                  visibleInCatalog: attr.visibleInCatalog ?? true,
                  visibleInProductDetail: attr.visibleInProductDetail ?? true,
                  ...(attr.scope === "APPLICATION"
                    ? { filterRequired: attr.filterRequired !== false }
                    : {}),
                })),
              };

              const response = (await addCategory(createPayload as any)) as
                | { id: string }
                | undefined;
              if (response && response.id) {
                navigate("/dashboard/categorias");
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });
      }
    } catch (error: any) {
      // Error handling - el error ya se maneja en updateCategory/addCategory
    } finally {
      if (abortedForAttributeConfirm) {
        setIsSubmitting(false);
        setSavingStartTime(null);
      } else {
        // Ensure loader is shown for at least 800ms for better UX
        const elapsed = savingStartTime ? Date.now() - savingStartTime : 0;
        const minDisplayTime = 800;
        const remainingTime = Math.max(0, minDisplayTime - elapsed);

        setTimeout(() => {
          setIsSubmitting(false);
          setSavingStartTime(null);
        }, remainingTime);
      }
    }
  };

  const handleConfirmAttributeSave = async () => {
    const pending = pendingSubmitFormRef.current;
    pendingSubmitFormRef.current = null;
    setAttributeConfirmOpen(false);
    if (pending) {
      await handleSubmit(pending, { skipAttributeConfirm: true });
    }
  };

  return (
    <>
      {isSubmitting && <Loader fullScreen message="Guardando cambios..." />}
      <AlertDialog
        open={attributeConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            pendingSubmitFormRef.current = null;
            setAttributeConfirmOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambios en atributos</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Los cambios en atributos (producto o aplicación) no se pueden
              deshacer. Si eliminas un atributo, se borrarán todos los valores
              guardados en productos y aplicaciones de esta categoría. Cambiar
              tipo u orden puede afectar datos ya cargados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                void handleConfirmAttributeSave();
              }}
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <main className="max-w-4xl mx-auto px-0 md:px-6">
        <header className="flex justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Volver"
              onClick={() =>
                window.history.length > 1
                  ? navigate(-1)
                  : navigate("/dashboard/categorias")
              }
            >
              <Card className="p-2 cursor-pointer transition-colors hover:bg-muted">
                <ChevronLeft className="h-4 w-4" />
              </Card>
            </button>
            <p className="text-2xl font-semibold leading-none tracking-tight">
              {!category ? "Nueva Categoría" : `${category.name}`}
            </p>
          </div>
        </header>
        <section>
          <section className="mt-4 flex flex-col gap-3 w-full">
            <Card x-chunk="dashboard-07-chunk-0" className="w-full">
              <CardHeader>
                <CardTitle>Detalles</CardTitle>
                <CardDescription>
                  Ingrese la información deseada de la categoría.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="name">Nombre</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              El nombre de la categoría que se mostrará en el
                              sistema
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      className="w-full"
                      placeholder="Clutch, Frenos..."
                      onChange={handleFormInput}
                      value={form.name}
                      maxLength={255}
                    />
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="description">Descripción</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Una descripción breve de la categoría y su
                              propósito
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Lorem ipsum dolor sit amet."
                      onChange={handleFormInput}
                      value={form.description}
                      className="min-h-20"
                      maxLength={255}
                    />
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-2">
                      <Label>Marcas asociadas</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Las marcas asociadas a esta categoría. Los
                              productos de estas marcas podrán usar esta
                              categoría como template.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center border rounded-md p-3 min-h-12 bg-muted/30">
                      {[...selectedBrandIds].map((id) => {
                        const brand = brands.find((b) => b.id === id);
                        return brand ? (
                          <Badge
                            key={brand.id}
                            className="text-sm font-medium px-4 py-2 flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                          >
                            <span className="capitalize">
                              {brand.name.toLowerCase()}
                            </span>
                            <XCircleIcon
                              onClick={() => toggleBrandSelection(brand.id!)}
                              className="h-3.5 w-3.5 hover:scale-110 transition-transform"
                            />
                          </Badge>
                        ) : null;
                      })}
                      <Input
                        placeholder="Buscar y agregar marca..."
                        value={brandSearchQuery}
                        onChange={(e) => setBrandSearchQuery(e.target.value)}
                        className="flex-1 min-w-[180px] border-0 bg-transparent shadow-none focus-visible:ring-0"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Selecciona las marcas a asociar con esta categoría.
                    </p>
                    {(() => {
                      const unselectedBrands = brands.filter(
                        (b) =>
                          !selectedBrandIds.has(b.id!) &&
                          b.name
                            ?.toLowerCase()
                            .includes(brandSearchQuery.trim().toLowerCase()),
                      );
                      if (unselectedBrands.length === 0) return null;
                      return (
                        <section className="flex gap-2 flex-wrap">
                          {unselectedBrands.map((brand) => (
                            <Badge
                              key={brand.id}
                              variant="secondary"
                              className="text-sm font-medium px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-secondary/80"
                              onClick={() => toggleBrandSelection(brand.id!)}
                            >
                              <span className="capitalize">
                                {brand.name.toLowerCase()}
                              </span>
                              <PlusCircleIcon className="h-3.5 w-3.5" />
                            </Badge>
                          ))}
                        </section>
                      );
                    })()}
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="image">Imagen*</Label>
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
                    <div className="relative">
                      <MyDropzone
                        file={image}
                        fileSetter={setImage}
                        type="image"
                        className="p-8 min-h-[200px] border-2 border-dashed border-gray-200 rounded-lg bg-white"
                        currentImageUrl={
                          imageUrl && !image ? imageUrl : undefined
                        }
                        onImageClick={() => {
                          if (imageUrl && !image) {
                            handlePreviewImage(imageUrl);
                          }
                        }}
                        emptyTextStyle={"reference"}
                      />
                      {imageUrl && !image && category?.id && (
                        <div className="mt-3 flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewImage(imageUrl)}
                            type="button"
                          >
                            Previsualizar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteImage}
                            disabled={uploading}
                            type="button"
                          >
                            Eliminar imagen
                          </Button>
                        </div>
                      )}
                    </div>
                    {uploading && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Subiendo imagen...
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            {category?.id && (
              <div className="w-full min-w-0">
                <SubcategoryTree
                  categoryId={category.id}
                  categoryName={category.name ?? ""}
                />
              </div>
            )}
          </section>
        </section>
        <section className="mt-4 flex flex-col gap-3 w-full pb-24">
          {category?.id ? (
            <Alert variant="warning">
              <AlertDescription>
                Al guardar, los cambios en atributos de producto o aplicación no
                se pueden deshacer. Quitar un atributo elimina todos los valores
                guardados en productos y aplicaciones de esta categoría. Los
                atributos nuevos aparecen vacíos hasta completarlos en cada
                registro.
              </AlertDescription>
            </Alert>
          ) : null}
          <CardAtributesVariants
            form={form}
            setForm={setForm}
            title={"Atributos de Producto"}
            description={
              "Ingresa los atributos de producto para esta categoría"
            }
          />
          <CardAtributesVariants
            form={form}
            setForm={setForm}
            title={"Atributos de Aplicaciones"}
            description={
              "Ingresa los atributos de aplicación para esta categoría"
            }
          />
        </section>
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
      </main>
      <section className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex justify-end gap-3">
          <Button
            variant={"outline"}
            type="button"
            onClick={() =>
              window.history.length > 1
                ? navigate(-1)
                : navigate("/dashboard/categorias")
            }
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!validateForm || isSubmitting || attributeConfirmOpen}
            className="h-10 px-6 gap-1"
            onClick={() => handleSubmit(form)}
          >
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </section>
    </>
  );
};

export default CategoryCU;
