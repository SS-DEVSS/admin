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
import { useMemo, useState, useEffect, useRef } from "react";
import axiosClient from "@/services/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { translateAttributeName } from "@/utils/attributeTranslations";
import { createYearDate, extractYearFromDate } from "@/utils/applicationYear";
import { Loader2 } from "lucide-react";

type AttributeFormValues = Record<string, string | number | boolean | Date | undefined>;

type AttributePayload = {
  idAttribute: string;
  valueString: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueDate: Date | null;
};

type YearFieldState = { start: string; end: string };

const isDateAttribute = (attr: CategoryAtributes): boolean => {
  const normalizedType = String(attr.type || "").toLowerCase();
  return normalizedType === "date" || normalizedType === CategoryAttributesTypes.DATE;
};

const isYearAttributeName = (name: string): boolean => {
  const lower = name.toLowerCase();
  return lower.includes("año") || lower.includes("anio") || lower.includes("year");
};

const findDateAttributeForYearRange = (
  attributes: CategoryAtributes[]
): CategoryAtributes | undefined => {
  const yearNamed = attributes.find(
    (attr) => isDateAttribute(attr) && isYearAttributeName(attr.name)
  );
  if (yearNamed) return yearNamed;
  return attributes.find((attr) => isDateAttribute(attr));
};

const resolveYearsToCreate = (
  startStr: string,
  endStr: string,
  options?: { optional?: boolean }
): { years: number[] | null } | { error: string } => {
  const startTrimmed = startStr.trim();
  const endTrimmed = endStr.trim();

  if (!startTrimmed) {
    if (endTrimmed) {
      return { error: "Ingresa un año de inicio antes del año de fin." };
    }
    if (options?.optional) {
      return { years: null };
    }
    return { error: "Ingresa un año de inicio válido (1900-2100)." };
  }

  const startYear = parseInt(startTrimmed, 10);
  if (isNaN(startYear) || startYear < 1900 || startYear > 2100) {
    return { error: "Ingresa un año de inicio válido (1900-2100)." };
  }

  if (!endTrimmed) {
    return { years: [startYear] };
  }

  const endYear = parseInt(endTrimmed, 10);
  if (isNaN(endYear) || endYear < 1900 || endYear > 2100) {
    return { error: "Ingresa un año de fin válido (1900-2100)." };
  }
  if (endYear < startYear) {
    return { error: "El año de fin debe ser mayor o igual al año de inicio." };
  }

  const years: number[] = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }
  return { years };
};

const hasAttributeValue = (value: string | number | boolean | Date | undefined): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
};

