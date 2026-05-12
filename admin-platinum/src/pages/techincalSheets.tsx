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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { Item } from "@/models/product";
import { Reference } from "@/models/reference";
import { TechnicalSheet } from "@/models/technicalSheet";
import { AlertTriangle, FileText, Loader2, PlusCircle, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import axiosClient from "@/services/axiosInstance";

export interface TSFormType {
  title: string;
  path?: string;
  url?: string;
  description: string;
  productIds: string[];
  references: string[];
}

const TsFormInitialState: TSFormType = {
  title: "",
  path: "",
  url: "",
  description: "",
  productIds: [],
  references: [],
};

const isAbortLikeError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { name?: string; code?: string };
  return (
    maybeError.name === "CanceledError" ||
    maybeError.code === "ERR_CANCELED" ||
    maybeError.name === "AbortError"
  );
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
  } = useTs();
  const getTechnicalSheetsRef = useRef(getTechnicalSheets);
  const { products } = useProducts();
  const { uploadFile, uploading } = useS3FileManager();
  const { toast } = useToast();

  const [searchFilter, setSearchFilter] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTsId, setEditingTsId] = useState<string | undefined>(undefined);
  const [tsForm, setTsForm] = useState<TSFormType>(TsFormInitialState);
  const [file, setFile] = useState<File | null>(null);
  const [referenceDraft, setReferenceDraft] = useState("");
  const [availableReferences, setAvailableReferences] = useState<string[]>([]);
  const [loadingReferences, setLoadingReferences] = useState(false);
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

  useEffect(() => {
    const abortController = new AbortController();
    const client = axiosClient();

    const fetchReferencesFromProducts = async () => {
      if (tsForm.productIds.length === 0) {
        setAvailableReferences([]);
        return;
      }

      setLoadingReferences(true);
      try {
        const responses = await Promise.all(
          tsForm.productIds.map((productId) =>
            client.get(`/references/product/${productId}`, {
              signal: abortController.signal,
            })
          )
        );

        const unique = new Set<string>();
        responses.forEach((response) => {
          const references: Reference[] = response.data?.references || [];
          references.forEach((ref) => {
            const value = [ref.referenceBrand?.trim(), ref.referenceNumber?.trim()]
              .filter(Boolean)
              .join(" ")
              .trim();
            if (value) unique.add(value);
          });
        });
        setAvailableReferences(Array.from(unique).sort((a, b) => a.localeCompare(b)));
      } catch (error: unknown) {
        if (!isAbortLikeError(error)) {
          console.error("Error loading references by products:", error);
          setAvailableReferences([]);
        }
      } finally {
        setLoadingReferences(false);
      }
    };

    fetchReferencesFromProducts();
    return () => {
      abortController.abort();
    };
  }, [tsForm.productIds]);

  const toggleModal = () => {
    setIsOpen(!isOpen);
    if (!isOpen && !isEditMode) {
      setTsForm({ ...TsFormInitialState, path: "" });
      setFile(null);
    }
  };

  useEffect(() => {
    if (file?.name && tsForm.path !== file.name) {
      setTsForm((prev) => ({ ...prev, path: file.name }));
    }
  }, [file, tsForm.path]);

  const validateForm = useMemo(
    () =>
      tsForm.title.trim() !== "" &&
      tsForm.description.trim() !== "" &&
      (file != null && (file as File).name != null && (file as File).name !== ""),
    [tsForm, file]
  );

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
        return;
      }
      if (!file || !(file instanceof File) || !file.name) {
        toast({
          title: "Sube el documento",
          description: "Selecciona un archivo PDF para el boletín.",
          variant: "destructive",
        });
        return;
      }
    }
    try {
      const normalizedReferences = Array.from(
        new Set((tsForm.references ?? []).map((value) => value.trim()).filter(Boolean))
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
        };
        await addTechnicalSheet(payload);
        setTsForm(TsFormInitialState);
        setFile(null);
        setIsEditMode(false);
        setIsOpen(false);
      } else if (isEditMode && editingTsId) {
        const current = technicalSheets.find((t) => t.id === editingTsId);
        const currentIds = new Set((current?.products || []).map((p) => p.id));
        const newIds = new Set(tsForm.productIds);
        const toAdd = tsForm.productIds.filter((id) => !currentIds.has(id));
        const toRemove = (current?.products || []).map((p) => p.id).filter((id) => !newIds.has(id));
        if (toAdd.length > 0) await addProductsToTechSheet(editingTsId, toAdd);
        if (toRemove.length > 0) await removeProductsFromTechSheet(editingTsId, toRemove);
        const currentReferences = Array.from(new Set((current?.references ?? []).map((v) => v.trim()))).sort();
        const nextReferences = normalizedReferences.slice().sort();
        if (JSON.stringify(currentReferences) !== JSON.stringify(nextReferences)) {
          await updateReferencesForTechSheet(editingTsId, normalizedReferences);
        }
        if (toAdd.length > 0 || toRemove.length > 0) {
          toast({ title: "Boletín actualizado.", variant: "success" });
        }
        setTsForm(TsFormInitialState);
        setEditingTsId(undefined);
        setIsEditMode(false);
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Error during file upload or submit:", error);
      toast({
        title: "Error al crear el boletín",
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

  const toggleProduct = (productId: string) => {
    setTsForm((prev) =>
      prev.productIds.includes(productId)
        ? { ...prev, productIds: prev.productIds.filter((id) => id !== productId) }
        : { ...prev, productIds: [...prev.productIds, productId] }
    );
  };

  const addReference = () => {
    const value = referenceDraft.trim();
    if (!value) return;
    setTsForm((prev) =>
      prev.references.includes(value)
        ? prev
        : { ...prev, references: [...prev.references, value] }
    );
    setReferenceDraft("");
  };

  const removeReference = (reference: string) => {
    setTsForm((prev) => ({
      ...prev,
      references: prev.references.filter((item) => item !== reference),
    }));
  };

  const toggleReference = (reference: string) => {
    setTsForm((prev) =>
      prev.references.includes(reference)
        ? { ...prev, references: prev.references.filter((item) => item !== reference) }
        : { ...prev, references: [...prev.references, reference] }
    );
  };

  // Al abrir edición desde la card se usa directamente los datos del ts (setTsForm + setIsOpen en TsCard)

  const handleSearchFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchFilter(e.target.value);
  };

  const listToShow = useMemo(() => {
    const query = searchFilter.trim().toLowerCase();
    if (!query) return technicalSheets;
    return technicalSheets.filter((ts: TechnicalSheet) => {
      const title = (ts.title || "").toLowerCase();
      const description = (ts.description || "").toLowerCase();
      const references = (ts.references || []).join(" ").toLowerCase();
      const products = (ts.products || [])
        .map((product) => `${product.name || ""} ${product.sku || ""}`)
        .join(" ")
        .toLowerCase();
      return (
        title.includes(query) ||
        description.includes(query) ||
        references.includes(query) ||
        products.includes(query)
      );
    });
  }, [technicalSheets, searchFilter]);

  const showInitialLoading = loading && !hasLoadedOnce;
  const showRefreshingOverlay = loading && hasLoadedOnce;

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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      Formatos permitidos: PDF, JPG y PNG. Tamaño maximo recomendado: 5 MB.
                    </p>
                    <MyDropzone
                      className="p-8"
                      file={file}
                      fileSetter={setFile}
                      type="document"
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

                {/* 2. Productos relacionados */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    Productos relacionados
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Selecciona los productos a los que aplica este boletín.
                  </p>
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                    {products.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No hay productos cargados.
                      </p>
                    ) : (
                      products.map((product: Item) => (
                        <label
                          key={product.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={tsForm.productIds.includes(product.id)}
                            onCheckedChange={() => toggleProduct(product.id)}
                          />
                          <span className="text-sm font-medium">{product.name}</span>
                          {product.variants?.[0]?.sku != null && (
                            <span className="text-xs text-muted-foreground">
                              SKU: {product.variants[0].sku}
                            </span>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                </section>

                <Separator />

                {/* 3. Referencias relacionadas */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    Referencias relacionadas
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Selecciona referencias sugeridas en base a los productos elegidos.
                  </p>
                  <div className="relative max-h-44 overflow-y-auto border rounded-lg p-3 space-y-2 min-h-24">
                    {tsForm.productIds.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Selecciona al menos un producto para ver referencias sugeridas.
                      </p>
                    ) : availableReferences.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        No se encontraron referencias para los productos seleccionados.
                      </p>
                    ) : (
                      availableReferences.map((reference) => (
                        <label
                          key={reference}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={tsForm.references.includes(reference)}
                            onCheckedChange={() => toggleReference(reference)}
                          />
                          <span className="text-sm">{reference}</span>
                        </label>
                      ))
                    )}
                    {loadingReferences && tsForm.productIds.length > 0 && (
                      <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Cargando referencias...
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tambien puedes agregar una referencia manualmente.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej. LuK 620309900"
                      value={referenceDraft}
                      onChange={(e) => setReferenceDraft(e.target.value)}
                    />
                    <Button type="button" variant="outline" onClick={addReference}>
                      Agregar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tsForm.references.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin referencias.</p>
                    ) : (
                      tsForm.references.map((reference) => (
                        <button
                          key={reference}
                          type="button"
                          className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
                          onClick={() => removeReference(reference)}
                        >
                          {reference} ×
                        </button>
                      ))
                    )}
                  </div>
                </section>

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
