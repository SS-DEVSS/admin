import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Product } from "@/models/product";
import { Reference } from "@/models/reference";
import { PlusCircle, X, Pencil, Link2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import EditReferenceDialog from "./EditReferenceDialog";
import { CategoryAtributes } from "@/models/category";
import { useCategoryContext } from "@/context/categories-context";
import axiosClient from "@/services/axiosInstance";
import { REFERENCE_FIELD_LABELS } from "@/constants/referenceFieldLabels";

type ReferencesCardProps = {
  state: {
    references: Reference[];
  };
  setState: React.Dispatch<React.SetStateAction<{ references: Reference[] }>>;
  product?: Product | null;
  layout?: "default" | "sidebar";
};

const ReferencesCard = ({ state, setState, product, layout = "default" }: ReferencesCardProps) => {
  const isSidebar = layout === "sidebar";
  const { categories } = useCategoryContext();
  const [showInput, setShowInput] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [referenceBrand, setReferenceBrand] = useState<string>("");
  const [referenceType, setReferenceType] = useState<string>("Aftermarket");
  const [referenceDescription, setReferenceDescription] = useState<string>("");
  const [editingReference, setEditingReference] = useState<Reference | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Get category attributes
  const categoryAttributes = useMemo(() => {
    if (!product?.idCategory) return [];
    const categoryId = product.idCategory;
    const category = categories.find((c) => c.id === categoryId);
    if (!category?.attributes) return [];

    if (Array.isArray(category.attributes)) {
      return category.attributes;
    }

    if (typeof category.attributes === 'object' && 'reference' in category.attributes) {
      return (category.attributes as { reference: CategoryAtributes[] }).reference || [];
    }

    return [];
  }, [product?.idCategory, categories]);

  // Track the product ID to only load references once per product
  const [loadedProductId, setLoadedProductId] = useState<string | null>(null);

  // Load references from product when editing (only once per product)
  useEffect(() => {
    // Only load references if:
    // 1. Product exists and has references
    // 2. We haven't loaded references for this product yet (different product ID)
    // 3. State is currently empty (to avoid overwriting user changes)
    if (product && product.id && product.references && product.id !== loadedProductId && state.references.length === 0) {
      setState({
        references: product.references,
      });
      setLoadedProductId(product.id);
    }
    // Reset the loaded ID if product changes to a different one
    if (product && product.id && product.id !== loadedProductId && !product.references) {
      // Product changed but no references, reset to allow loading when references become available
      setLoadedProductId(null);
    }
    // If product is null/undefined, reset the loaded ID
    if (!product || !product.id) {
      setLoadedProductId(null);
    }
  }, [product?.id]); // Only depend on product.id to avoid re-running when product object changes

  const handleAddClick = () => {
    setShowInput((prevShowInput) => !prevShowInput);
  };

  const handleAddReference = () => {
    if (referenceNumber && referenceBrand) {
      const newReference: Reference = {
        id: crypto.randomUUID(),
        sku: "",
        referenceBrand: referenceBrand,
        referenceNumber: referenceNumber,
        typeOfPart: null,
        type: referenceType,
        description: referenceDescription || null,
        isNew: true,
      };
      setState((prevForm) => ({
        ...prevForm,
        references: [...prevForm.references, newReference],
      }));
      setReferenceNumber("");
      setReferenceBrand("");
      setReferenceType("Aftermarket");
      setReferenceDescription("");
      setShowInput(false);
    }
  };

  const handleRemoveReference = (reference: Reference) => {
    setState((prevForm) => ({
      ...prevForm,
      references: prevForm.references.filter((ref) => ref.id !== reference.id),
    }));
  };

  const handleEditReference = (reference: Reference) => {
    setEditingReference(reference);
    setIsEditDialogOpen(true);
  };

  const handleLocalSave = (previousId: string, updatedReference: Reference) => {
    setState((prev) => ({
      references: prev.references.map((ref) =>
        ref.id === previousId ? updatedReference : ref
      ),
    }));
  };

  const handleEditSuccess = async () => {
    // Refresh references from backend if product ID is available
    if (product?.id) {
      try {
        const client = axiosClient();
        const response = await client.get(`/references/product/${product.id}`);
        if (response.data?.references) {
          setState({ references: response.data.references });
        }
      } catch (error) {
        console.error("Error refreshing references:", error);
      }
    }
  };

  return (
    <Card className="w-full flex flex-col">
      <CardHeader className={isSidebar ? "pb-3" : undefined}>
        <CardTitle className="text-base">Referencias</CardTitle>
        <CardDescription>
          Ingrese los números de referencia asociados al producto.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {state.references.length === 0 && showInput === false ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-8 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border bg-background shadow-sm">
              <Link2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Sin referencias</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Agrega números OEM o aftermarket para vincular intercambios a este producto.
            </p>
            <Button
              size="sm"
              type="button"
              variant="outline"
              className="mt-4 bg-background hover:bg-background"
              onClick={handleAddClick}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Agregar referencia
            </Button>
          </div>
        ) : (
          <section className={isSidebar ? "flex flex-col gap-2" : "flex gap-3 flex-wrap"}>
            {state.references.map((reference) => (
              <div
                key={reference.id}
                className={`bg-primary/10 border border-primary/20 text-foreground rounded-full px-4 py-2 flex items-center gap-3 transition-all duration-200 group ${
                  isSidebar ? "w-full rounded-lg" : ""
                }`}
              >
                <span className="flex-1 text-sm font-medium">
                  {reference.referenceBrand && (
                    <span className="font-semibold mr-1.5">{reference.referenceBrand}:</span>
                  )}
                  {reference.referenceNumber}
                </span>
                <div className="flex gap-2 items-center">
                  <Pencil
                    onClick={() => handleEditReference(reference)}
                    className="cursor-pointer h-3.5 w-3.5 text-muted-foreground hover:text-primary hover:scale-110 transition-all duration-200"
                  />
                  <X
                    onClick={() => handleRemoveReference(reference)}
                    className="cursor-pointer h-3.5 w-3.5 text-muted-foreground hover:text-red-500 hover:scale-110 transition-all duration-200"
                  />
                </div>
              </div>
            ))}
          </section>
        )}
        {showInput && (
          <div className="flex flex-col gap-2 mt-4">
            <div className={isSidebar ? "flex flex-col gap-2" : "flex gap-2"}>
              <Input
                type="text"
                className={isSidebar ? "w-full" : "w-1/3"}
                placeholder="Marca de Intercambio (Ej. LUK)"
                value={referenceBrand}
                onChange={(e) => setReferenceBrand(e.target.value)}
              />
              <Input
                type="text"
                className={isSidebar ? "w-full" : "w-2/3"}
                placeholder="Intercambio"
                value={referenceNumber || ""}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
            <Input
              type="text"
              className="w-full"
              placeholder="Descripción (Opcional)"
              value={referenceDescription}
              onChange={(e) => setReferenceDescription(e.target.value)}
            />
            <div className="space-y-2">
              <Label htmlFor="inline-reference-type">
                {REFERENCE_FIELD_LABELS.referenceType}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Select value={referenceType} onValueChange={setReferenceType}>
                <SelectTrigger id="inline-reference-type">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OEM">OEM</SelectItem>
                  <SelectItem value="Aftermarket">Aftermarket</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={handleAddClick}>
                Cancelar
              </Button>
              <Button onClick={handleAddReference} disabled={!referenceNumber || !referenceBrand}>Agregar</Button>
            </div>
          </div>
        )}
      </CardContent>
      {state.references.length > 0 && (
      <CardFooter className="mt-auto border-t p-2 grid items-center">
        <Button
          size="sm"
          variant="ghost"
          className="gap-1 hover:bg-slate-100 hover:text-black py-5"
          onClick={handleAddClick}
          disabled={showInput}
        >
          <PlusCircle className="h-3.5 w-3.5 mr-2" />
          Agregar número de Referencia
        </Button>
      </CardFooter>
      )}

      <EditReferenceDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        reference={editingReference}
        categoryAttributes={categoryAttributes}
        productId={product?.id}
        onLocalSave={handleLocalSave}
        onSuccess={handleEditSuccess}
      />

    </Card>
  );
};

export default ReferencesCard;