const applyFormValueToAttributePayload = (
  attr: CategoryAtributes,
  formValue: string | number | boolean | Date | undefined,
  attributeValue: AttributePayload
): void => {
  if (!hasAttributeValue(formValue)) return;

  if (isYearAttributeName(attr.name) && !isDateAttribute(attr)) {
    const yearString = typeof formValue === "string" ? formValue : String(formValue);
    const match = yearString.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
    const yearToSave = match ? parseInt(match[1], 10) : parseInt(yearString, 10);
    if (!isNaN(yearToSave) && yearToSave >= 1900 && yearToSave <= 2100) {
      attributeValue.valueNumber = yearToSave;
    }
    return;
  }

  const normalizedType = String(attr.type || "").toLowerCase();

  if (
    normalizedType === "string" ||
    normalizedType === "text" ||
    normalizedType === CategoryAttributesTypes.STRING
  ) {
    attributeValue.valueString = String(formValue);
  } else if (
    normalizedType === "number" ||
    normalizedType === "numeric" ||
    normalizedType === "integer" ||
    normalizedType === "decimal" ||
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
  } else if (isDateAttribute(attr)) {
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
};

const sortApplicationAttributes = (
  attributes: CategoryAtributes[]
): CategoryAtributes[] =>
  [...attributes].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

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
      return sortApplicationAttributes(
        categoryAttributes.filter((attr) => {
          const scope = String(attr.scope || "").toUpperCase();
          return scope === "APPLICATION" || scope === "APLICACION";
        })
      );
    }

    if (typeof categoryAttributes === "object" && "application" in categoryAttributes) {
      return sortApplicationAttributes(
        (categoryAttributes as { application: CategoryAtributes[] }).application || []
      );
    }
    
    return [];
  }, [categoryAttributes]);

  const yearRangeDateAttribute = useMemo(
    () => findDateAttributeForYearRange(applicationAttributes),
    [applicationAttributes]
  );

  // Initialize form state from application
  const [formData, setFormData] = useState({
    origin: "Nueva aplicación",
    attributeValues: {} as AttributeFormValues,
  });

  const [yearFields, setYearFields] = useState<Record<string, YearFieldState>>({});
  const wasOpenRef = useRef(false);

  const resetCreateForm = () => {
    setFormData({
      origin: "Nueva aplicación",
      attributeValues: {},
    });
    setYearFields({});
  };

  // Reset or hydrate form when the dialog opens or the target application changes
  useEffect(() => {
    if (!open) {
      setIsSaving(false);
      wasOpenRef.current = false;
      return;
    }

    const didJustOpen = !wasOpenRef.current;
    wasOpenRef.current = true;

    if (!application) {
      if (didJustOpen) {
        resetCreateForm();
      }
      return;
    }

    // Convert attributeValues array to object by attribute name
    const attributeValuesObj: AttributeFormValues = {};
    const newYearFields: Record<string, YearFieldState> = {};

    if (application.attributeValues && applicationAttributes.length > 0) {
      applicationAttributes.forEach((attr) => {
        const isYearAttribute = isYearAttributeName(attr.name);
        const isDateYearField =
          isDateAttribute(attr) &&
          yearRangeDateAttribute?.id === attr.id;
        
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
              const year = extractYearFromDate(attrValue.valueDate);
              if (year !== null) {
                value = year.toString();
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
                    value = date.toISOString().split("T")[0];
                  } else {
                    const year = extractYearFromDate(date);
                    value = year !== null ? year.toString() : "";
                  }
                }
              }
            }
          }

          if (value !== "" && value !== null && value !== undefined) {
            attributeValuesObj[attr.name] = value;
          }

          if (isDateYearField || isYearAttribute) {
            if (typeof value === "string" && value) {
              const match = value.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
              if (match) {
                newYearFields[attr.name] = { start: match[1], end: match[2] };
              } else if (/^\d{4}$/.test(value.trim())) {
                newYearFields[attr.name] = { start: value.trim(), end: "" };
              } else {
                newYearFields[attr.name] = { start: "", end: "" };
              }
            } else if (typeof value === "number") {
              newYearFields[attr.name] = { start: value.toString(), end: "" };
            } else {
              newYearFields[attr.name] = { start: "", end: "" };
            }
          }
        } else if (isDateYearField) {
          newYearFields[attr.name] = { start: "", end: "" };
        }
      });
    }

    setFormData({
      origin: application.origin || "Nueva aplicación",
      attributeValues: attributeValuesObj,
    });
    setYearFields(newYearFields);
  }, [open, application, applicationAttributes, yearRangeDateAttribute?.id]);

  const validateRequiredFields = (): string | null => {
    for (const attr of applicationAttributes) {
      if (!attr.required) continue;

      const isDateYearField =
        isDateAttribute(attr) && yearRangeDateAttribute?.id === attr.id;

      if (isDateYearField) {
        const yearState = yearFields[attr.name] || { start: "", end: "" };
        const startYear = parseInt(yearState.start, 10);
        if (!yearState.start.trim() || isNaN(startYear) || startYear < 1900 || startYear > 2100) {
          return `El campo "${translateAttributeName(attr.name, false)}" es obligatorio (año válido entre 1900 y 2100).`;
        }
        if (yearState.end.trim()) {
          const endYear = parseInt(yearState.end, 10);
          if (isNaN(endYear) || endYear < 1900 || endYear > 2100 || endYear < startYear) {
            return `El año de fin de "${translateAttributeName(attr.name, false)}" no es válido.`;
          }
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

  const buildCreateAttributes = (
    yearValue: number | undefined,
    yearAttrId: string | undefined
  ): AttributePayload[] => {
    return applicationAttributes
      .map((attr) => {
        const attributeValue: AttributePayload = {
          idAttribute: attr.id!,
          valueString: null,
          valueNumber: null,
          valueBoolean: null,
          valueDate: null,
        };

        if (
          yearAttrId !== undefined &&
          attr.id === yearAttrId &&
          isDateAttribute(attr)
        ) {
          if (yearValue !== undefined) {
            attributeValue.valueDate = createYearDate(yearValue);
          }
          return attributeValue;
        }

        applyFormValueToAttributePayload(
          attr,
          formData.attributeValues[attr.name],
          attributeValue
        );

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

        let yearsToCreate: number[] | null = null;
        let yearAttrId: string | undefined;

        if (yearRangeDateAttribute?.id) {
          yearAttrId = yearRangeDateAttribute.id;
          const yearState = yearFields[yearRangeDateAttribute.name] || {
            start: "",
            end: "",
          };
          const resolved = resolveYearsToCreate(yearState.start, yearState.end, {
            optional: !yearRangeDateAttribute.required,
          });
          if ("error" in resolved) {
            toast({
              title: "Año no válido",
              description: resolved.error,
              variant: "destructive",
            });
            return;
          }
          yearsToCreate = resolved.years;
        }

        let createdCount = 0;

        if (yearsToCreate && yearAttrId) {
          const createData = {
            sku: productSku,
            origin: formData.origin || "Nueva aplicación",
            idProduct: productId,
            attributes: buildCreateAttributes(undefined, yearAttrId),
            years: yearsToCreate,
            yearAttributeId: yearAttrId,
          };
          const response = await client.post("/applications/bulk", createData);
          createdCount = response.data?.createdCount ?? yearsToCreate.length;
        } else {
          const createData = {
            sku: productSku,
            origin: formData.origin || "Nueva aplicación",
            idProduct: productId,
            attributes: buildCreateAttributes(undefined, yearAttrId),
          };
          await client.post("/applications", createData);
          createdCount = 1;
        }

        const isRange = createdCount > 1;
        toast({
          title: isRange ? "Aplicaciones creadas" : "Aplicación creada",
          description: isRange
            ? `Se crearon ${createdCount} aplicaciones (una por año). Si coinciden con un grupo existente, se integrarán automáticamente.`
            : "La aplicación se creó exitosamente.",
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
                const year = extractYearFromDate(String(existingAttr.valueDate));
                if (year !== null) {
                  attributeValue.valueNumber = year;
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
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{application ? "Editar Aplicación" : "Agregar Aplicación"}</DialogTitle>
          <DialogDescription>
            {application
              ? "Edita la información de la aplicación."
              : "Completa la información para crear una nueva aplicación. Si el atributo de fecha tiene rango de años, se creará una aplicación por cada año."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto -mx-6 px-6">
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
              <div className="flex flex-col gap-4">
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
                      const isDateYearField =
                        isDateAttribute(attr) &&
                        yearRangeDateAttribute?.id === attr.id;

                      if (isDateYearField) {
                        const currentYearState = yearFields[attr.name] || {
                          start: "",
                          end: "",
                        };

                        const handleYearChange = (
                          field: "start" | "end",
                          newValue: string
                        ) => {
                          const updatedState = {
                            start:
                              field === "start" ? newValue : currentYearState.start,
                            end: field === "end" ? newValue : currentYearState.end,
                          };
                          setYearFields({
                            ...yearFields,
                            [attr.name]: updatedState,
                          });
                          handleAttributeChange(attr.name, updatedState.start);
                        };

                        if (!application) {
                          const endYear = currentYearState.end.trim()
                            ? parseInt(currentYearState.end, 10)
                            : null;
                          const startYear = currentYearState.start.trim()
                            ? parseInt(currentYearState.start, 10)
                            : null;
                          const appsToCreate =
                            startYear &&
                            endYear &&
                            !isNaN(startYear) &&
                            !isNaN(endYear) &&
                            endYear >= startYear
                              ? endYear - startYear + 1
                              : 1;

                          return (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">
                                    Año inicio
                                    {attr.required && (
                                      <span className="text-red-500 ml-0.5">*</span>
                                    )}
                                  </Label>
                                  <Input
                                    type="number"
                                    min="1900"
                                    max="2100"
                                    value={currentYearState.start}
                                    onChange={(e) =>
                                      handleYearChange("start", e.target.value)
                                    }
                                    placeholder="2001"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">
                                    Año fin (opcional)
                                  </Label>
                                  <Input
                                    type="number"
                                    min="1900"
                                    max="2100"
                                    value={currentYearState.end}
                                    onChange={(e) =>
                                      handleYearChange("end", e.target.value)
                                    }
                                    placeholder="2017"
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {!attr.required &&
                                !currentYearState.start.trim() &&
                                !currentYearState.end.trim()
                                  ? "Opcional. Puedes dejarlo vacío y crear la aplicación sin año."
                                  : currentYearState.end.trim()
                                    ? `Se crearán ${appsToCreate} aplicación(es), una por cada año, con los mismos datos y solo cambiando el año.`
                                    : currentYearState.start.trim()
                                      ? "Se creará una aplicación para el año indicado. Agrega año fin para crear una por cada año del rango."
                                      : "Opcional. Agrega año inicio (y fin si aplica) para crear una o más aplicaciones por año."}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min="1900"
                              max="2100"
                              value={currentYearState.start}
                              onChange={(e) => handleYearChange("start", e.target.value)}
                              placeholder="1998"
                            />
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
        </div>

        <DialogFooter className="shrink-0 border-t pt-4">
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
            ) : yearRangeDateAttribute ? (
              "Crear Aplicación(es)"
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

