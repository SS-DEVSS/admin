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
import { useS3FileManager } from "@/hooks/useS3FileManager";
import { useTs } from "@/hooks/useTs";
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { Item } from "@/models/product";
import { TechnicalSheet } from "@/models/technicalSheet";
import { AlertTriangle, FileText, PlusCircle, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export interface TSFormType {
  title: string;
  path?: string;
  url?: string;
  imgUrl?: string | null;
  description: string;
  productIds: string[];
  references: string[];
}

const TsFormInitialState: TSFormType = {
  title: "",
  path: "",
  url: "",
  imgUrl: null,
  description: "",
  productIds: [],
  references: [],
};

const TechincalSheets = () => {
  const {
    loading,
    technicalSheets,
    addTechnicalSheet,
    deleteTechnicalSheet,
    addProductsToTechSheet,
    removeProductsFromTechSheet,
    updateReferencesForTechSheet,
  } = useTs();
  const { products, getProducts } = useProducts();
  const { uploadFile } = useS3FileManager();
  const { toast } = useToast();

  const [searchFilter, setSearchFilter] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTsId, setEditingTsId] = useState<string | undefined>(undefined);
  const [tsForm, setTsForm] = useState<TSFormType>(TsFormInitialState);
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [referenceDraft, setReferenceDraft] = useState("");

  useEffect(() => {
    getProducts();
  }, [getProducts]);

  const toggleModal = () => {
    setIsOpen(!isOpen);
    if (!isOpen && !isEditMode) {
      setTsForm({ ...TsFormInitialState, path: "" });
      setFile(null);
      setImage(null);
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
      uploadFile(f, (key) => resolve(key)).catch(reject);
    });
  };

  const handleSubmit = async () => {
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
        const payload = {
          title: tsForm.title.trim(),
          path: fileKey,
          description: (tsForm.description ?? "").trim(),
          productIds: tsForm.productIds.length > 0 ? tsForm.productIds : undefined,
          references: tsForm.references.length > 0 ? tsForm.references : undefined,
        };
        await addTechnicalSheet(payload as any);
        setTsForm(TsFormInitialState);
        setFile(null);
        setImage(null);
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
        const currentReferences = current?.references ?? [];
        const nextReferences = tsForm.references ?? [];
        if (JSON.stringify(currentReferences) !== JSON.stringify(nextReferences)) {
          await updateReferencesForTechSheet(editingTsId, nextReferences);
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
    }
  };

  const handleForm = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Al abrir edición desde la card se usa directamente los datos del ts (setTsForm + setIsOpen en TsCard)

  const handleSearchFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchFilter(e.target.value);
  };

  const filteredTs = useMemo(
    () =>
      technicalSheets.filter((ts: TechnicalSheet) =>
        ts.title.toLowerCase().includes(searchFilter.toLowerCase())
      ),
    [searchFilter, technicalSheets]
  );

  const listToShow = searchFilter.length > 0 ? filteredTs : technicalSheets;

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
            <div className="relative flex-1 min-w-[200px] max-w-[336px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar boletín..."
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
                  setImage(null);
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
                  <div className="grid gap-4 sm:grid-cols-2">
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
                      <Input
                        id="description"
                        name="description"
                        placeholder="Breve descripción del boletín"
                        value={tsForm.description}
                        onChange={handleForm}
                        maxLength={526}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      <span className="text-red-500">*</span> Archivo (PDF o documento)
                    </Label>
                    <MyDropzone
                      className="p-8"
                      file={file}
                      fileSetter={setFile}
                      type="document"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Imagen de portada (opcional)</Label>
                    <MyDropzone
                      className="p-8"
                      file={image}
                      fileSetter={setImage}
                    />
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
                    Agrega referencias que quieras asociar al boletín.
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
                    disabled={loading}
                  >
                    {loading ? "Guardando..." : isEditMode ? "Actualizar boletín" : "Crear boletín"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col flex-grow p-0 mt-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Cargando...</p>
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
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default TechincalSheets;
