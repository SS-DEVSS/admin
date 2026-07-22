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
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import NoData from "../NoData";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
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
import {
  extractApplicationYear,
  extractYearFromAttributeValue,
  extractYearFromDate,
} from "@/utils/applicationYear";

const APPLICATIONS_NOTE =
  'Cada aplicación muestra información del vehículo (Modelo, Submodelo, Año, etc.) seguida de un identificador único entre paréntesis. Este identificador corresponde a los últimos 8 caracteres del ID de la aplicación en la base de datos, lo que permite diferenciar cada aplicación y facilitar su búsqueda o referencia si es necesario. Si aparece "BASE" o "Aplicación", significa que esa aplicación no tiene información adicional de vehículo, pero el identificador único permite diferenciarla de las demás.';

function getApplicationIds(applications: Application[]): string[] {
  return applications
    .map((application) => application.id)
    .filter((id): id is string => Boolean(id));
}

function getGroupSelectionState(
  selectedIds: Set<string>,
  applications: Application[]
): boolean | "indeterminate" {
  const ids = getApplicationIds(applications);
  if (ids.length === 0) return false;

  const selectedCount = ids.filter((id) => selectedIds.has(id)).length;
  if (selectedCount === 0) return false;
  if (selectedCount === ids.length) return true;
  return "indeterminate";
}

type ApplicationsCardProps = {
  state: {
    applications: Application[];
  };
  setState: React.Dispatch<React.SetStateAction<{ applications: Application[] }>>;
  product?: Product | null;
  onApplicationsChange?: (applications: Application[]) => void;
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
  deleteApplications?: Application[];
  onEdit: (application: Application) => void;
  onDelete: (applications: Application[]) => void;
};

