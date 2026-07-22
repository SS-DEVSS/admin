import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Application } from "@/models/application";
import { Product } from "@/models/product";
import { useState, useEffect } from "react";
import { productService } from "@/services/productService";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

type FeatureProductModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  applications: Application[];
  isCurrentlyFeatured: boolean;
  currentFeaturedApplicationId: string | null;
  onSuccess?: () => void;
};

const FeatureProductModal = ({
  open,
  onOpenChange,
  product,
  applications,
  isCurrentlyFeatured,
  currentFeaturedApplicationId,
  onSuccess,
}: FeatureProductModalProps) => {
  const { toast } = useToast();
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [featuredCount, setFeaturedCount] = useState<number | null>(null);

  useEffect(() => {
    if (open && product) {
      if (isCurrentlyFeatured && currentFeaturedApplicationId) {
        setSelectedApplicationId(currentFeaturedApplicationId);
      } else {
        setSelectedApplicationId("");
      }
    }
  }, [open, product, isCurrentlyFeatured, currentFeaturedApplicationId]);

  useEffect(() => {
    if (open && !isCurrentlyFeatured) {
      const fetchFeaturedCount = async () => {
        try {
          const response = await productService.getFeaturedProducts();
          setFeaturedCount(response.products.length);
        } catch (error) {
          console.error("Error fetching featured products count:", error);
        }
      };
      fetchFeaturedCount();
    }
  }, [open, isCurrentlyFeatured]);

  const formatApplicationDisplay = (app: Application): string => {
    if ((app as any).displayText) {
      return (app as any).displayText;
    }

    const parts: string[] = [];
    const attributeValues = app.attributeValues || [];

    const getAttributeValue = (attrName: string) => {
      const attr = attributeValues.find((av: any) =>
        av.attribute?.name === attrName ||
        av.attribute?.name?.toLowerCase() === attrName.toLowerCase()
      );
      if (!attr) return null;

      // If it's a date value, extract just the year
      if (attr.valueDate) {
        const date = new Date(attr.valueDate);
        if (!isNaN(date.getTime())) {
          return date.getFullYear().toString();
        }
      }

      return attr.valueString || attr.valueNumber || attr.valueBoolean || null;
    };

    const modelo = getAttributeValue("Modelo");
    const submodelo = getAttributeValue("Submodelo");
    const año = getAttributeValue("Año");
    const litrosMotor = getAttributeValue("Litros_Motor");

    if (modelo) parts.push(String(modelo));
    if (submodelo) parts.push(String(submodelo));
    if (año) parts.push(String(año));
    if (litrosMotor) parts.push(`${litrosMotor} LTS`);

    const shortId = app.id.substring(app.id.length - 8).toUpperCase();
    if (parts.length > 0) {
      return `${parts.join(" - ")} (${shortId})`;
    }
    return `Aplicación (${shortId})`;
  };

  const handleSubmit = async () => {
    if (!product) return;

    if (!selectedApplicationId && !isCurrentlyFeatured) {
      toast({
        title: "Error",
        description: "Por favor selecciona una aplicación para destacar como nueva integración.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const applicationId = selectedApplicationId || null;
      await productService.setFeaturedProduct(product.id, applicationId);

      toast({
        title: "Éxito",
        description: applicationId
          ? "Producto destacado como nueva integración."
          : "Producto removido de nuevas integraciones.",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('[FeatureProductModal] Error setting featured product:', error);
      let errorMessage = "Error al actualizar la nueva integración.";

      if (error.response?.data) {
        // Try to get the error message from the response
        errorMessage = error.response.data.message ||
          error.response.data.error ||
          error.response.data.errorMessage ||
          errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAtMaxLimit = featuredCount !== null && featuredCount >= 6 && !isCurrentlyFeatured;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isCurrentlyFeatured ? "Editar Nueva Integración" : "Destacar como Nueva Integración"}
          </DialogTitle>
          <DialogDescription>
            {isCurrentlyFeatured
              ? "Selecciona la aplicación que se mostrará para esta nueva integración."
              : "Selecciona una aplicación para destacar este producto como nueva integración. Se mostrará en la página principal."}
          </DialogDescription>
        </DialogHeader>

        {isAtMaxLimit && (
          <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Ya hay 6 nuevas integraciones. Por favor, quita una primero.
            </AlertDescription>
          </Alert>
        )}

        {applications.length === 0 && !isAtMaxLimit && (
          <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Este producto no tiene aplicaciones. Agrega al menos una aplicación antes de destacarlo como nueva integración.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Aplicación</label>
            <Select
              value={selectedApplicationId}
              onValueChange={setSelectedApplicationId}
              disabled={applications.length === 0 || isAtMaxLimit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una aplicación" />
              </SelectTrigger>
              <SelectContent>
                {applications.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {formatApplicationDisplay(app)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          {isCurrentlyFeatured && (
            <Button
              variant="destructive"
              onClick={async () => {
                if (!product) return;
                setIsSubmitting(true);
                try {
                  await productService.setFeaturedProduct(product.id, null);
                  toast({
                    title: "Éxito",
                    description: "Producto removido de nuevas integraciones.",
                  });
                  onSuccess?.();
                  onOpenChange(false);
                } catch (error: any) {
                  console.error('[FeatureProductModal] Error removing featured product:', error);
                  let errorMessage = "Error al quitar la nueva integración.";

                  if (error.response?.data) {
                    errorMessage = error.response.data.message ||
                      error.response.data.error ||
                      error.response.data.errorMessage ||
                      errorMessage;
                  } else if (error.message) {
                    errorMessage = error.message;
                  }

                  toast({
                    title: "Error",
                    description: errorMessage,
                    variant: "destructive",
                  });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
            >
              Quitar de Nuevas Integraciones
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || applications.length === 0 || isAtMaxLimit}
          >
            {isSubmitting ? "Guardando..." : isCurrentlyFeatured ? "Actualizar" : "Destacar como nueva integración"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeatureProductModal;
