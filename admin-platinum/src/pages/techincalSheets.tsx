import MyDropzone from "@/components/Dropzone";
import CardSectionLayout from "@/components/Layouts/CardSectionLayout";
import Layout from "@/components/Layouts/Layout";
import NoData from "@/components/NoData";
import TsCard from "@/components/TsCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useS3FileManager } from "@/hooks/useS3FileManager";
import { useTs } from "@/hooks/useTs";
import { useToast } from "@/hooks/use-toast";
import RelatedLinksEditor from "@/components/products/RelatedLinksEditor";
import { TechnicalSheet } from "@/models/technicalSheet";
import { AlertTriangle, FileText, Loader2, PlusCircle, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export interface TSFormType {
  title: string;
  path?: string;
  url?: string;
  description: string;
  productIds: string[];
  references: string[];
  applications: string[];
}

const TsFormInitialState: TSFormType = {
  title: "",
  path: "",
  url: "",
  description: "",
  productIds: [],
  references: [],
  applications: [],
};

const getExistingDocumentName = (form: TSFormType): string | undefined => {
  const path = form.path?.trim();
  if (path && !path.startsWith("http")) {
    const segment = path.split("/").pop();
    if (segment) return segment;
  }

  const url = form.url?.trim();
  if (url) {
    try {
      const pathname = new URL(url).pathname;
      const name = pathname.split("/").pop();
      if (name) return decodeURIComponent(name);
    } catch {
      const last = url.split("/").pop()?.split("?")[0];
      if (last) return decodeURIComponent(last);
    }
  }

  if (form.title?.trim()) return `${form.title.trim()}.pdf`;
  return undefined;
};

const TechincalSheets = () => {
  const {
    loading,
    technicalSheets,
    addTechnicalSheet,
    getTechnicalSheets,
    deleteTechnicalSheet,
    addProductsToTechSheet,
    removeProductsFromTechSheet,
    updateReferencesForTechSheet,
    updateApplicationsForTechSheet,
    updateTechnicalSheet,
  } = useTs();
  const getTechnicalSheetsRef = useRef(getTechnicalSheets);
  const { uploadFile, uploading } = useS3FileManager();
  const { toast } = useToast();

  const [searchFilter, setSearchFilter] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTsId, setEditingTsId] = useState<string | undefined>(undefined);
  const [tsForm, setTsForm] = useState<TSFormType>(TsFormInitialState);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    getTechnicalSheetsRef.current = getTechnicalSheets;
  }, [getTechnicalSheets]);

  useEffect(() => {
    getTechnicalSheetsRef.current().catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [loading, hasLoadedOnce]);

  const toggleModal = () => {
    setIsOpen(!isOpen);
    if (!isOpen && !isEditMode) {
      setTsForm({ ...TsFormInitialState, path: "" });
      setFile(null);
    }
  };

  useEffect(() => {
    if (!isEditMode && file?.name && tsForm.path !== file.name) {
      setTsForm((prev) => ({ ...prev, path: file.name }));
    }
  }, [file, tsForm.path, isEditMode]);

  const validateForm = useMemo(
    () =>
      tsForm.title.trim() !== "" &&
      tsForm.description.trim() !== "" &&
      (file != null && (file as File).name != null && (file as File).name !== ""),
    [tsForm, file]
  );

  const selectedProductLabelsForEdit = useMemo(() => {
    if (!isEditMode || !editingTsId) return undefined;
    const ts = technicalSheets.find((item) => item.id === editingTsId);
    if (!ts?.products?.length) return undefined;

    const labels: Record<string, string> = {};
    for (const product of ts.products) {
      if (!product.id) continue;
      const sku = product.sku?.trim();
      const name = product.name?.trim();
      labels[product.id] = sku || name || product.id;
    }
    return labels;
  }, [isEditMode, editingTsId, technicalSheets]);

  const handleFileUpload = async (
    f: File | null
  ): Promise<string | null> => {
    if (!f || !f.name) return null;
    return new Promise((resolve, reject) => {
      uploadFile(f, (key) => resolve(key), { destination: "document" }).catch(reject);
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (!isEditMode) {
      if (!validateForm) {
        toast({
          title: "Completa los campos obligatorios",
          description: "Título, descripción y documento (PDF) son requeridos.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      if (!file || !(file instanceof File) || !file.name) {
        toast({
          title: "Sube el documento",
          description: "Selecciona un archivo PDF para el boletín.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
    } else if (!tsForm.title.trim() || !tsForm.description.trim()) {
      toast({
        title: "Completa los campos obligatorios",
        description: "Título y descripción son requeridos.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    try {
      const normalizedReferences = Array.from(
        new Set((tsForm.references ?? []).map((value) => value.trim()).filter(Boolean))
      );
      const normalizedApplications = Array.from(
        new Set((tsForm.applications ?? []).map((value) => value.trim()).filter(Boolean))
      );

      if (!isEditMode) {
        const fileKey = await handleFileUpload(file);
        if (!fileKey || fileKey.trim() === "") {
          toast({
            title: "Error al subir el documento",
            description: "No se pudo subir el archivo. Intenta de nuevo.",
            variant: "destructive",
          });
          return;
        }
        const payload: Parameters<typeof addTechnicalSheet>[0] = {
          title: tsForm.title.trim(),
          path: fileKey,
          description: (tsForm.description ?? "").trim(),
          productIds: tsForm.productIds.length > 0 ? tsForm.productIds : undefined,
          references: normalizedReferences.length > 0 ? normalizedReferences : undefined,
          applications: normalizedApplications.length > 0 ? normalizedApplications : undefined,
        };
        await addTechnicalSheet(payload);
        setTsForm(TsFormInitialState);
        setFile(null);
        setIsEditMode(false);
        setIsOpen(false);
      } else if (isEditMode && editingTsId) {
        const current = technicalSheets.find((t) => t.id === editingTsId);
        const updatePayload: Parameters<typeof updateTechnicalSheet>[1] = {
          title: tsForm.title.trim(),
          description: (tsForm.description ?? "").trim(),
        };

        const hasNewDocument = file instanceof File && file.size > 0;
        if (hasNewDocument) {
          const fileKey = await handleFileUpload(file);
          if (!fileKey || fileKey.trim() === "") {
            toast({
              title: "Error al subir el documento",
              description: "No se pudo subir el archivo. Intenta de nuevo.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
          updatePayload.path = fileKey;
        }

        const titleChanged = updatePayload.title !== (current?.title ?? "").trim();
        const descriptionChanged =
          updatePayload.description !== (current?.description ?? "").trim();
        const pathChanged =
          updatePayload.path !== undefined && updatePayload.path !== (current?.path ?? "");

        if (titleChanged || descriptionChanged || pathChanged) {
          const updated = await updateTechnicalSheet(editingTsId, updatePayload);
          if (!updated) {
            throw new Error("No se pudo actualizar el boletín");
          }
        }

        const currentIds = new Set((current?.products || []).map((p) => p.id));
        const newIds = new Set(tsForm.productIds);
        const toAdd = tsForm.productIds.filter((id) => !currentIds.has(id));
        const toRemove = (current?.products || []).map((p) => p.id).filter((id) => !newIds.has(id));
        if (toAdd.length > 0) await addProductsToTechSheet(editingTsId, toAdd, { silent: true });
        if (toRemove.length > 0) await removeProductsFromTechSheet(editingTsId, toRemove, { silent: true });

        const currentReferences = Array.from(new Set((current?.references ?? []).map((v) => v.trim()))).sort();
        const nextReferences = normalizedReferences.slice().sort();
        if (JSON.stringify(currentReferences) !== JSON.stringify(nextReferences)) {
          await updateReferencesForTechSheet(editingTsId, normalizedReferences, { silent: true });
        }

        const currentApplications = Array.from(new Set((current?.applications ?? []).map((v) => v.trim()))).sort();
        const nextApplications = normalizedApplications.slice().sort();
        if (JSON.stringify(currentApplications) !== JSON.stringify(nextApplications)) {
          await updateApplicationsForTechSheet(editingTsId, normalizedApplications, { silent: true });
        }

        toast({ title: "Boletín actualizado.", variant: "success" });
        setTsForm(TsFormInitialState);
        setEditingTsId(undefined);
        setFile(null);
        setIsEditMode(false);
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Error during file upload or submit:", error);
      toast({
        title: isEditMode ? "Error al actualizar el boletín" : "Error al crear el boletín",
        description: "Revisa los datos e intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForm = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTsForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRelatedLinksChange = (next: {
    productIds: string[];
    references: string[];
    applications: string[];
  }) => {
    setTsForm((prev) => ({
      ...prev,
      productIds: next.productIds,
      references: next.references,
      applications: next.applications,
    }));
  };

  const listToShow = useMemo(() => {
    const query = searchFilter.trim().toLowerCase();
    if (!query) return technicalSheets;
    return technicalSheets.filter((ts: TechnicalSheet) => {
      const title = (ts.title || "").toLowerCase();
      const description = (ts.description || "").toLowerCase();
      const references = (ts.references || []).join(" ").toLowerCase();
      const applications = (ts.applications || []).join(" ").toLowerCase();
      const products = (ts.products || [])
        .map((product) => `${product.name || ""} ${product.sku || ""}`)
        .join(" ")
        .toLowerCase();
      return (
        title.includes(query) ||
        description.includes(query) ||
        references.includes(query) ||
        applications.includes(query) ||
        products.includes(query)
      );
    });
  }, [technicalSheets, searchFilter]);

  const showInitialLoading = loading && !hasLoadedOnce;
  const showRefreshingOverlay = loading && hasLoadedOnce;

  const handleSearchFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchFilter(e.target.value);
  };

  return (
    <Layout>
      <Card className="border-0 shadow-none flex flex-col">
        <CardHeader className="flex flex-row flex-wrap items-start gap-4 p-0 m-0">
          <div className="flex flex-col gap-3">
            <CardTitle>Boletines</CardTitle>
            <CardDescription>
              Gestiona los boletines técnicos y asígnalos a productos.
            </CardDescription>
            {!loading ? (
              <p className="text-sm text-muted-foreground">
                {listToShow.length} {listToShow.length === 1 ? "boletín" : "boletines"} en vista
              </p>
            ) : null}
          </div>
          <div className="ml-auto flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[260px] max-w-[520px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por boletín, producto, numero de parte o referencia..."
                onChange={handleSearchFilter}
                value={searchFilter}
                className="w-full rounded-lg bg-background pl-8"
              />
            </div>
            <Dialog
              open={isOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setTsForm(TsFormInitialState);
                  setIsEditMode(false);
                  setEditingTsId(undefined);
                  setFile(null);
                }
                setIsOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="h-10 px-6 gap-1"
                  onClick={toggleModal}
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-2" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Crear boletín
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-x-hidden overflow-y-auto sm:w-full">
                <DialogHeader>
                  <DialogTitle>
                    {isEditMode ? "Editar boletín" : "Nuevo boletín"}
                  </DialogTitle>
                  <DialogDescription>
                    Sube el documento y asigna los productos relacionados.
                  </DialogDescription>
                </DialogHeader>

                {/* 1. Documento */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    Documento
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">
                        <span className="text-red-500">*</span> Título
                      </Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="Ej. Ficha técnica motor XYZ"
                        value={tsForm.title}
                        onChange={handleForm}
                        maxLength={255}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">
                        <span className="text-red-500">*</span> Descripción
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Describe el contenido del boletín..."
                        value={tsForm.description}
                        onChange={handleForm}
                        maxLength={526}
                        rows={5}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      <span className="text-red-500">*</span> Archivo (PDF o documento)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Formatos permitidos: PDF, JPG y PNG. Tamaño maximo recomendado: 70 MB.
                      {isEditMode
                        ? " Deja vacío para conservar el documento actual; elige un archivo solo si deseas reemplazarlo."
                        : null}
                    </p>
                    <MyDropzone
                      className="p-8"
                      file={file}
                      fileSetter={setFile}
                      type="document"
                      currentDocumentName={
                        isEditMode && !file ? getExistingDocumentName(tsForm) : undefined
                      }
                    />
                    {(uploading || isSubmitting) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {uploading
                          ? "Subiendo archivo del boletin..."
                          : "Guardando boletin..."}
                      </div>
                    )}
                  </div>
                </section>

                <Separator />

                <RelatedLinksEditor
                  relatedLinks={{
                    productIds: tsForm.productIds,
                    references: tsForm.references,
                    applications: tsForm.applications,
                  }}
                  onChange={handleRelatedLinksChange}
                  selectedProductLabels={selectedProductLabelsForEdit}
                  hydrateSessionKey={isEditMode ? editingTsId : undefined}
                  productPickerLabel="Productos relacionados"
                  productPickerEmptyMessage="Sin productos asociados."
                  sectionCards
                  productSearchVariant="combobox"
                  referenceSearchVariant="combobox"
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || isSubmitting || uploading}
                  >
                    {uploading
                      ? "Subiendo archivo..."
                      : isSubmitting || loading
                        ? "Guardando..."
                        : isEditMode
                          ? "Actualizar boletín"
                          : "Crear boletín"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col flex-grow p-0 mt-4">
          {showInitialLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando boletines...</p>
              </div>
            </div>
          ) : listToShow.length === 0 ? (
            <div className="mt-4">
              <NoData>
                <AlertTriangle className="text-[#4E5154]" />
                <p className="text-[#4E5154]">No hay boletines creados</p>
                <p className="text-[#94A3B8] font-semibold text-sm">
                  Usa el botón &quot;Crear boletín&quot; para agregar uno
                </p>
              </NoData>
            </div>
          ) : (
            <div className="relative min-h-[220px]">
              <CardSectionLayout>
                {listToShow.map((ts: TechnicalSheet) => (
                  <TsCard
                    key={ts.id}
                    ts={ts}
                    deleteTechnicalSheet={deleteTechnicalSheet}
                    setIsEditMode={setIsEditMode}
                    setTsForm={setTsForm}
                    setIsOpen={setIsOpen}
                    setEditingTsId={setEditingTsId}
                    setFile={setFile}
                  />
                ))}
              </CardSectionLayout>
              {showRefreshingOverlay && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[1px] rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Actualizando boletines...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default TechincalSheets;
