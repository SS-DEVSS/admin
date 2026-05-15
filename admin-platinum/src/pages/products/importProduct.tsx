import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "@/components/Layouts/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, File, BarChart3, Loader2 } from "lucide-react";
import { useCategoryContext } from "@/context/categories-context";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useDropzone } from "react-dropzone";
import { useToast } from "@/hooks/use-toast";
import { useImportContext } from "@/context/import-context";
import { useImportPreview } from "@/hooks/useImportPreview";
import ColumnMappingDialog from "@/components/importJobs/ColumnMappingDialog";

type ImportType = "products" | "references" | "applications";

const ImportProduct = () => {
  const navigate = useNavigate();
  const { categories } = useCategoryContext();
  const { toast } = useToast();
  const { startImport, importState } = useImportContext();

  const [importType, setImportType] = useState<ImportType | "">("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [columnMapping, setColumnMapping] = useState<{ [csvColumn: string]: string | null } | null>(null);

  const { preview, loading: previewLoading, fetchPreview, clearPreview } = useImportPreview();

  useEffect(() => {
    setFile(null);
    setColumnMapping(null);
    clearPreview();
  }, [categoryId, importType, clearPreview]);

  const onDrop = async (acceptedFiles: File[]) => {
    // Don't allow file drop if import type or category is not selected
    if (!importType || !categoryId) {
      toast({
        title: "Error",
        description: "Selecciona la categoría y el tipo de importación primero.",
        variant: "destructive",
      });
      return;
    }

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile);

        // Fetch preview since import type and category are already selected
        try {
          await fetchPreview(selectedFile, importType, categoryId);
          setShowMappingDialog(true);
        } catch (error) {
          toast({
            title: "Error",
            description: "No se pudo obtener la vista previa del archivo.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Por favor, selecciona un archivo CSV válido.",
          variant: "destructive",
        });
      }
    }
  };

  // Auto-fetch preview when file, importType, and categoryId are all set (only once)
  useEffect(() => {
    if (file && importType && categoryId && !preview && !previewLoading) {
      fetchPreview(file, importType, categoryId)
        .then(() => {
          setShowMappingDialog(true);
        })
        .catch(() => {
          // Error already handled in hook
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, importType, categoryId]); // Only depend on these, not preview state to avoid infinite loops

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    disabled: !importType || !categoryId,
  });

  const handleMappingConfirm = (mapping: { [csvColumn: string]: string | null }) => {
    setColumnMapping(mapping);
    setShowMappingDialog(false);
  };

  // Auto-apply suggested mappings when preview is loaded (only once)
  useEffect(() => {
    if (preview && preview.suggestedMappings && Object.keys(preview.suggestedMappings).length > 0 && !columnMapping) {
      // Auto-apply suggested mappings for user verification
      // This pre-fills the mapping so users only need to verify/change if needed
      setColumnMapping(preview.suggestedMappings);
      // Show dialog briefly for user to see what was auto-mapped (they can close it)
      setShowMappingDialog(true);
    }
  }, [preview, columnMapping]);

  const handleSubmit = async () => {
    if (!importType || !categoryId || !file) {
      toast({
        title: "Error",
        description: "Por favor, completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    // Auto-use suggested mappings if available and no mapping confirmed yet
    const mappingToUse = columnMapping || (preview?.suggestedMappings && Object.keys(preview.suggestedMappings).length > 0
      ? preview.suggestedMappings
      : null);

    // If no mapping at all (not even suggested), show dialog
    if (!mappingToUse && preview) {
      setShowMappingDialog(true);
      return;
    }

    await startImport(file, importType, categoryId, mappingToUse || undefined);

    setImportType("");
    setCategoryId("");
    setFile(null);
    setColumnMapping(null);

    navigate("/dashboard/importaciones");
  };

  return (
    <Layout>
      <header className="flex justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/productos">
            <Card className="p-2">
              <ChevronLeft className="h-4 w-4" />
            </Card>
          </Link>
          <p className="text-2xl font-semibold leading-none tracking-tight">
            Importar Productos
          </p>
        </div>
        <Link to="/dashboard/importaciones">
          <Button variant="outline" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Ver Dashboard
          </Button>
        </Link>
      </header>

      <section className="flex flex-col justify-center gap-4 mt-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Importar desde CSV</CardTitle>
            <CardDescription>
              Selecciona la categoría, el tipo de importación y sube tu archivo CSV.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3">
              <Label htmlFor="category">
                Categoría<span className="text-red-500">*</span>
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Categorías</SelectLabel>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id || ""}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="importType">
                Tipo de Importación<span className="text-red-500">*</span>
              </Label>
              <Select
                value={importType}
                onValueChange={(value) => setImportType(value as ImportType)}
                disabled={!categoryId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona el tipo de importación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Tipos de Importación</SelectLabel>
                    <SelectItem value="products">Productos</SelectItem>
                    <SelectItem value="references">Referencias</SelectItem>
                    <SelectItem value="applications">Aplicaciones</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="file">
                Archivo CSV<span className="text-red-500">*</span>
              </Label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${!importType || !categoryId
                  ? "bg-gray-50 border-gray-300 cursor-not-allowed opacity-50"
                  : isDragActive
                    ? "bg-[#F5F9FD] border-[#0bbff4] cursor-pointer"
                    : file
                      ? "bg-green-50 border-green-400 cursor-pointer"
                      : "border-[#94A3B8] hover:border-[#0bbff4] cursor-pointer"
                  }`}
              >
                <input {...getInputProps()} disabled={!importType || !categoryId} />
                {file ? (
                  <div className="space-y-2">
                    <File className="h-12 w-12 mx-auto text-green-600" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Haz clic para seleccionar otro archivo
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <File className="h-12 w-12 mx-auto text-muted-foreground" />
                    {!importType || !categoryId ? (
                      <>
                        <p className="text-muted-foreground">
                          Selecciona la categoría y el tipo de importación primero
                        </p>
                        <p className="text-sm text-muted-foreground">
                          El área de carga se habilitará después
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground">
                          {isDragActive
                            ? "Suelta el archivo aquí"
                            : "Arrastra y suelta el archivo CSV aquí"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          o haz clic para seleccionar un archivo
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={() => navigate("/dashboard/productos")}
                variant="outline"
                disabled={importState.isImporting || previewLoading}
              >
                Cancelar
              </Button>
              {columnMapping && preview && (
                <Button
                  onClick={() => setShowMappingDialog(true)}
                  variant="outline"
                  disabled={importState.isImporting || previewLoading}
                >
                  Editar Mapeo
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!importType || !categoryId || !file || importState.isImporting || previewLoading}
              >
                {previewLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : importState.isImporting ? (
                  "Importando..."
                ) : columnMapping ? (
                  "Importar"
                ) : (
                  "Continuar"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {preview && (
        <ColumnMappingDialog
          open={showMappingDialog}
          onOpenChange={(open) => {
            setShowMappingDialog(open);
            // If dialog is closed without confirming, keep the existing mapping
            if (!open && !columnMapping) {
              // User closed without mapping, allow them to reopen
            }
          }}
          headers={preview.headers}
          attributes={preview.attributes}
          coreAttributes={preview.coreAttributes}
          suggestedMappings={preview.suggestedMappings}
          requiredAttributes={preview.requiredAttributes}
          onConfirm={handleMappingConfirm}
          initialMapping={columnMapping || undefined}
        />
      )}
    </Layout>
  );
};

export default ImportProduct;

