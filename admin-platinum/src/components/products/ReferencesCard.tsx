import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Product } from "@/models/product";
import { Reference } from "@/models/reference";
import { PlusCircle, X, Pencil } from "lucide-react";
import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import NoData from "../NoData";
import { Button } from "../ui/button";
import EditReferenceDialog from "./EditReferenceDialog";
import { CategoryAtributes } from "@/models/category";
import { useCategoryContext } from "@/context/categories-context";
import axiosClient from "@/services/axiosInstance";

type ReferencesCardProps = {
  state: {
    references: Reference[];
  };
  setState: React.Dispatch<React.SetStateAction<{ references: Reference[] }>>;
  product?: Product | null;
};

const ReferencesCard = ({ state, setState, product }: ReferencesCardProps) => {
  const { categories } = useCategoryContext();
  const [showInput, setShowInput] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [referenceBrand, setReferenceBrand] = useState<string>("");
  const [referenceDescription, setReferenceDescription] = useState<string>("");
  const [editingReference, setEditingReference] = useState<Reference | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Reference | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
        sku: "", // SKU will be linked to product on save
        referenceBrand: referenceBrand,
        referenceNumber: referenceNumber,
        typeOfPart: null,
        type: "Aftermarket", // Default
        description: referenceDescription || null,
      };
      setState((prevForm) => ({
        ...prevForm,
        references: [...prevForm.references, newReference],
      }));
      setReferenceNumber("");
      setReferenceBrand("");
      setReferenceDescription("");
      setShowInput(false);
    }
  };

  const handleRemoveReference = async (reference: Reference) => {
    if (product?.id && reference.id) {
      setDeleteTarget(reference);
      return;
    }
    setState((prevForm) => ({
      ...prevForm,
      references: prevForm.references.filter((ref) => ref.id !== reference.id),
    }));
  };

  const confirmDeleteReference = async () => {
    if (!deleteTarget?.id) return;
    setDeleteLoading(true);
    try {
      const client = axiosClient();
      await client.delete(`/references/${deleteTarget.id}`);
      setState((prev) => ({
        references: prev.references.filter((ref) => ref.id !== deleteTarget.id),
      }));
      toast({ title: "Referencia eliminada", variant: "success" });
      setDeleteTarget(null);
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Error al eliminar referencia";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditReference = (reference: Reference) => {
    setEditingReference(reference);
    setIsEditDialogOpen(true);
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
    <Card className="w-full flex flex-col mt-5">
      <CardHeader>
        <CardTitle>Referencias</CardTitle>
        <CardDescription>
          Ingrese los números de referencia asociados al producto.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {state.references.length === 0 && showInput === false ? (
          <NoData>
            <p className="text-[#94A3B8] font-medium">
              No hay números de referencia asociados
            </p>
          </NoData>
        ) : (
          <section className="flex gap-3 flex-wrap">
            {state.references.map((reference) => (
              <div
                key={reference.id}
                className="bg-primary/10 border border-primary/20 text-foreground rounded-full px-4 py-2 flex items-center gap-3 transition-all duration-200 group"
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
                    onClick={() => void handleRemoveReference(reference)}
                    className="cursor-pointer h-3.5 w-3.5 text-muted-foreground hover:text-red-500 hover:scale-110 transition-all duration-200"
                  />
                </div>
              </div>
            ))}
          </section>
        )}
        {showInput && (
          <div className="flex flex-col gap-2 mt-4">
            <div className="flex gap-2">
              <Input
                type="text"
                className="w-1/3"
                placeholder="Marca de Intercambio (Ej. LUK)"
                value={referenceBrand}
                onChange={(e) => setReferenceBrand(e.target.value)}
              />
              <Input
                type="text"
                className="w-2/3"
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
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={handleAddClick}>
                Cancelar
              </Button>
              <Button onClick={handleAddReference} disabled={!referenceNumber || !referenceBrand}>Agregar</Button>
            </div>
          </div>
        )}
      </CardContent>
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

      <EditReferenceDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        reference={editingReference}
        categoryAttributes={categoryAttributes}
        onSuccess={handleEditSuccess}
      />

      <ConfirmActionDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar referencia"
        description={`Se eliminará la referencia ${deleteTarget?.referenceNumber ?? ""}.`}
        consequences={["La referencia se eliminará permanentemente del producto."]}
        loading={deleteLoading}
        onConfirm={confirmDeleteReference}
      />
    </Card>
  );
};

export default ReferencesCard;
