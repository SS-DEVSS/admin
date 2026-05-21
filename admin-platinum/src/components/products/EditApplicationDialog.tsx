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
    attributeValues: {} as Record<string, any>,
  });
  
  // Local state for year fields to allow free editing
  const [yearFields, setYearFields] = useState<Record<string, { start: string; end: string }>>({});

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
    const attributeValuesObj: Record<string, any> = {};
    const newYearFields: Record<string, { start: string; end: string }> = {};

    if (application.attributeValues && applicationAttributes.length > 0) {
      applicationAttributes.forEach((attr) => {
        const isYearAttribute = attr.name.toLowerCase().includes("año") || 
                               attr.name.toLowerCase().includes("anio") || 
                               attr.name.toLowerCase().includes("year");
        
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
                newYearFields[attr.name] = { start: match[1], end: "" };
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
        } else if (isYearAttribute) {
          newYearFields[attr.name] = { start: "", end: "" };
        }
      });
    }

    setFormData({
      origin: application.origin || "Nueva aplicación",
      attributeValues: attributeValuesObj,
    });
    setYearFields(newYearFields);
  }, [application, applicationAttributes]);

  const handleSave = async () => {
    if (!productId) {
      toast({
        title: "Error",
        description: "No se pudo identificar el producto asociado.",
        variant: "destructive",
      });
      return;
    }

    // If creating new application (application is null)
    if (!application) {
      // Find year attribute to check for range
      const yearAttribute = applicationAttributes.find(
        (attr) =>
          attr.name.toLowerCase().includes("año") ||
          attr.name.toLowerCase().includes("anio") ||
          attr.name.toLowerCase().includes("year")
      );

      if (yearAttribute) {
        const yearState = yearFields[yearAttribute.name] || { start: "", end: "" };
        const startYear = parseInt(yearState.start, 10);
        const endYear = yearState.end ? parseInt(yearState.end, 10) : null;

        // Validate years
        if (isNaN(startYear) || startYear < 1900 || startYear > 2100) {
          toast({
            title: "Error",
            description: "Por favor, ingresa un año de inicio válido (1900-2100).",
            variant: "destructive",
          });
          return;
        }

        if (endYear !== null && (isNaN(endYear) || endYear < 1900 || endYear > 2100 || endYear < startYear)) {
          toast({
            title: "Error",
            description: "Por favor, ingresa un año de fin válido (debe ser mayor o igual al año de inicio).",
            variant: "destructive",
          });
          return;
        }

        // Determine years to create
        const yearsToCreate: number[] = [];
        if (endYear !== null && endYear !== startYear) {
          // Create applications for each year in the range
          for (let year = startYear; year <= endYear; year++) {
            yearsToCreate.push(year);
          }
        } else {
          // Single year
          yearsToCreate.push(startYear);
        }

        try {
          // Get product SKU
          const productResponse = await client.get(`/products/${productId}`);
          const productSku = productResponse.data?.sku;

          if (!productSku) {
            toast({
              title: "Error",
              description: "No se pudo obtener el SKU del producto.",
              variant: "destructive",
            });
            return;
          }

          // Create applications for each year
          const createdApplications = [];
          for (const year of yearsToCreate) {
            // Build attributes array
            const attributes = applicationAttributes.map((attr) => {
              const isYearAttr =
                attr.name.toLowerCase().includes("año") ||
                attr.name.toLowerCase().includes("anio") ||
                attr.name.toLowerCase().includes("year");

              const attributeValue: any = {
                idAttribute: attr.id!,
                valueString: null,
                valueNumber: null,
                valueBoolean: null,
                valueDate: null,
              };

              if (isYearAttr) {
                // Set the year as valueDate
                attributeValue.valueDate = new Date(year, 0, 1);
              } else {
                // Get value from formData
                const value = formData.attributeValues[attr.name];
                if (value !== undefined && value !== null && value !== "") {
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
                }
              }

              return attributeValue;
            });

            // Create application
            // Include all attributes, even if empty (backend will handle null values)
            const attributesToSend = attributes.map((attr) => attr);

            const createData = {
              sku: productSku,
              origin: formData.origin || "Nueva aplicación",
              idProduct: productId,
              attributes: attributesToSend.filter(
                (attr) =>
                  attr.valueString !== null ||
                  attr.valueNumber !== null ||
                  attr.valueBoolean !== null ||
                  attr.valueDate !== null
              ),
            };

            const response = await client.post("/applications", createData);
            createdApplications.push(response.data);
          }

          toast({
            title: "Aplicaciones creadas",
            description: `Se ${createdApplications.length === 1 ? "creó" : "crearon"} ${createdApplications.length} aplicación${createdApplications.length === 1 ? "" : "es"} exitosamente. ${endYear !== null && endYear !== startYear ? "Se integrarán automáticamente a los grupos correspondientes si coinciden." : ""}`,
            variant: "success",
          });

          onOpenChange(false);
          onSuccess?.();
          return;
        } catch (error: any) {
          toast({
            title: "Error al crear aplicaciones",
            description: error.response?.data?.error || error.message || "Error desconocido.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    // If updating existing application
    if (!application || !application.id) return;

    try {
      // Get existing attribute values from the application to preserve unchanged ones
      const existingAttrMap = new Map<string, any>();
      if (application.attributeValues) {
        application.attributeValues.forEach((av: any) => {
          const attrId = av.idAttribute || av.attribute?.id;
          if (attrId) {
            existingAttrMap.set(attrId, av);
          }
        });
      }

      // Build attributes: include ALL attributes, using formData if changed, otherwise existing values
      const attributesToSend = applicationAttributes.map((attr) => {
        const formValue = formData.attributeValues[attr.name];
        const existingAttr = existingAttrMap.get(attr.id!);

        const attributeValue: any = {
          idAttribute: attr.id!,
          valueString: null,
          valueNumber: null,
          valueBoolean: null,
          valueDate: null,
        };

        const isYearAttribute =
          attr.name.toLowerCase().includes("año") ||
          attr.name.toLowerCase().includes("anio") ||
          attr.name.toLowerCase().includes("year");

        // Check if form has a value (including 0 for numbers, false for booleans)
        // IMPORTANT: Always use formValue if it exists, even if it's the same as existing
        // This ensures user changes are saved even if they type the same value
        // For strings: must not be empty after trim
        // For numbers: 0 is valid
        // For booleans: false is valid
        let hasFormValue = false;
        if (formValue !== undefined && formValue !== null) {
          if (typeof formValue === "string") {
            hasFormValue = formValue.trim() !== "";
          } else {
            // For numbers (including 0), booleans (including false), and other types
            hasFormValue = true;
          }
        }
        
        // If form has a value, ALWAYS use it (user may have changed it)
        if (hasFormValue) {
          if (isYearAttribute) {
            const yearString = typeof formValue === "string" ? formValue : String(formValue);
            const match = yearString.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
            const yearToSave = match ? parseInt(match[1], 10) : parseInt(yearString, 10);
            if (!isNaN(yearToSave) && yearToSave >= 1900 && yearToSave <= 2100) {
              attributeValue.valueNumber = yearToSave; // store year as number
            }
          } else {
            // Normalize attr.type to handle case-insensitive comparison
            const normalizedType = String(attr.type || '').toLowerCase();
            
            if (normalizedType === "string" || normalizedType === CategoryAttributesTypes.STRING) {
              attributeValue.valueString = String(formValue);
            } else if (normalizedType === "number" || normalizedType === "numeric" || normalizedType === CategoryAttributesTypes.NUMERIC) {
              // Convert to number - handle both string and number inputs
              let numValue: number;
              if (typeof formValue === "string") {
                // Remove any whitespace and parse
                numValue = parseFloat(formValue.trim());
              } else {
                numValue = Number(formValue);
              }
              // Allow 0, negative numbers, and decimals
              if (!isNaN(numValue) && isFinite(numValue)) {
                attributeValue.valueNumber = numValue;
              } else {
                // If conversion failed, try to preserve as string if it's a valid numeric string
                const strValue = String(formValue).trim();
                if (strValue && !isNaN(Number(strValue))) {
                  attributeValue.valueNumber = Number(strValue);
                } else {
                  console.warn(`⚠️ Failed to convert "${formValue}" to number`);
                }
              }
            } else if (normalizedType === "boolean" || normalizedType === CategoryAttributesTypes.BOOLEAN) {
              attributeValue.valueBoolean = Boolean(formValue);
            } else if (normalizedType === "date" || normalizedType === CategoryAttributesTypes.DATE) {
              if (formValue instanceof Date) {
                attributeValue.valueDate = formValue;
              } else if (typeof formValue === "string") {
                const date = new Date(formValue);
                if (!isNaN(date.getTime())) {
                  attributeValue.valueDate = date;
                }
              }
            } else {
              console.warn(`⚠️ Unknown type: "${normalizedType}", defaulting to string`);
              attributeValue.valueString = String(formValue);
            }
          }
        } else if (existingAttr) {
          // Preserve existing value if form doesn't have it
          if (isYearAttribute) {
            // Prefer number; if only date exists, convert to year number
            if (existingAttr.valueNumber !== null && existingAttr.valueNumber !== undefined) {
              attributeValue.valueNumber = existingAttr.valueNumber;
            } else if (existingAttr.valueString) {
              const num = parseInt(String(existingAttr.valueString), 10);
              if (!isNaN(num)) attributeValue.valueNumber = num;
            } else if (existingAttr.valueDate) {
              const date = new Date(existingAttr.valueDate);
              if (!isNaN(date.getTime())) {
                attributeValue.valueNumber = date.getFullYear();
              }
            }
          } else {
            attributeValue.valueString = existingAttr.valueString ?? null;
            attributeValue.valueNumber = existingAttr.valueNumber ?? null;
            attributeValue.valueBoolean = existingAttr.valueBoolean ?? null;
            attributeValue.valueDate = existingAttr.valueDate ?? null;
          }
        }

        return attributeValue;
      })
      // Only include attributes that have at least one value set
      .filter((attr) => {
        const hasValue = attr.valueString !== null ||
          attr.valueNumber !== null ||
          attr.valueBoolean !== null ||
          attr.valueDate !== null;
        if (!hasValue) {
          console.warn(`⚠️ Filtering out attribute (no value):`, attr);
        }
        return hasValue;
      });

      const updateData = {
        origin: formData.origin || null,
        attributes: attributesToSend,
      };

      await client.patch(`/applications/${application.id}`, updateData);

      toast({
        title: "Aplicación actualizada",
        variant: "success",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error al actualizar aplicación",
        description: error.response?.data?.error || error.message || "Error desconocido. Nota: El endpoint de actualización de aplicaciones aún no está implementado en el backend.",
        variant: "destructive",
      });
    }
  };

  const handleAttributeChange = (attrName: string, value: any) => {
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
              ? "Edita la información de la aplicación. Todos los campos son editables."
              : "Completa la información para crear una nueva aplicación. Puedes especificar un rango de años para crear múltiples aplicaciones que se integrarán automáticamente a los grupos correspondientes."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="origin">
              Origen <span className="text-red-500">*</span>
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
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold">Información del Vehículo</h3>
              <div className="grid grid-cols-2 gap-4">
                {applicationAttributes.map((attr) => (
                  <div key={attr.id} className="space-y-2">
                    <Label>
                      {attr.required && <span className="text-red-500 mr-1">*</span>}
                      {translateAttributeName(attr.name, false)}
                    </Label>
                    {(() => {
                      const isYearAttribute =
                        attr.name.toLowerCase().includes("año") ||
                        attr.name.toLowerCase().includes("anio") ||
                        attr.name.toLowerCase().includes("year");

                      if (isYearAttribute) {
                        // Get current year state or initialize with empty values
                        const currentYearState = yearFields[attr.name] || { start: "", end: "" };

                        const handleYearChange = (field: "start" | "end", newValue: string) => {
                          // Update local year fields state
                          const updatedState = {
                            start: field === "start" ? newValue : currentYearState.start,
                            end: field === "end" ? newValue : currentYearState.end,
                          };
                          
                          setYearFields({
                            ...yearFields,
                            [attr.name]: updatedState,
                          });
                          
                          // For now, save the start year (the range will be handled in handleSave)
                          // If both start and end are provided, we'll create multiple applications
                          handleAttributeChange(attr.name, updatedState.start);
                        };

                        // Year range input (allows creating multiple applications)
                        return (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Año Inicio</Label>
                                <Input
                                  type="number"
                                  min="1900"
                                  max="2100"
                                  value={currentYearState.start}
                                  onChange={(e) => handleYearChange("start", e.target.value)}
                                  placeholder="1998"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Año Fin (opcional)</Label>
                                <Input
                                  type="number"
                                  min="1900"
                                  max="2100"
                                  value={currentYearState.end}
                                  onChange={(e) => handleYearChange("end", e.target.value)}
                                  placeholder="2024"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {currentYearState.end && currentYearState.end !== "" 
                                ? `Se crearán aplicaciones para cada año desde ${currentYearState.start} hasta ${currentYearState.end}. Si coinciden con un grupo existente, se integrarán automáticamente.`
                                : `Se creará una aplicación para el año ${currentYearState.start || "especificado"}. Si coincide con un grupo existente, se integrará automáticamente.`}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!formData.origin}>
            {application ? "Guardar Cambios" : "Crear Aplicación(es)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditApplicationDialog;

