import { useState } from "react";
import { useImportJobs } from "@/hooks/useImportJobs";
import { ImportJobType, ImportJobStatus } from "@/models/importJob";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, XCircle, Loader2, RefreshCw, Ban, AlertTriangle, StopCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreVertical, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ImportJobError } from "@/models/importJob";

const formatEtaSeconds = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 90) return `~${s} s`;
  const m = Math.floor(s / 60);
  if (m < 120) return `~${m} min`;
  const h = Math.floor(s / 3600);
  const remM = Math.floor((s % 3600) / 60);
  if (h < 48) return `~${h} h ${remM} min`;
  const d = Math.floor(s / 86400);
  const remH = Math.floor((s % 86400) / 3600);
  return `~${d} d ${remH} h`;
};

const getStatusBadge = (
  status: ImportJobStatus,
  errors: ImportJobError[] = [],
  warnings: ImportJobError[] = []
) => {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  // Determinar el color según el estado y los errores/advertencias
  let badgeClassName = "";
  let mainLabel = "";
  let Icon = Clock;
  let tooltipText: string | null = null;

  if (status === "failed") {
    badgeClassName = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
    mainLabel = "Fallido";
    Icon = XCircle;
    if (hasErrors) {
      tooltipText = `${errors.length} error${errors.length !== 1 ? "es" : ""}. Consulta detalles para más información.`;
    } else if (hasWarnings) {
      tooltipText = `${warnings.length} advertencia${warnings.length !== 1 ? "s" : ""}. Consulta detalles para más información.`;
    } else {
      tooltipText = "El job falló. Consulta detalles para más información.";
    }
  } else if (status === "stopped") {
    badgeClassName = "bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200";
    mainLabel = "Detenido";
    Icon = StopCircle;
    tooltipText =
      "Estado establecido manualmente en la base de datos. La aplicación no ofrece acción para detener jobs.";
  } else if (status === "processing") {
    if (hasErrors) {
      badgeClassName = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
      mainLabel = "En Progreso";
      Icon = AlertCircle;
      tooltipText = `${errors.length} error${errors.length !== 1 ? "es" : ""}. Consulta detalles para más información.`;
    } else if (hasWarnings) {
      badgeClassName = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
      mainLabel = "En Progreso";
      Icon = Loader2;
      tooltipText = `${warnings.length} advertencia${warnings.length !== 1 ? "s" : ""}. Consulta detalles para más información.`;
    } else {
      badgeClassName = "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
      mainLabel = "En Progreso";
      Icon = Loader2;
      tooltipText = "El job está siendo procesado. Consulta detalles para más información.";
    }
  } else if (status === "completed") {
    if (hasErrors) {
      badgeClassName = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
      mainLabel = "Completado";
      tooltipText = `${errors.length} error${errors.length !== 1 ? "es" : ""}. Consulta detalles para más información.`;
      Icon = AlertCircle;
    } else if (hasWarnings) {
      badgeClassName = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
      mainLabel = "Completado";
      tooltipText = `${warnings.length} advertencia${warnings.length !== 1 ? "s" : ""}. Consulta detalles para más información.`;
      Icon = AlertCircle;
    } else {
      badgeClassName = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
      mainLabel = "Completado";
      Icon = CheckCircle2;
    }
  } else {
    badgeClassName = "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100";
    mainLabel = "Pendiente";
    Icon = Clock;
    if (hasErrors) {
      tooltipText = `${errors.length} error${errors.length !== 1 ? "es" : ""}. Consulta detalles para más información.`;
    } else if (hasWarnings) {
      tooltipText = `${warnings.length} advertencia${warnings.length !== 1 ? "s" : ""}. Consulta detalles para más información.`;
    } else {
      tooltipText = "El job está pendiente de procesamiento. Consulta detalles para más información.";
    }
  }

  const badgeContent = (
    <Badge className={`flex items-center gap-1.5 w-fit border py-1 px-2.5 cursor-default ${badgeClassName}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-medium whitespace-nowrap">{mainLabel}</span>
    </Badge>
  );

  if (tooltipText) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-block">{badgeContent}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-sm">{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
};

const getTypeLabel = (type: ImportJobType) => {
  const labels = {
    products: "Productos",
    references: "Referencias",
    applications: "Aplicaciones",
  };
  return labels[type];
};

const formatDate = (date: Date | string | null) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPageNumbers = (current: number, total: number): (number | "...")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
};

interface ImportJobsDashboardProps {
  onJobClick?: (jobId: string) => void;
  headerActions?: React.ReactNode;
}

const ImportJobsDashboard = ({ onJobClick, headerActions }: ImportJobsDashboardProps) => {
  const [typeFilter, setTypeFilter] = useState<ImportJobType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ImportJobStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const limit = 10;

  const { jobs, loading, error, pagination } = useImportJobs({
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    limit,
  });

  const selectedJobData = jobs.find((j) => j.id === selectedJob);

  const handleJobClick = (jobId: string) => {
    setSelectedJob(jobId);
    if (onJobClick) {
      onJobClick(jobId);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="w-full max-w-full">
      <Card className="border-0 shadow-none w-full">
        <CardHeader className="flex flex-row items-end p-0 m-0 pb-6 w-full">
          <div className="flex flex-col gap-3">
            <CardTitle>Importaciones</CardTitle>
            <div className="flex gap-3">
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value as ImportJobType | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="products">Productos</SelectItem>
                  <SelectItem value="references">Referencias</SelectItem>
                  <SelectItem value="applications">Aplicaciones</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as ImportJobStatus | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="processing">En Progreso</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="failed">Fallido</SelectItem>
                  <SelectItem value="stopped">Detenido (manual DB)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {headerActions && (
            <div className="ml-auto flex items-center gap-3">
              {headerActions}
            </div>
          )}
        </CardHeader>
        <div>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Cargando...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive py-8">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron jobs de importación
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Resultados</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleJobClick(job.id)}>
                        <TableCell className="font-medium">
                          {getTypeLabel(job.type)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(job.status, job.errors, job.warnings)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={job.originalFileName || job.fileName}>
                          {job.originalFileName || job.fileName}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {job.status === "completed" && (
                              <>
                                <div className="flex items-center gap-1.5 text-green-600">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Creados: {job.created}
                                </div>
                                <div className="flex items-center gap-1.5 text-blue-600">
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  Actualizados: {job.updated}
                                </div>
                                {job.skipped > 0 && (
                                  <div className="flex items-center gap-1.5 text-yellow-600">
                                    <Ban className="h-3.5 w-3.5" />
                                    Omitidos: {job.skipped}
                                  </div>
                                )}
                              </>
                            )}
                            {job.status === "failed" && job.failed > 0 && (
                              <div className="flex items-center gap-1.5 text-red-600">
                                <XCircle className="h-3.5 w-3.5" />
                                Fallidos: {job.failed}
                              </div>
                            )}
                            {job.errors.length > 0 && (
                              <div className="flex items-center gap-1.5 text-red-600">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Errores: {job.errors.length}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(job.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/50" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleJobClick(job.id); }}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalles
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages >= 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(1)}
                      disabled={page === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {getPageNumbers(page, pagination.totalPages).map((p, i) =>
                      p === "..." ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">...</span>
                      ) : (
                        <Button
                          key={p}
                          variant={page === p ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePageChange(p as number)}
                        >
                          {p}
                        </Button>
                      )
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={page === pagination.totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Dialog de Detalles */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Job de Importación</DialogTitle>
            <DialogDescription>
              Información completa del job de importación
            </DialogDescription>
          </DialogHeader>
          {selectedJobData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                  <p className="text-sm font-medium">{getTypeLabel(selectedJobData.type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado</label>
                  <div className="mt-1">{getStatusBadge(selectedJobData.status, selectedJobData.errors, selectedJobData.warnings)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Archivo</label>
                  <p className="text-sm">{selectedJobData.originalFileName || selectedJobData.fileName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Progreso</label>
                  <p className="text-sm">{selectedJobData.progress}%</p>
                </div>
                {selectedJobData.status === "processing" && selectedJobData.totalRows >= 500 && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Tiempo estimado</label>
                    {selectedJobData.eta?.estimatedRemainingSeconds != null &&
                    selectedJobData.eta.estimatedCompletionAt != null ? (
                      <div className="text-sm space-y-1 mt-1">
                        <p className="font-medium">
                          Restante: {formatEtaSeconds(selectedJobData.eta.estimatedRemainingSeconds)}
                        </p>
                        <p className="text-muted-foreground">
                          Fin estimado:{" "}
                          {formatDate(selectedJobData.eta.estimatedCompletionAt)}
                        </p>
                        {selectedJobData.eta.rowsPerSecond != null && (
                          <p className="text-muted-foreground">
                            Ritmo: {selectedJobData.eta.rowsPerSecond} filas/s
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        Se mostrará cuando haya suficientes filas procesadas y transcurrido unos segundos desde el
                        inicio (importaciones grandes, ≥500 filas).
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fecha de Creación</label>
                  <p className="text-sm">{formatDate(selectedJobData.createdAt)}</p>
                </div>
                {selectedJobData.startedAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha de Inicio</label>
                    <p className="text-sm">{formatDate(selectedJobData.startedAt)}</p>
                  </div>
                )}
                {selectedJobData.completedAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha de Finalización</label>
                    <p className="text-sm">{formatDate(selectedJobData.completedAt)}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Estadísticas
                </label>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total de filas: </span>
                    <span className="font-medium">{selectedJobData.totalRows}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Procesadas: </span>
                    <span className="font-medium">{selectedJobData.processedRows}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Creadas: </span>
                    <span className="font-medium text-green-600">{selectedJobData.created}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Actualizadas: </span>
                    <span className="font-medium text-blue-600">{selectedJobData.updated}</span>
                  </div>
                  {selectedJobData.skipped > 0 && (
                    <div>
                      <span className="text-muted-foreground">Omitidas: </span>
                      <span className="font-medium text-yellow-600">{selectedJobData.skipped}</span>
                    </div>
                  )}
                  {selectedJobData.failed > 0 && (
                    <div>
                      <span className="text-muted-foreground">Fallidas: </span>
                      <span className="font-medium text-red-600">{selectedJobData.failed}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedJobData.errors.length > 0 && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-destructive mb-2 block">
                    Errores ({selectedJobData.errors.length})
                  </label>
                  <div className="bg-destructive/10 rounded-md p-3 max-h-48 overflow-y-auto">
                    <ul className="space-y-1 text-sm">
                      {selectedJobData.errors.map((error, index) => {
                        // Handle both string errors and object errors with {category, message, row}
                        const errorText = typeof error === 'string'
                          ? error
                          : error?.message || error?.category || JSON.stringify(error);
                        const errorRow = typeof error === 'object' && error?.row ? ` (Fila ${error.row})` : '';
                        return (
                          <li key={index} className="text-destructive">
                            • {errorText}{errorRow}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}

              {selectedJobData.warnings.length > 0 && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-yellow-600 mb-2 block">
                    Advertencias ({selectedJobData.warnings.length})
                  </label>
                  <div className="bg-yellow-50 rounded-md p-3 max-h-48 overflow-y-auto">
                    <ul className="space-y-1 text-sm">
                      {selectedJobData.warnings.map((warning, index) => {
                        // Handle both string warnings and object warnings
                        const warningText = typeof warning === 'string'
                          ? warning
                          : warning?.message || warning?.category || JSON.stringify(warning);
                        const warningRow = typeof warning === 'object' && warning?.row ? ` (Fila ${warning.row})` : '';
                        return (
                          <li key={index} className="text-yellow-800">
                            • {warningText}{warningRow}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImportJobsDashboard;

