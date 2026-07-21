import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { translateAttributeName } from "@/utils/attributeTranslations";

interface Attribute {
  id: string;
  name: string;
  csvName?: string | null;
  required?: boolean;
}

interface CoreAttribute {
  id: string;
  name: string;
  csvName: string;
  type: "core";
}

interface MappingTargetRow {
  targetId: string;
  label: string;
  required: boolean;
  section: "core" | "category";
}

interface ColumnMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headers: string[];
  attributes: Attribute[];
  coreAttributes?: CoreAttribute[];
  suggestedMappings: { [csvColumn: string]: string };
  requiredAttributes: string[];
  onConfirm: (mapping: { [csvColumn: string]: string | null }) => void;
  initialMapping?: { [csvColumn: string]: string | null };
}

function invertCsvToTargetMapping(
  csvToTarget: { [csvColumn: string]: string | null | undefined },
  targetIds: Set<string>
): Record<string, string | null> {
  const targetToCsv: Record<string, string | null> = {};
  targetIds.forEach((id) => {
    targetToCsv[id] = null;
  });
  for (const [csvCol, targetId] of Object.entries(csvToTarget)) {
    if (!targetId || !targetIds.has(targetId)) continue;
    const prev = Object.keys(targetToCsv).find((tid) => tid !== targetId && targetToCsv[tid] === csvCol);
    if (prev) targetToCsv[prev] = null;
    targetToCsv[targetId] = csvCol;
  }
  return targetToCsv;
}

function targetMappingToCsvShape(
  headers: string[],
  targetToCsv: Record<string, string | null>
): { [csvColumn: string]: string | null } {
  const out: { [csvColumn: string]: string | null } = {};
  headers.forEach((h) => {
    out[h] = null;
  });
  for (const [targetId, csvCol] of Object.entries(targetToCsv)) {
    if (csvCol && headers.includes(csvCol)) {
      out[csvCol] = targetId;
    }
  }
  return out;
}

type CsvColumnStatus = "unassigned" | "current" | "assigned-other";

function getCsvColumnStatus(
  csvHeader: string,
  currentTargetId: string,
  targetToCsv: Record<string, string | null>
): CsvColumnStatus {
  const assignedTargetId = Object.entries(targetToCsv).find(([, csv]) => csv === csvHeader)?.[0];
  if (!assignedTargetId) return "unassigned";
  if (assignedTargetId === currentTargetId) return "current";
  return "assigned-other";
}

function sortHeadersForRow(
  headers: string[],
  currentTargetId: string,
  targetToCsv: Record<string, string | null>
): string[] {
  const statusOrder: Record<CsvColumnStatus, number> = {
    unassigned: 0,
    current: 1,
    "assigned-other": 2,
  };

  return [...headers].sort((a, b) => {
    const statusA = getCsvColumnStatus(a, currentTargetId, targetToCsv);
    const statusB = getCsvColumnStatus(b, currentTargetId, targetToCsv);
    if (statusA !== statusB) return statusOrder[statusA] - statusOrder[statusB];
    return a.localeCompare(b);
  });
}

