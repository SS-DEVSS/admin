import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Product } from "@/models/product";
import { Application } from "@/models/application";
import { PlusCircle, Pencil, ChevronDown, ChevronUp, Trash2, MoreVertical, Info } from "lucide-react";
import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import { toast } from "@/hooks/use-toast";
import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import NoData from "../NoData";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditApplicationDialog from "./EditApplicationDialog";
import { CategoryAtributes } from "@/models/category";
import { useCategoryContext } from "@/context/categories-context";
import axiosClient from "@/services/axiosInstance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const APPLICATIONS_NOTE =
  'Cada aplicación muestra información del vehículo (Modelo, Submodelo, Año, etc.) seguida de un identificador único entre paréntesis. Este identificador corresponde a los últimos 8 caracteres del ID de la aplicación en la base de datos, lo que permite diferenciar cada aplicación y facilitar su búsqueda o referencia si es necesario. Si aparece "BASE" o "Aplicación", significa que esa aplicación no tiene información adicional de vehículo, pero el identificador único permite diferenciarla de las demás.';

type ApplicationsCardProps = {
  state: {
    applications: Application[];
  };
  setState: React.Dispatch<React.SetStateAction<{ applications: Application[] }>>;
  product?: Product | null;
};

type GroupedApplication = {
  applications: Application[];
  origin: string | null;
  fabricante: string | null;
  modelo: string | null;
  submodelo: string | null;
  añoMin: number | null;
  añoMax: number | null;
  litrosMotor: number | string | null;
  ccMotor: number | string | null;
  cidMotor: number | string | null;
  cilindrosMotor: number | string | null;
  bloqueMotor: string | null;
  motorDescripcion: string | null;
  especificaciones: string | null;
};

type ApplicationActionsMenuProps = {
  application: Application;
  onEdit: (application: Application) => void;
  onDelete: (application: Application) => void;
};

