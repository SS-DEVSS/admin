import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Reference } from "@/models/reference";
import { CategoryAtributes, CategoryAttributesTypes } from "@/models/category";
import DynamicComponent from "@/components/DynamicComponent";
import { useMemo, useState, useEffect } from "react";
import axiosClient from "@/services/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { REFERENCE_FIELD_LABELS } from "@/constants/referenceFieldLabels";
import { translateAttributeName } from "@/utils/attributeTranslations";

type EditReferenceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reference: Reference | null;
  categoryAttributes?: CategoryAtributes[];
  productId?: string;
  onLocalSave?: (previousId: string, updatedReference: Reference) => void;
  onSuccess?: () => void;
};

const EditReferenceDialog = ({
  open,
  onOpenChange,
  reference,
  categoryAttributes = [],
  productId,
  onLocalSave,
  onSuccess,
}: EditReferenceDialogProps) => {
  const { toast } = useToast();
  const client = axiosClient();

  // Get reference attributes from category
  const referenceAttributes = useMemo(() => {
    if (!categoryAttributes) return [];

    if (Array.isArray(categoryAttributes)) {
      return categoryAttributes.filter((attr) => attr.scope === "REFERENCE");
    }

    if (typeof categoryAttributes === 'object' && 'reference' in categoryAttributes) {
      return (categoryAttributes as { reference: CategoryAtributes[] }).reference || [];
    }

    return [];
  }, [categoryAttributes]);

  // Initialize form state from reference
  const [formData, setFormData] = useState({
    referenceBrand: "",
    referenceNumber: "",
    typeOfPart: "",
    type: "Aftermarket",
    description: "",
    attributeValues: {} as Record<string, any>,
  });

  // Update form data when reference changes
  useEffect(() => {
    if (!reference) {
      setFormData({
        referenceBrand: "",
        referenceNumber: "",
        typeOfPart: "",
        type: "Aftermarket",
        description: "",
        attributeValues: {},
      });
      return;
    }

    // Convert attributeValues array to object by attribute name
    const attributeValuesObj: Record<string, any> = {};
    if (reference.attributeValues && referenceAttributes.length > 0) {
      referenceAttributes.forEach((attr) => {
        const attrValue = reference.attributeValues?.find(
          (av: any) => av.idAttribute === attr.id || (av.attribute && av.attribute.id === attr.id)
        );
        if (attrValue) {
          attributeValuesObj[attr.name] = attrValue.valueString || attrValue.valueNumber || attrValue.valueBoolean || attrValue.valueDate || "";
        }
      });
    }

    setFormData({
      referenceBrand: reference.referenceBrand || "",
      referenceNumber: reference.referenceNumber || "",
      typeOfPart: reference.typeOfPart || "",
      type: reference.type || "Aftermarket",
      description: reference.description || "",
      attributeValues: attributeValuesObj,
    });
  }, [reference, referenceAttributes]);

  const handleSave = async () => {
    if (!reference || !reference.id) return;

    try {
      const attributes = referenceAttributes.map((attr) => {
        const value = formData.attributeValues[attr.name];

        const attributeValue: {
          idAttribute: string;
          valueString: string | null;
          valueNumber: number | null;
          valueBoolean: boolean | null;
          valueDate: Date | null;
        } = {
          idAttribute: attr.id!,
          valueString: null,
          valueNumber: null,
          valueBoolean: null,
          valueDate: null,
        };

        if (value !== undefined && value !== null && value !== "") {
          if (attr.type === CategoryAttributesTypes.STRING) {
            attributeValue.valueString = String(value);
          } else if (attr.type === CategoryAttributesTypes.NUMERIC) {
            attributeValue.valueNumber = Number(value);
          } else if (attr.type === CategoryAttributesTypes.BOOLEAN) {
            attributeValue.valueBoolean = Boolean(value);
          } else if (attr.type === CategoryAttributesTypes.DATE) {
            attributeValue.valueDate = value instanceof Date ? value : new Date(value);
          }
        }

        return attributeValue;
      });

      const payload = {
        referenceBrand: formData.referenceBrand || null,
        referenceNumber: formData.referenceNumber,
        typeOfPart: formData.typeOfPart || null,
        type: formData.type,
        description: formData.description || null,
        attributes,
      };

      const isNewReference = reference.isNew === true;

      if (isNewReference && productId) {
        const response = await client.post("/references", {
          ...payload,
          idProduct: productId,
        });
        const createdReference = response.data?.reference as Reference;
        onLocalSave?.(reference.id, { ...createdReference, isNew: false });
        toast({
          title: "Referencia creada",
          variant: "success",
        });
      } else if (isNewReference) {
        onLocalSave?.(reference.id, {
          ...reference,
          ...payload,
          isNew: true,
        });
        toast({
          title: "Referencia actualizada",
          variant: "success",
        });
      } else {
        await client.patch(`/references/${reference.id}`, payload);
        toast({
          title: "Referencia actualizada",
          variant: "success",
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      console.error("Error saving reference:", error);
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      toast({
        title: reference.isNew ? "Error al crear referencia" : "Error al actualizar referencia",
        description: apiError.response?.data?.error || apiError.message || "Error desconocido",
        variant: "destructive",
      });
    }
  };

  const handleAttributeChange = (attrName: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      attributeValues: {
        ...prev.attributeValues,
        [attrName]: value,
      },
    }));
  };

  if (!reference) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reference.isNew ? "Nueva Referencia" : "Editar Referencia"}</DialogTitle>
          <DialogDescription>
            {reference.isNew
              ? "Completa la información de la referencia. Se guardará al confirmar."
              : "Edita la información de la referencia. Todos los campos son editables."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Basic Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="referenceBrand">
                {REFERENCE_FIELD_LABELS.referenceBrand}{" "}
                <span className="text-muted-foreground">(Opcional)</span>
              </Label>
              <Input
                id="referenceBrand"
                value={formData.referenceBrand}
                onChange={(e) =>
                  setFormData((prev: any) => ({ ...prev, referenceBrand: e.target.value }))
                }
                placeholder="Ej: LUK"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referenceNumber">
                {REFERENCE_FIELD_LABELS.referenceNumber} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="referenceNumber"
                value={formData.referenceNumber}
                onChange={(e) =>
                  setFormData((prev: any) => ({ ...prev, referenceNumber: e.target.value }))
                }
                placeholder="Ej: 9700511860"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="typeOfPart">
                {REFERENCE_FIELD_LABELS.typeOfPart}{" "}
                <span className="text-muted-foreground">(Opcional)</span>
              </Label>
              <Input
                id="typeOfPart"
                value={formData.typeOfPart}
                onChange={(e) =>
                  setFormData((prev: any) => ({ ...prev, typeOfPart: e.target.value }))
                }
                placeholder="Ej: ACTUADOR DE EMBRAGUE (SERVO)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                {REFERENCE_FIELD_LABELS.referenceType} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev: any) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OEM">OEM</SelectItem>
                  <SelectItem value="Aftermarket">Aftermarket</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {REFERENCE_FIELD_LABELS.description}{" "}
              <span className="text-muted-foreground">(Opcional)</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev: any) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Descripción adicional de la referencia"
              rows={3}
            />
          </div>

          {/* Dynamic Attributes */}
          {referenceAttributes.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold">Atributos Adicionales</h3>
              <div className="grid grid-cols-2 gap-4">
                {referenceAttributes.map((attr) => (
                  <div key={attr.id} className="space-y-2">
                    <Label>
                      {attr.required && <span className="text-red-500 mr-1">*</span>}
                      {translateAttributeName(attr.name, false)}
                    </Label>
                    <DynamicComponent
                      type={attr.type}
                      name={attr.name}
                      required={attr.required}
                      value={formData.attributeValues[attr.name]}
                      onChange={(value) => handleAttributeChange(attr.name, value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.referenceNumber || !formData.type}
          >
            {reference.isNew ? "Crear Referencia" : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditReferenceDialog;