const ApplicationActionsMenu = ({
  application,
  deleteApplications,
  onEdit,
  onDelete,
}: ApplicationActionsMenuProps) => {
  const applicationsToDelete = deleteApplications ?? [application];
  const deleteCount = applicationsToDelete.length;
  const deleteLabel =
    deleteCount > 1 ? `Eliminar grupo (${deleteCount})` : "Eliminar";

  return (
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
        onSelect={() => onDelete(applicationsToDelete)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {deleteLabel}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  );
};

type ApplicationDeleteTarget = {
  applications: Application[];
  isGroupDelete: boolean;
};

const ApplicationsCard = ({
  state,
  setState,
  product,
  onApplicationsChange,
}: ApplicationsCardProps) => {
  const { categories } = useCategoryContext();
  const hydratedProductIdRef = useRef<string | null>(null);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // Always use table view - list view removed
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ApplicationDeleteTarget | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const allApplicationIds = useMemo(
    () => getApplicationIds(state.applications),
    [state.applications]
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === allApplicationIds.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(allApplicationIds));
  };

  const toggleSelectGroup = (applications: Application[]) => {
    const ids = getApplicationIds(applications);
    if (ids.length === 0) return;

    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (allSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const removeApplicationsLocally = useCallback(
    (applications: Application[]) => {
      const idsToRemove = new Set(getApplicationIds(applications));
      if (idsToRemove.size === 0) return;

      setState((prev) => {
        const nextApplications = prev.applications.filter(
          (application) => !application.id || !idsToRemove.has(application.id),
        );
        onApplicationsChange?.(nextApplications);
        return { applications: nextApplications };
      });

      setSelectedIds((prev) => {
        const next = new Set(prev);
        idsToRemove.forEach((applicationId) => next.delete(applicationId));
        return next;
      });
    },
    [setState, onApplicationsChange],
  );

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
            const year = extractYearFromDate(attr.valueDate);
            if (year !== null) {
              return year.toString();
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

  const refreshApplicationsFromBackend = useCallback(async () => {
    if (!product?.id) return;

    try {
      const response = await axiosClient().get(`/applications/product/${product.id}`);
      const backendApplications = response.data?.applications ?? [];
      const formattedApplications = formatApplications(backendApplications);
      setState({ applications: formattedApplications });
      onApplicationsChange?.(formattedApplications);
    } catch {
      // Keep current list if refresh fails
    }
  }, [product?.id, formatApplications, setState, onApplicationsChange]);

  const handleDeleteApplications = (applications: Application[]) => {
    if (applications.length === 0) return;

    if (applications.length === 1) {
      removeApplicationsLocally(applications);
      return;
    }

    setDeleteTarget({
      applications,
      isGroupDelete: true,
    });
  };

  const getDeleteTargetDescription = (target: ApplicationDeleteTarget): string => {
    if (!target.isGroupDelete) {
      return "Se eliminará esta aplicación del producto.";
    }

    const years = target.applications
      .map((application) => extractYear(application))
      .filter((year): year is number => year !== null)
      .sort((a, b) => a - b);

    const yearLabel =
      years.length > 0
        ? years[0] === years[years.length - 1]
          ? String(years[0])
          : `${years[0]}-${years[years.length - 1]}`
        : null;

    const yearText = yearLabel ? ` (años ${yearLabel})` : "";
    return `Se eliminarán ${target.applications.length} aplicaciones agrupadas${yearText}.`;
  };

  const confirmDeleteApplication = () => {
    if (!deleteTarget) return;
    removeApplicationsLocally(deleteTarget.applications);
    setDeleteTarget(null);
  };

  const confirmBulkDeleteApplications = () => {
    const applicationIds = Array.from(selectedIds);
    if (applicationIds.length === 0) return;

    const applicationsToRemove = state.applications.filter(
      (application) => application.id && applicationIds.includes(application.id),
    );
    removeApplicationsLocally(applicationsToRemove);
    clearSelection();
    setBulkDeleteOpen(false);
  };

  // Hydrate once per product from parent payload; avoid overwriting after local deletes/edits
  useEffect(() => {
    if (!product?.id) return;
    if (hydratedProductIdRef.current === product.id) return;

    hydratedProductIdRef.current = product.id;
    const productApplications = (product as { applications?: unknown[] }).applications ?? [];

    if (productApplications.length > 0) {
      setState({ applications: formatApplications(productApplications) });
    } else {
      setState({ applications: [] });
    }
  }, [product?.id, formatApplications, setState]);

  const handleEditSuccess = async () => {
    await refreshApplicationsFromBackend();
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
      return extractYearFromAttributeValue(attr);
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

  const extractYear = (application: Application): number | null =>
    extractApplicationYear(application.attributeValues);

  const buildMotorDescripcion = (application: Application): string | null => {
    const motor = getAttributeValue(application, "Motor");
    const tipoMotor = getAttributeValue(application, "Tipo_Motor");
    const litrosMotor = getAttributeValue(application, "Litros_Motor");
    const ccMotor = getAttributeValue(application, "CC_Motor");
    const cilindrosMotor = getAttributeValue(application, "Cilindros_Motor");
    const bloqueMotor = getAttributeValue(application, "Bloque_Motor");

    if (motor) return String(motor);
    if (tipoMotor) return String(tipoMotor);

    const parts: string[] = [];
    if (bloqueMotor) parts.push(String(bloqueMotor));
    if (cilindrosMotor) parts.push(`${cilindrosMotor}cil`);
    if (litrosMotor) parts.push(`${litrosMotor}L`);
    else if (ccMotor) parts.push(`${ccMotor}CC`);

    return parts.length > 0 ? parts.join(" ") : null;
  };

  const buildEspecificaciones = (application: Application): string | null => {
    const transmision =
      getAttributeValue(application, "Transmisión") ||
      getAttributeValue(application, "Transmision");
    return transmision ? String(transmision) : null;
  };

  const sortApplicationsByYear = (applications: Application[]): Application[] => {
    return [...applications].sort((a, b) => {
      const yearA = extractYear(a);
      const yearB = extractYear(b);
      if (yearA === null && yearB === null) return 0;
      if (yearA === null) return 1;
      if (yearB === null) return -1;
      return yearA - yearB;
    });
  };

  const formatCellValue = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  };

  const splitApplicationsByConsecutiveYears = (
    applications: Application[]
  ): Application[][] => {
    const sorted = sortApplicationsByYear(applications);
    if (sorted.length === 0) return [];
    if (sorted.length === 1) return [sorted];

    const chunks: Application[][] = [];
    let currentChunk: Application[] = [sorted[0]];
    let previousYear = extractYear(sorted[0]);

    for (let index = 1; index < sorted.length; index += 1) {
      const application = sorted[index];
      const year = extractYear(application);
      const belongsToSameBlock =
        previousYear !== null &&
        year !== null &&
        (year === previousYear || year === previousYear + 1);

      if (belongsToSameBlock) {
        currentChunk.push(application);
        if (year !== null) {
          previousYear = year;
        }
      } else {
        chunks.push(currentChunk);
        currentChunk = [application];
        previousYear = year;
      }
    }

    chunks.push(currentChunk);
    return chunks;
  };

  const buildGroupedApplication = (applications: Application[]): GroupedApplication => {
    const sortedApplications = sortApplicationsByYear(applications);
    const firstApp = sortedApplications[0];
    const years = sortedApplications
      .map((app) => extractYear(app))
      .filter((year): year is number => year !== null);

    return {
      applications: sortedApplications,
      origin: firstApp.origin,
      fabricante: getAttributeValue(firstApp, "Fabricante"),
      modelo: getAttributeValue(firstApp, "Modelo"),
      submodelo: getAttributeValue(firstApp, "Submodelo"),
      añoMin: years.length > 0 ? years[0] : null,
      añoMax: years.length > 0 ? years[years.length - 1] : null,
      litrosMotor: getAttributeValue(firstApp, "Litros_Motor"),
      ccMotor: getAttributeValue(firstApp, "CC_Motor"),
      cidMotor: getAttributeValue(firstApp, "CID_Motor"),
      cilindrosMotor: getAttributeValue(firstApp, "Cilindros_Motor"),
      bloqueMotor: getAttributeValue(firstApp, "Bloque_Motor"),
      motorDescripcion: buildMotorDescripcion(firstApp),
      especificaciones: buildEspecificaciones(firstApp),
    };
  };

  // Group applications by similarity (all attributes except Año), then split by consecutive years
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


    // Convert groups to GroupedApplication format, splitting non-consecutive years
    const grouped: GroupedApplication[] = [];

    groups.forEach((applications) => {
      splitApplicationsByConsecutiveYears(applications).forEach((chunk) => {
        grouped.push(buildGroupedApplication(chunk));
      });
    });

    return grouped.sort((a, b) => {
      const minA = a.añoMin ?? Number.MAX_SAFE_INTEGER;
      const minB = b.añoMin ?? Number.MAX_SAFE_INTEGER;
      if (minA !== minB) return minA - minB;
      return (a.añoMax ?? 0) - (b.añoMax ?? 0);
    });
  }, [state.applications]);

  return (
    <Card className="w-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
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
            className="w-full shrink-0 bg-brand-orange text-[#002858] hover:bg-[#D9680F] hover:text-[#002858] sm:w-auto"
            onClick={handleAddClick}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Agregar Aplicación
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {selectedIds.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3">
            <span className="text-sm font-medium">
              {selectedIds.size} seleccionada(s)
            </span>
            <Button size="sm" variant="ghost" type="button" onClick={clearSelection}>
              Deseleccionar todo
            </Button>
            <Button
              size="sm"
              variant="destructive"
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar seleccionadas
            </Button>
          </div>
        )}
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
                      <TableHead className="w-10 px-2">
                        <Checkbox
                          checked={
                            allApplicationIds.length > 0 &&
                            selectedIds.size === allApplicationIds.length
                              ? true
                              : selectedIds.size > 0
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={toggleSelectAll}
                          aria-label="Seleccionar todas las aplicaciones"
                        />
                      </TableHead>
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
                            <TableCell className="w-10 px-2">
                              <Checkbox
                                checked={getGroupSelectionState(selectedIds, group.applications)}
                                onCheckedChange={() => toggleSelectGroup(group.applications)}
                                aria-label="Seleccionar grupo de aplicaciones"
                              />
                            </TableCell>
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
                                  deleteApplications={group.applications}
                                  onEdit={handleEditApplication}
                                  onDelete={handleDeleteApplications}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                          {isExpanded &&
                            group.applications.map((app) => {
                              const year = extractYear(app);
                              return (
                                <TableRow key={app.id} className="bg-muted/30 hover:bg-muted/40">
                                  <TableCell className="w-10 px-2">
                                    {app.id && (
                                      <Checkbox
                                        checked={selectedIds.has(app.id)}
                                        onCheckedChange={() => toggleSelectOne(app.id as string)}
                                        aria-label="Seleccionar aplicación"
                                      />
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <span className="pl-6">{formatCellValue(app.origin)}</span>
                                  </TableCell>
                                  <TableCell>
                                    {formatCellValue(getAttributeValue(app, "Fabricante"))}
                                  </TableCell>
                                  <TableCell>
                                    {formatCellValue(getAttributeValue(app, "Modelo"))}
                                  </TableCell>
                                  <TableCell>
                                    {formatCellValue(getAttributeValue(app, "Submodelo"))}
                                  </TableCell>
                                  <TableCell>{year ? String(year) : "-"}</TableCell>
                                  <TableCell>
                                    {formatCellValue(getAttributeValue(app, "Litros_Motor"))}
                                  </TableCell>
                                  <TableCell>
                                    {formatCellValue(getAttributeValue(app, "CC_Motor"))}
                                  </TableCell>
                                  <TableCell>
                                    {formatCellValue(getAttributeValue(app, "CID_Motor"))}
                                  </TableCell>
                                  <TableCell>
                                    {formatCellValue(getAttributeValue(app, "Cilindros_Motor"))}
                                  </TableCell>
                                  <TableCell>
                                    {formatCellValue(getAttributeValue(app, "Bloque_Motor"))}
                                  </TableCell>
                                  <TableCell>
                                    {formatCellValue(buildMotorDescripcion(app))}
                                  </TableCell>
                                  <TableCell>
                                    {formatCellValue(buildEspecificaciones(app))}
                                  </TableCell>
                                  <TableCell>
                                    <ApplicationActionsMenu
                                      application={app}
                                      onEdit={handleEditApplication}
                                      onDelete={handleDeleteApplications}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
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
        title="Eliminar grupo de aplicaciones"
        description={
          deleteTarget ? getDeleteTargetDescription(deleteTarget) : undefined
        }
        consequences={[
          deleteTarget
            ? `Se quitarán ${deleteTarget.applications.length} aplicaciones del listado. Los cambios se aplicarán al guardar el producto.`
            : "Los cambios se aplicarán al guardar el producto.",
        ]}
        onConfirm={confirmDeleteApplication}
      />

      <ConfirmActionDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Eliminar aplicaciones seleccionadas"
        description={`Se quitarán ${selectedIds.size} aplicación(es) del listado.`}
        consequences={[
          "Las aplicaciones seleccionadas se eliminarán al guardar el producto.",
        ]}
        onConfirm={confirmBulkDeleteApplications}
      />
    </Card>
  );
};

export default ApplicationsCard;