const ApplicationActionsMenu = ({
  application,
  onEdit,
  onDelete,
}: ApplicationActionsMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/50">
        <span className="sr-only">Abrir menú de acciones</span>
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
      <DropdownMenuItem onSelect={() => onEdit(application)}>
        <Pencil className="mr-2 h-4 w-4" />
        Editar
      </DropdownMenuItem>
      <DropdownMenuItem
        className="text-destructive focus:text-destructive"
        onSelect={() => onDelete(application)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Eliminar
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const ApplicationsCard = ({ state, setState, product }: ApplicationsCardProps) => {
  const { categories } = useCategoryContext();
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // Always use table view - list view removed
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Get category attributes (only application attributes)
  const categoryAttributes = useMemo(() => {
    const productCategory = (product as any)?.category || product?.idCategory;
    if (!productCategory) return [];
    const categoryId = typeof productCategory === 'string' ? productCategory : (productCategory as any).id;
    const category = categories.find((c) => c.id === categoryId);
    if (!category?.attributes) return [];

    if (Array.isArray(category.attributes)) {
      // Filter to only application attributes
      return category.attributes.filter((attr) => {
        const scope = String(attr.scope || '').toUpperCase();
        return scope === "APPLICATION" || scope === "APLICACION";
      });
    }

    if (typeof category.attributes === 'object' && 'application' in category.attributes) {
      return (category.attributes as { application: CategoryAtributes[] }).application || [];
    }

    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(product as any)?.category, product?.idCategory, categories]);


  const handleAddClick = () => {
    // Open edit dialog with null application to create a new one
    setEditingApplication(null);
    setIsEditDialogOpen(true);
  };



  const toggleRowExpand = (index: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleEditApplication = (application: Application) => {
    setEditingApplication(application);
    setIsEditDialogOpen(true);
  };

  const confirmDeleteApplication = async () => {
    if (!deleteTarget?.id) return;
    setDeleteLoading(true);
    try {
      await axiosClient().delete(`/applications/${deleteTarget.id}`);
      setState((prev) => ({
        applications: prev.applications.filter((app) => app.id !== deleteTarget.id),
      }));
      toast({ title: "Aplicación eliminada", variant: "success" });
      setDeleteTarget(null);
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Error al eliminar aplicación";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Helper function to format applications (same logic as newProduct.tsx)
  // Using useCallback to avoid dependency issues
  const formatApplications = useCallback((applications: any[]): Application[] => {
    return applications.map((app: any) => {

      // Extract key attributes from attributeValues
      const getAttributeValue = (attrName: string) => {
        const attr = app.attributeValues?.find((av: any) =>
          av.attribute?.name === attrName ||
          av.attribute?.name?.toLowerCase() === attrName.toLowerCase()
        );
        if (!attr) return null;

        const isYearAttribute = attrName.toLowerCase().includes("año") ||
          attrName.toLowerCase().includes("anio") ||
          attrName.toLowerCase().includes("year");

        // For year attributes, prioritize valueNumber (as it's stored now)
        if (isYearAttribute) {
          if (attr.valueNumber !== null && attr.valueNumber !== undefined) {
            return attr.valueNumber.toString();
          }
          // Fallback to valueDate if valueNumber not available
          if (attr.valueDate) {
            const date = new Date(attr.valueDate);
            if (!isNaN(date.getTime())) {
              return date.getFullYear().toString();
            }
            const dateStr = String(attr.valueDate);
            const yearMatch = dateStr.match(/^(\d{4})/);
            if (yearMatch) {
              return yearMatch[1];
            }
          }
          // Last resort: valueString
          if (attr.valueString) {
            const str = String(attr.valueString);
            const yearMatch = str.match(/^(\d{4})/);
            if (yearMatch) {
              return yearMatch[1];
            }
            return str;
          }
          return null;
        }

        // For non-year attributes, use standard priority
        return attr.valueString || attr.valueNumber || attr.valueBoolean || null;
      };

      // Try common attribute names
      const modelo = getAttributeValue('Modelo');
      const submodelo = getAttributeValue('Submodelo');
      const año = getAttributeValue('Año');
      const litrosMotor = getAttributeValue('Litros_Motor');
      const ccMotor = getAttributeValue('CC_Motor');
      const cidMotor = getAttributeValue('CID_Motor');
      const cilindrosMotor = getAttributeValue('Cilindros_Motor');
      const bloqueMotor = getAttributeValue('Bloque_Motor');
      const motor = getAttributeValue('Motor');
      const tipoMotor = getAttributeValue('Tipo_Motor');
      const transmision = getAttributeValue('Transmisión') || getAttributeValue('Transmision');

      // Build display text from available attributes
      const parts: string[] = [];

      if (modelo) parts.push(String(modelo));
      if (submodelo) parts.push(String(submodelo));
      if (año) {
        // Ensure año is always just the year number, never a timestamp
        let añoStr = String(año);
        // If it looks like a timestamp or ISO date, extract just the year
        if (añoStr.includes('T') || (añoStr.includes('-') && añoStr.length > 4)) {
          const yearMatch = añoStr.match(/^(\d{4})/);
          if (yearMatch) {
            añoStr = yearMatch[1];
          }
        }
        // Also handle if it's a number - just convert to string
        if (typeof año === 'number') {
          añoStr = año.toString();
        }
        parts.push(añoStr);
      }

      if (motor) {
        parts.push(String(motor));
      } else if (tipoMotor) {
        parts.push(String(tipoMotor));
      } else if (litrosMotor) {
        parts.push(`${litrosMotor}L`);
      } else if (ccMotor) {
        parts.push(`${ccMotor}CC`);
      } else if (cidMotor) {
        parts.push(`${cidMotor}CID`);
      }

      if (cilindrosMotor && !motor) {
        parts.push(`${cilindrosMotor}cil`);
      }

      if (bloqueMotor) {
        parts.push(bloqueMotor);
      }

      if (transmision) {
        parts.push(transmision);
      }

      // Always append a short version of the ID
      const shortId = app.id.substring(app.id.length - 8).toUpperCase();

      // Build display text
      let displayText = '';
      if (parts.length > 0) {
        displayText = `${parts.join(' - ')} (${shortId})`;
      } else {
        displayText = `Aplicación (${shortId})`;
      }

      return {
        id: app.id,
        sku: app.sku || "",
        origin: app.origin || null,
        attributeValues: app.attributeValues || [],
        displayText: displayText,
      } as Application;
    });
  }, []);

  // Load applications from product when editing (using useEffect to avoid render issues)
  useEffect(() => {
    if (!product) {
      return;
    }

    const productApplications = (product as any).applications;

    if (productApplications && productApplications.length > 0) {
      // Always format applications to ensure they have proper structure
      // This ensures the table grouping works correctly from the start
      const formattedApplications = formatApplications(productApplications);

      // Always update to ensure applications are formatted correctly
      // This ensures grouping works correctly even if state already has applications
      setState({ applications: formattedApplications });
    } else {
      // Ensure state is set to empty array if no applications
      setState({ applications: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, formatApplications]); // Include formatApplications in deps to ensure it uses the latest version

  const handleEditSuccess = async () => {
    // Refresh applications from backend if product ID is available
    if (product?.id) {
      try {
        const client = axiosClient();
        const response = await client.get(`/applications/product/${product.id}`);
        if (response.data?.applications) {
          // Format applications before setting state
          const formattedApplications = formatApplications(response.data.applications);
          setState({ applications: formattedApplications });
        }
      } catch (error) {
      }
    }
  };

  // Helper function to extract attribute value from application
  const getAttributeValue = (application: Application, attrName: string): any => {
    const attr = application.attributeValues?.find((av: any) =>
      av.attribute?.name === attrName ||
      av.attribute?.name?.toLowerCase() === attrName.toLowerCase()
    );
    if (!attr) return null;

    const isYearAttribute = attrName.toLowerCase().includes("año") ||
      attrName.toLowerCase().includes("anio") ||
      attrName.toLowerCase().includes("year");

    // For year attributes, prioritize valueNumber (as it's stored now)
    if (isYearAttribute) {
      if (attr.valueNumber !== null && attr.valueNumber !== undefined) {
        return attr.valueNumber;
      }
      // Fallback to valueDate if valueNumber not available
      if (attr.valueDate) {
        const date = new Date(attr.valueDate);
        if (!isNaN(date.getTime())) {
          return date.getFullYear();
        }
      }
      // Last resort: valueString
      if (attr.valueString) {
        const str = String(attr.valueString);
        const yearMatch = str.match(/^(\d{4})/);
        if (yearMatch) {
          return parseInt(yearMatch[1], 10);
        }
        return str;
      }
      return null;
    }

    // For non-year attributes, use standard priority
    return attr.valueString || attr.valueNumber || attr.valueBoolean || null;
  };

  // Helper function to get grouping key (all attributes except Año)
  const getGroupingKey = (application: Application): string => {
    const origin = application.origin || "";
    const fabricante = getAttributeValue(application, 'Fabricante') || "";
    const modelo = getAttributeValue(application, 'Modelo') || "";
    const submodelo = getAttributeValue(application, 'Submodelo') || "";
    const litrosMotor = getAttributeValue(application, 'Litros_Motor') || "";
    const ccMotor = getAttributeValue(application, 'CC_Motor') || "";
    const cidMotor = getAttributeValue(application, 'CID_Motor') || "";
    const cilindrosMotor = getAttributeValue(application, 'Cilindros_Motor') || "";
    const bloqueMotor = getAttributeValue(application, 'Bloque_Motor') || "";
    const motor = getAttributeValue(application, 'Motor') || "";
    const tipoMotor = getAttributeValue(application, 'Tipo_Motor') || "";
    const transmision = getAttributeValue(application, 'Transmisión') || getAttributeValue(application, 'Transmision') || "";

    // Create key from all attributes except Año
    return `${origin}|${fabricante}|${modelo}|${submodelo}|${litrosMotor}|${ccMotor}|${cidMotor}|${cilindrosMotor}|${bloqueMotor}|${motor}|${tipoMotor}|${transmision}`;
  };

  // Helper function to extract year value (single year, not range)
  const extractYear = (application: Application): number | null => {
    // First, try to get from attributeValues directly (checking valueDate)
    const attr = application.attributeValues?.find((av: any) => {
      const attrName = av.attribute?.name || "";
      return attrName.toLowerCase().includes("año") ||
        attrName.toLowerCase().includes("anio") ||
        attrName.toLowerCase().includes("year");
    });

    if (attr) {
      // Prioritize valueNumber (as year is stored as number now)
      if (attr.valueNumber !== null && attr.valueNumber !== undefined) {
        return typeof attr.valueNumber === 'number' ? attr.valueNumber : parseInt(String(attr.valueNumber), 10);
      }

      // Fallback to valueDate - extract year from date
      if (attr.valueDate) {
        const date = new Date(attr.valueDate);
        if (!isNaN(date.getTime())) {
          return date.getFullYear();
        }
      }

      // Handle valueString (could be range or single year)
      if (attr.valueString) {
        const match = attr.valueString.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
        if (match) {
          return parseInt(match[1], 10); // Return first year only
        }
        const singleYear = parseInt(attr.valueString, 10);
        if (!isNaN(singleYear)) return singleYear;
      }

      // Handle valueNumber (legacy support)
      if (typeof attr.valueNumber === "number") {
        return attr.valueNumber;
      }
    }

    // Fallback to getAttributeValue helper
    const añoValue = getAttributeValue(application, 'Año');
    if (!añoValue) return null;

    // If it's a range string like "1998-2024", extract the first year
    if (typeof añoValue === "string") {
      const match = añoValue.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
      if (match) {
        return parseInt(match[1], 10); // Return first year only
      }
      // If it's just a single year string
      const singleYear = parseInt(añoValue, 10);
      if (!isNaN(singleYear)) return singleYear;
    }

    // If it's a number
    if (typeof añoValue === "number") {
      return añoValue;
    }

    return null;
  };

  // Group applications by similarity (all attributes except Año)
  const groupedApplications = useMemo((): GroupedApplication[] => {
    if (state.applications.length === 0) {
      return [];
    }

    // Group applications by their grouping key
    const groups = new Map<string, Application[]>();

    state.applications.forEach((app: Application) => {
      const key = getGroupingKey(app);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(app);
    });


    // Convert groups to GroupedApplication format
    const grouped = Array.from(groups.entries()).map(([, applications]) => {
      const firstApp = applications[0];

      // Extract all years from applications in this group
      const years = applications
        .map(app => extractYear(app))
        .filter((year): year is number => year !== null)
        .sort((a, b) => a - b);

      const añoMin = years.length > 0 ? years[0] : null;
      const añoMax = years.length > 0 ? years[years.length - 1] : null;

      // Extract motor description (build from available motor attributes)
      const motor = getAttributeValue(firstApp, 'Motor');
      const tipoMotor = getAttributeValue(firstApp, 'Tipo_Motor');
      const litrosMotor = getAttributeValue(firstApp, 'Litros_Motor');
      const ccMotor = getAttributeValue(firstApp, 'CC_Motor');
      const cilindrosMotor = getAttributeValue(firstApp, 'Cilindros_Motor');
      const bloqueMotor = getAttributeValue(firstApp, 'Bloque_Motor');

      let motorDescripcion = "";
      if (motor) {
        motorDescripcion = String(motor);
      } else if (tipoMotor) {
        motorDescripcion = String(tipoMotor);
      } else {
        const parts: string[] = [];
        if (bloqueMotor) parts.push(String(bloqueMotor));
        if (cilindrosMotor) parts.push(`${cilindrosMotor}cil`);
        if (litrosMotor) parts.push(`${litrosMotor}L`);
        else if (ccMotor) parts.push(`${ccMotor}CC`);
        motorDescripcion = parts.join(" ");
      }

      // Build especificaciones (Transmisión, etc.)
      const transmision = getAttributeValue(firstApp, 'Transmisión') || getAttributeValue(firstApp, 'Transmision');
      const especificacionesParts: string[] = [];
      // You can add more specifications here as needed
      if (transmision) especificacionesParts.push(String(transmision));
      const especificaciones = especificacionesParts.length > 0 ? especificacionesParts.join(" | ") : null;

      return {
        applications,
        origin: firstApp.origin,
        fabricante: getAttributeValue(firstApp, 'Fabricante'),
        modelo: getAttributeValue(firstApp, 'Modelo'),
        submodelo: getAttributeValue(firstApp, 'Submodelo'),
        añoMin,
        añoMax,
        litrosMotor: getAttributeValue(firstApp, 'Litros_Motor'),
        ccMotor: getAttributeValue(firstApp, 'CC_Motor'),
        cidMotor: getAttributeValue(firstApp, 'CID_Motor'),
        cilindrosMotor: getAttributeValue(firstApp, 'Cilindros_Motor'),
        bloqueMotor: getAttributeValue(firstApp, 'Bloque_Motor'),
        motorDescripcion: motorDescripcion || null,
        especificaciones,
      };
    });

    return grouped;
  }, [state.applications]);

  // Helper function to format application display text
  const getApplicationDisplayText = (application: Application): string => {
    // If there's a displayText property (from formatted applications), use it
    if ((application as any).displayText) {
      return (application as any).displayText;
    }

    // Build display text from attribute values
    if (application.attributeValues && application.attributeValues.length > 0) {
      const parts: string[] = [];

      const normalizeToYear = (input: any): string | null => {
        if (input === null || input === undefined) return null;
        const str = String(input);
        const yearMatch = str.match(/^(\d{4})/);
        if (yearMatch) return yearMatch[1];
        return null;
      };

      application.attributeValues.forEach((attr: any) => {
        const attrName = attr.attribute?.name || "";
        const isYearAttribute = attrName.toLowerCase().includes("año") ||
          attrName.toLowerCase().includes("anio") ||
          attrName.toLowerCase().includes("year");

        let value: any = null;

        if (isYearAttribute) {
          // Prioritize valueNumber (as it's stored now)
          if (attr.valueNumber !== null && attr.valueNumber !== undefined) {
            value = attr.valueNumber.toString();
          } else if (attr.valueString) {
            // If it's a string, try to extract year
            const normalized = normalizeToYear(attr.valueString);
            value = normalized ?? attr.valueString;
          } else if (attr.valueDate) {
            // If it's a date, extract year
            const date = new Date(attr.valueDate);
            if (!isNaN(date.getTime())) {
              value = date.getFullYear().toString();
            } else {
              const normalized = normalizeToYear(attr.valueDate);
              value = normalized ?? null;
            }
          } else {
            value = null;
          }

          // Final check: if value is still a long string/timestamp, extract year
          if (value && typeof value === "string" && (value.includes('T') || value.length > 4)) {
            const normalized = normalizeToYear(value);
            if (normalized) value = normalized;
          }
        } else if (attr.valueDate) {
          // Para otros atributos de fecha, mostrar solo el año en el preview
          const date = new Date(attr.valueDate);
          if (!isNaN(date.getTime())) {
            value = date.getFullYear().toString();
          } else {
            const normalized = normalizeToYear(attr.valueDate);
            value = normalized ?? attr.valueDate;
          }
        } else {
          // Fallback a string/number/boolean
          value = attr.valueString ?? attr.valueNumber ?? attr.valueBoolean;
          // Si parece timestamp/ISO y tiene año, muestra solo el año
          if (typeof value === "string" && value.length > 4) {
            const normalized = normalizeToYear(value);
            if (normalized) value = normalized;
          }
        }

        // If value is a string that looks like a timestamp, extract year
        if (typeof value === "string" && isYearAttribute) {
          if (value.includes('T') || (value.includes('-') && value.length > 4)) {
            const yearMatch = value.match(/^(\d{4})/);
            if (yearMatch) {
              value = yearMatch[1];
            }
          }
        }

        if (value !== null && value !== undefined && attrName) {
          parts.push(`${attrName}: ${value}`);
        }
      });
      if (parts.length > 0) {
        return parts.join(", ");
      }
    }

    // Fallback to ID
    const idSuffix = application.id ? application.id.substring(application.id.length - 8).toUpperCase() : '-';
    return `Aplicación (${idSuffix})`;
  };

  return (
    <Card className="w-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Aplicaciones</CardTitle>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Información sobre aplicaciones"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm text-left leading-relaxed">
                    {APPLICATIONS_NOTE}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription className="mt-1.5">
              Ingrese las aplicaciones asociadas al producto.
            </CardDescription>
          </div>
          <Button
            size="sm"
            type="button"
            className="shrink-0 bg-brand-orange text-[#002858] hover:bg-[#D9680F] hover:text-[#002858]"
            onClick={handleAddClick}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Agregar Aplicación
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {state.applications.length === 0 ? (
          <NoData>
            <p className="text-[#94A3B8] font-medium">
              No hay aplicaciones asociadas
            </p>
          </NoData>
        ) : (
          // Table view with grouped applications
          (() => {
            return (
              <div className="w-full overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Origen</TableHead>
                      <TableHead>Fabricante</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Submodelo</TableHead>
                      <TableHead>Año</TableHead>
                      <TableHead>Litros Motor</TableHead>
                      <TableHead>CC Motor</TableHead>
                      <TableHead>CID Motor</TableHead>
                      <TableHead>Cilindros Motor</TableHead>
                      <TableHead>Bloque Motor</TableHead>
                      <TableHead>Motor Descripción</TableHead>
                      <TableHead>Especificaciones</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedApplications.map((group, index) => {
                      const isExpanded = expandedRows.has(index);
                      return (
                        <React.Fragment key={index}>
                          <TableRow>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {group.applications.length > 1 && (
                                  <button
                                    onClick={() => toggleRowExpand(index)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                    title={isExpanded ? "Colapsar" : "Expandir para ver aplicaciones"}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                                <span>{group.origin || "-"}</span>
                                {group.applications.length > 1 && (
                                  <span className="text-xs text-gray-500">
                                    ({group.applications.length} aplicaciones)
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{group.fabricante || "-"}</TableCell>
                            <TableCell>{group.modelo || "-"}</TableCell>
                            <TableCell>{group.submodelo || "-"}</TableCell>
                            <TableCell>
                              {group.añoMin && group.añoMax
                                ? group.añoMin === group.añoMax
                                  ? String(group.añoMin)
                                  : `${group.añoMin}-${group.añoMax}`
                                : group.añoMin
                                  ? String(group.añoMin)
                                  : "-"}
                            </TableCell>
                            <TableCell>{group.litrosMotor ? String(group.litrosMotor) : "-"}</TableCell>
                            <TableCell>{group.ccMotor ? String(group.ccMotor) : "-"}</TableCell>
                            <TableCell>{group.cidMotor ? String(group.cidMotor) : "-"}</TableCell>
                            <TableCell>{group.cilindrosMotor ? String(group.cilindrosMotor) : "-"}</TableCell>
                            <TableCell>{group.bloqueMotor || "-"}</TableCell>
                            <TableCell>{group.motorDescripcion || "-"}</TableCell>
                            <TableCell>{group.especificaciones || "-"}</TableCell>
                            <TableCell>
                              {group.applications.length > 0 && (
                                <ApplicationActionsMenu
                                  application={group.applications[0]}
                                  onEdit={handleEditApplication}
                                  onDelete={setDeleteTarget}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                          {isExpanded && group.applications.length > 0 && (
                            <TableRow className="bg-gray-50">
                              <TableCell colSpan={13} className="p-4">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm mb-3">
                                    Aplicaciones individuales en este grupo ({group.applications.length}):
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {group.applications.map((app) => (
                                      <div
                                        key={app.id}
                                        className="bg-white border rounded-lg p-3 flex items-center justify-between gap-3 min-w-[200px]"
                                      >
                                        <div className="flex-1">
                                          <p className="text-sm font-medium">
                                            {getApplicationDisplayText(app)}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            ID: {app.id.substring(app.id.length - 8).toUpperCase()}
                                          </p>
                                        </div>
                                        <ApplicationActionsMenu
                                          application={app}
                                          onEdit={handleEditApplication}
                                          onDelete={setDeleteTarget}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            );
          })()
        )}
      </CardContent>

      <EditApplicationDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        application={editingApplication}
        categoryAttributes={categoryAttributes}
        productId={product?.id}
        onSuccess={handleEditSuccess}
      />

      <ConfirmActionDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar aplicación"
        description="Se eliminará esta aplicación del producto."
        consequences={["La aplicación y sus atributos asociados se eliminarán permanentemente."]}
        loading={deleteLoading}
        onConfirm={confirmDeleteApplication}
      />
    </Card>
  );
};

export default ApplicationsCard;

