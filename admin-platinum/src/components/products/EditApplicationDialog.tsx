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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Application } from "@/models/application";
import { CategoryAtributes, CategoryAttributesTypes } from "@/models/category";
import DynamicComponent from "@/components/DynamicComponent";
import { useMemo, useState, useEffect } from "react";
import axiosClient from "@/services/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { translateAttributeName } from "@/utils/attributeTranslations";
import { Loader2 } from "lucide-react";

type AttributeFormValues = Record<string, string | number | boolean | Date | undefined>;

type AttributePayload = {
  idAttribute: string;
  valueString: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueDate: Date | null;
};

type YearFieldState = { start: string };

const isYearAttributeName = (name: string): boolean => {
  const lower = name.toLowerCase();
  return lower.includes("año") || lower.includes("anio") || lower.includes("year");
};

const hasAttributeValue = (value: string | number | boolean | Date | undefined): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
};

type EditApplicationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  categoryAttributes?: CategoryAtributes[];
  productId?: string;
  onSuccess?: () => void;
};

const EditApplicationDialog = ({
  open,
  onOpenChange,
  application,
  categoryAttributes = [],
  productId,
  onSuccess,
}: EditApplicationDialogProps) => {
  const { toast } = useToast();
  const client = axiosClient();
  const [isSaving, setIsSaving] = useState(false);

  // Get application attributes from category
  const applicationAttributes = useMemo(() => {
    if (!categoryAttributes) return [];
    
    if (Array.isArray(categoryAttributes)) {
      // Filter by scope, case-insensitive
      return categoryAttributes.filter((attr) => {
        const scope = String(attr.scope || '').toUpperCase();
        return scope === "APPLICATION" || scope === "APLICACION";
      });
    }
    
    if (typeof categoryAttributes === 'object' && 'application' in categoryAttributes) {
      return (categoryAttributes as { application: CategoryAtributes[] }).application || [];
    }
    
    return [];
  }, [categoryAttributes]);

  // Initialize form state from application
  const [formData, setFormData] = useState({
    origin: "Nueva aplicación",
    attributeValues: {} as AttributeFormValues,
  });

  const [yearFields, setYearFields] = useState<Record<string, YearFieldState>>({});

  // Update form data when application changes
  useEffect(() => {
    if (!application) {
      setFormData({
        origin: "Nueva aplicación",
        attributeValues: {},
      });
      setYearFields({});
      return;
    }

    // Convert attributeValues array to object by attribute name
    const attributeValuesObj: AttributeFormValues = {};
    const newYearFields: Record<string, YearFieldState> = {};

    if (application.attributeValues && applicationAttributes.length > 0) {
      applicationAttributes.forEach((attr) => {
        const isYearAttribute = isYearAttributeName(attr.name);
        
        // Try to find the attribute value by ID first, then by name (case-insensitive)
        const attrValue = application.attributeValues?.find((av: any) => {
          // Match by ID (most reliable)
          if (av.idAttribute === attr.id || (av.attribute && av.attribute.id === attr.id)) {
            return true;
          }
          // Match by name (case-insensitive, normalize spaces, underscores, and accents)
          const avAttrName = av.attribute?.name || "";
          const normalizeString = (str: string) => {
            return str.toLowerCase()
              .trim()
              .replace(/_/g, "")
              .replace(/\s+/g, "")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, ""); // Remove accents
          };
          const normalizedAttrName = normalizeString(attr.name);
          const normalizedAvName = normalizeString(avAttrName);
          if (normalizedAttrName === normalizedAvName) {
            return true;
          }
          // Also try matching with csv_name if available
          if (attr.csv_name) {
            const csvName = attr.csv_name;
            const normalizedCsvName = normalizeString(csvName);
            if (normalizedCsvName === normalizedAvName) {
              return true;
            }
          }
          return false;
        });
        
        if (attrValue) {
          let value: any = "";

          // Prefer valueNumber for year attributes
          if (isYearAttribute) {
            if (attrValue.valueNumber !== null && attrValue.valueNumber !== undefined) {
              value = attrValue.valueNumber;
            } else if (attrValue.valueString) {
              value = attrValue.valueString;
            } else if (attrValue.valueDate) {
              const date = new Date(attrValue.valueDate);
              if (!isNaN(date.getTime())) {
                value = date.getFullYear().toString();
              }
            }
          } else {
            // Non-year attributes: standard priority
            // For numeric attributes, prioritize valueNumber
            if (attr.type === CategoryAttributesTypes.NUMERIC) {
              if (attrValue.valueNumber !== null && attrValue.valueNumber !== undefined) {
                value = attrValue.valueNumber;
              } else if (attrValue.valueString !== null && attrValue.valueString !== undefined && attrValue.valueString !== "") {
                // Try to parse string as number
                const numValue = Number(attrValue.valueString);
                value = !isNaN(numValue) ? numValue : attrValue.valueString;
              }
            } else {
              // For non-numeric attributes, use standard priority
              if (attrValue.valueString !== null && attrValue.valueString !== undefined && attrValue.valueString !== "") {
                value = attrValue.valueString;
              } else if (attrValue.valueNumber !== null && attrValue.valueNumber !== undefined) {
                value = attrValue.valueNumber;
              } else if (attrValue.valueBoolean !== null && attrValue.valueBoolean !== undefined) {
                value = attrValue.valueBoolean;
              } else if (attrValue.valueDate) {
                const date = new Date(attrValue.valueDate);
                if (!isNaN(date.getTime())) {
                  if (attr.type === CategoryAttributesTypes.DATE) {
                    value = date.toISOString().split('T')[0];
                  } else {
                    value = date.getFullYear().toString();
                  }
                }
              }
            }
          }

          if (value !== "" && value !== null && value !== undefined) {
            attributeValuesObj[attr.name] = value;
          }

          if (isYearAttribute) {
            if (typeof value === "string" && value) {
              const match = value.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
              if (match) {
                newYearFields[attr.name] = { start: match[1] };
              } else if (/^\d{4}$/.test(value.trim())) {
                newYearFields[attr.name] = { start: value.trim() };
              } else {
                newYearFields[attr.name] = { start: "" };
              }
            } else if (typeof value === "number") {
              newYearFields[attr.name] = { start: value.toString() };
            } else {
              newYearFields[attr.name] = { start: "" };
            }
          }
        } else if (isYearAttribute) {
          newYearFields[attr.name] = { start: "" };
        }
      });
    }

    setFormData({
      origin: application.origin || "Nueva aplicación",
      attributeValues: attributeValuesObj,
    });
    setYearFields(newYearFields);
  }, [application, applicationAttributes]);

  useEffect(() => {
    if (!open) {
      setIsSaving(false);
    }
  }, [open]);

  const validateRequiredFields = (): string | null => {
    for (const attr of applicationAttributes) {
      if (!attr.required) continue;

      if (isYearAttributeName(attr.name)) {
        const yearState = yearFields[attr.name] || { start: "" };
        const startYear = parseInt(yearState.start, 10);
        if (!yearState.start.trim() || isNaN(startYear) || startYear < 1900 || startYear > 2100) {
          return `El campo "${translateAttributeName(attr.name, false)}" es obligatorio (año válido entre 1900 y 2100).`;
        }
        continue;
      }

      const value = formData.attributeValues[attr.name];
      if (!hasAttributeValue(value)) {
        return `El campo "${translateAttributeName(attr.name, false)}" es obligatorio.`;
      }
    }
    return null;
  };

  const buildCreateAttributes = (yearValue?: number): AttributePayload[] => {
    return applicationAttributes
      .map((attr) => {
        const isYearAttr = isYearAttributeName(attr.name);
        const attributeValue: AttributePayload = {
          idAttribute: attr.id!,
          valueString: null,
          valueNumber: null,
          valueBoolean: null,
          valueDate: null,
        };

        if (isYearAttr && yearValue !== undefined) {
          attributeValue.valueDate = new Date(yearValue, 0, 1);
          return attributeValue;
        }

        const value = formData.attributeValues[attr.name];
        if (!hasAttributeValue(value)) return attributeValue;

        if (attr.type === CategoryAttributesTypes.STRING) {
          attributeValue.valueString = String(value);
        } else if (attr.type === CategoryAttributesTypes.NUMERIC) {
          attributeValue.valueNumber = Number(value);
        } else if (attr.type === CategoryAttributesTypes.BOOLEAN) {
          attributeValue.valueBoolean = Boolean(value);
        } else if (attr.type === CategoryAttributesTypes.DATE) {
          if (value instanceof Date) {
            attributeValue.valueDate = value;
          } else if (typeof value === "string") {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              attributeValue.valueDate = date;
            }
          }
        }

        return attributeValue;
      })
      .filter(
        (attr) =>
          attr.valueString !== null ||
          attr.valueNumber !== null ||
          attr.valueBoolean !== null ||
          attr.valueDate !== null
      );
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!productId) {
      toast({
        title: "Error",
        description: "No se pudo identificar el producto asociado.",
        variant: "destructive",
      });
      return;
    }

    const validationError = validateRequiredFields();
    if (validationError) {
      toast({
        title: "Campos incompletos",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    if (!application) {
      setIsSaving(true);
      try {
        const productResponse = await client.get(`/products/${productId}`);
        const productSku = productResponse.data?.sku as string | undefined;

        if (!productSku) {
          toast({
            title: "Error",
            description: "No se pudo obtener el SKU del producto.",
            variant: "destructive",
          });
          return;
        }

        const yearAttribute = applicationAttributes.find((attr) =>
          isYearAttributeName(attr.name)
        );
        let yearValue: number | undefined;
        if (yearAttribute) {
          const yearState = yearFields[yearAttribute.name] || { start: "" };
          yearValue = parseInt(yearState.start, 10);
        }

        const createData = {
          sku: productSku,
          origin: formData.origin || "Nueva aplicación",
          idProduct: productId,
          attributes: buildCreateAttributes(yearValue),
        };

        await client.post("/applications", createData);

        toast({
          title: "Aplicación creada",
          description: "La aplicación se creó exitosamente.",
          variant: "success",
        });

        onOpenChange(false);
        onSuccess?.();
      } catch (error: unknown) {
        const apiError = error as { response?: { data?: { error?: string } }; message?: string };
        toast({
          title: "Error al crear aplicación",
          description:
            apiError.response?.data?.error ||
            apiError.message ||
            "Error desconocido.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!application.id) return;

    setIsSaving(true);
    try {
      const existingAttrMap = new Map<string, Record<string, unknown>>();
      if (application.attributeValues) {
        application.attributeValues.forEach((av) => {
          const avRecord = av as Record<string, unknown>;
          const attrId =
            (avRecord.idAttribute as string | undefined) ||
            ((avRecord.attribute as { id?: string } | undefined)?.id);
          if (attrId) {
            existingAttrMap.set(attrId, avRecord);
          }
        });
      }

      const attributesToSend = applicationAttributes
        .map((attr) => {
          const formValue = formData.attributeValues[attr.name];
          const existingAttr = existingAttrMap.get(attr.id!);

          const attributeValue: AttributePayload = {
            idAttribute: attr.id!,
            valueString: null,
            valueNumber: null,
            valueBoolean: null,
            valueDate: null,
          };

          const isYearAttribute = isYearAttributeName(attr.name);

          let hasFormValue = false;
          if (formValue !== undefined && formValue !== null) {
            if (typeof formValue === "string") {
              hasFormValue = formValue.trim() !== "";
            } else {
              hasFormValue = true;
            }
          }

          if (hasFormValue) {
            if (isYearAttribute) {
              const yearString =
                typeof formValue === "string" ? formValue : String(formValue);
              const match = yearString.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
              const yearToSave = match
                ? parseInt(match[1], 10)
                : parseInt(yearString, 10);
              if (!isNaN(yearToSave) && yearToSave >= 1900 && yearToSave <= 2100) {
                attributeValue.valueNumber = yearToSave;
              }
            } else {
              const normalizedType = String(attr.type || "").toLowerCase();

              if (
                normalizedType === "string" ||
                normalizedType === CategoryAttributesTypes.STRING
              ) {
                attributeValue.valueString = String(formValue);
              } else if (
                normalizedType === "number" ||
                normalizedType === "numeric" ||
                normalizedType === CategoryAttributesTypes.NUMERIC
              ) {
                let numValue: number;
                if (typeof formValue === "string") {
                  numValue = parseFloat(formValue.trim());
                } else {
                  numValue = Number(formValue);
                }
                if (!isNaN(numValue) && isFinite(numValue)) {
                  attributeValue.valueNumber = numValue;
                } else {
                  const strValue = String(formValue).trim();
                  if (strValue && !isNaN(Number(strValue))) {
                    attributeValue.valueNumber = Number(strValue);
                  }
                }
              } else if (
                normalizedType === "boolean" ||
                normalizedType === CategoryAttributesTypes.BOOLEAN
              ) {
                attributeValue.valueBoolean = Boolean(formValue);
              } else if (
                normalizedType === "date" ||
                normalizedType === CategoryAttributesTypes.DATE
              ) {
                if (formValue instanceof Date) {
                  attributeValue.valueDate = formValue;
                } else if (typeof formValue === "string") {
                  const date = new Date(formValue);
                  if (!isNaN(date.getTime())) {
                    attributeValue.valueDate = date;
                  }
                }
              } else {
                attributeValue.valueString = String(formValue);
              }
            }
          } else if (existingAttr) {
            if (isYearAttribute) {
              if (
                existingAttr.valueNumber !== null &&
                existingAttr.valueNumber !== undefined
              ) {
                attributeValue.valueNumber = existingAttr.valueNumber as number;
              } else if (existingAttr.valueString) {
                const num = parseInt(String(existingAttr.valueString), 10);
                if (!isNaN(num)) attributeValue.valueNumber = num;
              } else if (existingAttr.valueDate) {
                const date = new Date(String(existingAttr.valueDate));
                if (!isNaN(date.getTime())) {
                  attributeValue.valueNumber = date.getFullYear();
                }
              }
            } else {
              attributeValue.valueString =
                (existingAttr.valueString as string | null) ?? null;
              attributeValue.valueNumber =
                (existingAttr.valueNumber as number | null) ?? null;
              attributeValue.valueBoolean =
                (existingAttr.valueBoolean as boolean | null) ?? null;
              attributeValue.valueDate =
                (existingAttr.valueDate as Date | null) ?? null;
            }
          }

          return attributeValue;
        })
        .filter(
          (attr) =>
            attr.valueString !== null ||
            attr.valueNumber !== null ||
            attr.valueBoolean !== null ||
            attr.valueDate !== null
        );

      const updateData = {
        origin: formData.origin || null,
        attributes: attributesToSend,
      };

      await client.patch(`/applications/${application.id}`, updateData);

      toast({
        title: "Aplicación actualizada",
        description: "Los cambios se guardaron correctamente.",
        variant: "success",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      toast({
        title: "Error al actualizar aplicación",
        description:
          apiError.response?.data?.error ||
          apiError.message ||
          "Error desconocido.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAttributeChange = (
    attrName: string,
    value: string | number | boolean | Date | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      attributeValues: {
        ...prev.attributeValues,
        [attrName]: value,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{application ? "Editar Aplicación" : "Agregar Aplicación"}</DialogTitle>
          <DialogDescription>
            {application
              ? "Edita la información de la aplicación."
              : "Completa la información para crear una nueva aplicación. Los campos marcados con * son obligatorios."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="origin">
              Origen <span className="text-red-500">*</span>
              <span className="text-muted-foreground font-normal ml-1">(obligatorio)</span>
            </Label>
            <Select
              value={formData.origin}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, origin: value }))
              }
            >
              <SelectTrigger id="origin">
                <SelectValue placeholder="Selecciona un origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nueva aplicación">Nueva aplicación</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Attributes */}
          {applicationAttributes.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <div>
                <h3 className="text-sm font-semibold">Información del Vehículo</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-red-500">*</span> obligatorio · sin asterisco = opcional
                </p>
              </div>
              <div className="flex flex-col gap-4 max-h-[min(50vh,420px)] overflow-y-auto pr-1">
                {applicationAttributes.map((attr) => (
                  <div key={attr.id} className="space-y-2">
                    <Label>
                      {translateAttributeName(attr.name, false)}
                      {attr.required ? (
                        <span className="text-red-500 ml-1">*</span>
                      ) : (
                        <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                      )}
                    </Label>
                    {(() => {
                      const isYearAttribute = isYearAttributeName(attr.name);

                      if (isYearAttribute) {
                        const currentYearState = yearFields[attr.name] || { start: "" };

                        const handleYearChange = (newValue: string) => {
                          setYearFields({
                            ...yearFields,
                            [attr.name]: { start: newValue },
                          });
                          handleAttributeChange(attr.name, newValue);
                        };

                        return (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min="1900"
                              max="2100"
                              value={currentYearState.start}
                              onChange={(e) => handleYearChange(e.target.value)}
                              placeholder="1998"
                            />
                            <p className="text-xs text-muted-foreground">
                              Se creará una aplicación para el año indicado.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <DynamicComponent
                          type={attr.type}
                          name={attr.name}
                          required={attr.required}
                          value={formData.attributeValues[attr.name]}
                          onChange={(value) => handleAttributeChange(attr.name, value)}
                        />
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {applicationAttributes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Esta categoría no tiene atributos de aplicación definidos.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!formData.origin || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {application ? "Guardando..." : "Creando..."}
              </>
            ) : application ? (
              "Guardar Cambios"
            ) : (
              "Crear Aplicación"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditApplicationDialog;