const ColumnMappingDialog = ({
  open,
  onOpenChange,
  headers,
  attributes,
  coreAttributes = [],
  suggestedMappings,
  requiredAttributes,
  onConfirm,
  initialMapping,
}: ColumnMappingDialogProps) => {
  const targetRows = useMemo((): MappingTargetRow[] => {
    const core: MappingTargetRow[] = coreAttributes.map((c) => {
      const targetId = `core:${c.id}`;
      return {
        targetId,
        label: translateAttributeName(c.id, true) || translateAttributeName(c.name, true),
        required: requiredAttributes.includes(targetId),
        section: "core",
      };
    });
    const cat: MappingTargetRow[] = attributes.map((attr) => ({
      targetId: attr.id,
      label: translateAttributeName(attr.name, false),
      required: requiredAttributes.includes(attr.id),
      section: "category",
    }));
    return [...core, ...cat];
  }, [coreAttributes, attributes, requiredAttributes]);

  const targetIdSet = useMemo(
    () => new Set(targetRows.map((r) => r.targetId)),
    [targetRows]
  );

  const [targetToCsv, setTargetToCsv] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!open) return;
    const source =
      initialMapping && Object.keys(initialMapping).length > 0 ? initialMapping : suggestedMappings;
    const asNullable: { [k: string]: string | null } = {};
    Object.entries(source).forEach(([k, v]) => {
      asNullable[k] = v ?? null;
    });
    setTargetToCsv(invertCsvToTargetMapping(asNullable, targetIdSet));
  }, [open, headers, suggestedMappings, initialMapping, targetIdSet]);

  const handleTargetCsvChange = (targetId: string, csvColumn: string | null) => {
    setTargetToCsv((prev) => {
      const next = { ...prev };
      if (csvColumn) {
        for (const tid of Object.keys(next)) {
          if (next[tid] === csvColumn) next[tid] = null;
        }
      }
      next[targetId] = csvColumn;
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(targetMappingToCsvShape(headers, targetToCsv));
    onOpenChange(false);
  };

  const allRequiredMapped = requiredAttributes.every((reqId) => Boolean(targetToCsv[reqId]));

  const targetLabelById = useMemo(() => {
    const labels = new Map<string, string>();
    targetRows.forEach((row) => labels.set(row.targetId, row.label));
    return labels;
  }, [targetRows]);

  const unassignedHeaders = useMemo(() => {
    const assigned = new Set(
      Object.values(targetToCsv).filter((csvColumn): csvColumn is string => Boolean(csvColumn))
    );
    return headers.filter((header) => !assigned.has(header));
  }, [headers, targetToCsv]);

  const getAssignedTargetLabel = (csvHeader: string, currentTargetId: string) => {
    const assignedTargetId = Object.entries(targetToCsv).find(
      ([targetId, csvColumn]) => csvColumn === csvHeader && targetId !== currentTargetId
    )?.[0];
    return assignedTargetId ? targetLabelById.get(assignedTargetId) : undefined;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mapeo de Columnas</DialogTitle>
          <DialogDescription>
            Para cada campo esperado (campos base y atributos de categoría), elige la columna del CSV que lo
            representa. Los marcados con asterisco (*) son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!allRequiredMapped && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800">
                Asigna una columna CSV a todos los campos requeridos antes de continuar.
              </span>
            </div>
          )}

          {unassignedHeaders.length > 0 && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-900">
                Columnas del CSV sin asignar ({unassignedHeaders.length})
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                {unassignedHeaders.join(", ")}
              </p>
            </div>
          )}

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45%]">Campo esperado</TableHead>
                  <TableHead className="w-[55%]">Columna del CSV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targetRows.map((row) => {
                  const currentCsv = targetToCsv[row.targetId] ?? null;
                  const sectionLabel = row.section === "core" ? "Campo base" : "Atributo";

                  return (
                    <TableRow key={row.targetId}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">{sectionLabel}</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{row.label}</span>
                            {row.required && <span className="text-red-500">*</span>}
                            {row.required && (
                              <Badge variant="outline" className="text-xs">
                                Requerido
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={currentCsv || ""}
                          onValueChange={(value) =>
                            handleTargetCsvChange(row.targetId, value === "none" ? null : value)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="— Sin columna —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Sin columna —</SelectItem>
                            {sortHeadersForRow(headers, row.targetId, targetToCsv).map((header) => {
                              const status = getCsvColumnStatus(header, row.targetId, targetToCsv);
                              const assignedLabel = getAssignedTargetLabel(header, row.targetId);

                              return (
                                <SelectItem key={header} value={header}>
                                  <div className="flex w-full items-center justify-between gap-3">
                                    <span
                                      className={
                                        status === "unassigned"
                                          ? "font-medium"
                                          : status === "assigned-other"
                                            ? "text-muted-foreground"
                                            : undefined
                                      }
                                    >
                                      {header}
                                    </span>
                                    {status === "unassigned" && (
                                      <span className="text-xs text-emerald-600 shrink-0">
                                        Disponible
                                      </span>
                                    )}
                                    {status === "assigned-other" && assignedLabel && (
                                      <span className="text-xs text-muted-foreground shrink-0">
                                        Asignada a {assignedLabel}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!allRequiredMapped}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar Mapeo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ColumnMappingDialog;
