import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export type BulkDeleteScopeSelection = {
  deleteProduct: boolean;
  deleteApplications: boolean;
  deleteReferences: boolean;
  deleteImages: boolean;
};

type BulkDeleteProductsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productCount: number;
  loading?: boolean;
  error?: string | null;
  onConfirm: (scope: BulkDeleteScopeSelection) => void | Promise<void>;
};

const DEFAULT_SCOPE: BulkDeleteScopeSelection = {
  deleteProduct: true,
  deleteApplications: true,
  deleteReferences: true,
  deleteImages: true,
};

const BulkDeleteProductsDialog = ({
  open,
  onOpenChange,
  productCount,
  loading = false,
  error = null,
  onConfirm,
}: BulkDeleteProductsDialogProps) => {
  const [inputValue, setInputValue] = useState("");
  const [scope, setScope] = useState<BulkDeleteScopeSelection>(DEFAULT_SCOPE);

  useEffect(() => {
    if (!open) {
      setInputValue("");
      setScope(DEFAULT_SCOPE);
    }
  }, [open]);

  const isConfirmed = inputValue.trim() === "Confirmar";

  const consequences = useMemo(() => {
    const items: string[] = [];

    if (scope.deleteProduct) {
      items.push(
        `Se eliminarán ${productCount} producto(s) por completo, incluyendo aplicaciones, referencias, imágenes, variantes y datos relacionados.`
      );
      return items;
    }

    items.push(
      `Se aplicará la eliminación sobre ${productCount} producto(s) seleccionado(s). Los productos permanecerán en el catálogo salvo que elijas eliminarlos por completo.`
    );

    if (scope.deleteApplications) {
      items.push("Se eliminarán todas las aplicaciones asociadas.");
    }
    if (scope.deleteReferences) {
      items.push("Se eliminarán todas las referencias asociadas.");
    }
    if (scope.deleteImages) {
      items.push("Se eliminarán todas las imágenes asociadas, incluidos los archivos en almacenamiento.");
    }

    if (items.length === 1) {
      items.push("Selecciona al menos una opción de eliminación.");
    }

    items.push("Esta acción no se puede deshacer.");
    return items;
  }, [productCount, scope]);

  const setDeleteEverything = (checked: boolean) => {
    setScope({
      deleteProduct: checked,
      deleteApplications: checked,
      deleteReferences: checked,
      deleteImages: checked,
    });
  };

  const setPartialOption = (
    key: Exclude<keyof BulkDeleteScopeSelection, "deleteProduct">,
    checked: boolean
  ) => {
    setScope((prev) => ({
      ...prev,
      deleteProduct: false,
      [key]: checked,
    }));
  };

  const hasSelection =
    scope.deleteProduct ||
    scope.deleteApplications ||
    scope.deleteReferences ||
    scope.deleteImages;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Eliminar productos</DialogTitle>
          <DialogDescription>
            Elige qué deseas eliminar de los {productCount} producto(s) seleccionados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-md border p-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={scope.deleteProduct}
              onCheckedChange={(value) => setDeleteEverything(value === true)}
              disabled={loading}
            />
            <span className="text-sm leading-5">
              <span className="font-medium">Eliminar todo</span>
              <span className="block text-muted-foreground">
                Elimina los productos por completo y marca todas las demás opciones.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={scope.deleteApplications}
              onCheckedChange={(value) =>
                setPartialOption("deleteApplications", value === true)
              }
              disabled={loading || scope.deleteProduct}
            />
            <span className="text-sm leading-5">
              <span className="font-medium">Eliminar solo aplicaciones</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={scope.deleteReferences}
              onCheckedChange={(value) =>
                setPartialOption("deleteReferences", value === true)
              }
              disabled={loading || scope.deleteProduct}
            />
            <span className="text-sm leading-5">
              <span className="font-medium">Eliminar solo referencias</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={scope.deleteImages}
              onCheckedChange={(value) =>
                setPartialOption("deleteImages", value === true)
              }
              disabled={loading || scope.deleteProduct}
            />
            <span className="text-sm leading-5">
              <span className="font-medium">Eliminar solo imágenes</span>
            </span>
          </label>
        </div>

        {consequences.length > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="font-medium mb-2">Resumen</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              {consequences.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Escribe <span className="font-semibold text-foreground">Confirmar</span> para continuar.
          </p>
          <Input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Confirmar"
            disabled={loading}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!isConfirmed || !hasSelection || loading}
            onClick={() => void onConfirm(scope)}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Eliminar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkDeleteProductsDialog;
