import { useState, useMemo } from "react";
import { useImportJobs } from "@/hooks/useImportJobs";
import { ImportJob, ImportJobError, ImportJobType, ImportJobStatus } from "@/models/importJob";
import { useCategoryContext } from "@/context/categories-context";
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { AlertCircle, CheckCircle2, Clock, XCircle, Loader2, RefreshCw, Ban, AlertTriangle, StopCircle, SlidersHorizontal } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ImportErrorRowView {
  key: string;
  row: number | null;
  sku: string;
  category: string;
  message: string;
}

const extractSkuFromMessage = (text: string): string | null => {
  const a = text.match(/\(SKU=([^)]+)\)/i);
  if (a) return a[1].trim();
  const b = text.match(/Product with SKU\s+([^\s]+)\s+not found/i);
  if (b) return b[1].trim();
  const c = text.match(/\bSKU\s+([^\s,]+)/i);
  if (c) return c[1].trim();
  return null;
};

const collectErrorsFromJob = (job: ImportJob): ImportJobError[] => {
  if (job.errors && job.errors.length > 0) return job.errors;
  const raw = job.result as { errors?: ImportJobError[] } | null | undefined;
  if (raw?.errors && Array.isArray(raw.errors)) return raw.errors;
  return [];
};

const toErrorTableRows = (errors: ImportJobError[]): ImportErrorRowView[] => {
  const rows: ImportErrorRowView[] = errors.map((e, i) => {
    if (typeof e === "string") {
      const prefix = e.match(/^(?:Row|Fila)\s+(\d+):\s*(?:\(SKU=([^)]+)\)\s*)?(.*)$/is);
      if (prefix) {
        const rest = (prefix[3] || "").trim();
        return {
          key: `str-${i}`,
          row: parseInt(prefix[1], 10),
          sku: (prefix[2]?.trim() || extractSkuFromMessage(rest)) || "—",
          category: "—",
          message: rest || e,
        };
      }
      return {
        key: `str-${i}`,
        row: null,
        sku: extractSkuFromMessage(e) || "—",
        category: "—",
        message: e,
      };
    }
    const msg = e.message || "";
    const sku = (typeof e.sku === "string" && e.sku) || extractSkuFromMessage(msg) || "—";
    return {
      key: `obj-${i}`,
      row: typeof e.row === "number" ? e.row : null,
      sku,
      category: typeof e.category === "string" ? e.category : "—",
      message: msg,
    };
  });
  return [...rows].sort((a, b) => {
    const ar = a.row ?? 1_000_000;
    const br = b.row ?? 1_000_000;
    return ar - br;
  });
};

const formatImportErrorLine = (row: ImportErrorRowView): string => {
  const esc = row.message.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const fila = row.row != null ? String(row.row) : "n/a";
  const sku = row.sku !== "—" ? row.sku : "n/a";
  const tipo = row.category !== "—" ? row.category : "n/a";
  return `Error="${esc}", Fila=${fila}, SKU=${sku}, Tipo=${tipo}`;
};

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
    tooltipText = "La importación se detuvo (manualmente o desde la acción Detener). Puedes reintentar el job.";
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
  const { categories } = useCategoryContext();
  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => {
      if (c.id) m.set(c.id, c.name);
    });
    return m;
  }, [categories]);

  const [typeFilter, setTypeFilter] = useState<ImportJobType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ImportJobStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [stopTarget, setStopTarget] = useState<ImportJob | null>(null);
  const [stopBusy, setStopBusy] = useState(false);
  const limit = 10;

  const { jobs, loading, error, pagination, stopImportJob } = useImportJobs({
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
    page,
    limit,
  });

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [categories]
  );

  const activeFilterCount = [
    categoryFilter !== "all",
    typeFilter !== "all",
    statusFilter !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setCategoryFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const selectedJobData = jobs.find((j) => j.id === selectedJob);

  const selectedJobErrors = useMemo(
    () => (selectedJobData ? collectErrorsFromJob(selectedJobData) : []),
    [selectedJobData]
  );
  const selectedJobErrorRows = useMemo(
    () => toErrorTableRows(selectedJobErrors),
    [selectedJobErrors]
  );

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

  const categoryFilterSelect = (
    <Select
      value={categoryFilter}
      onValueChange={(value) => {
        setCategoryFilter(value);
        setPage(1);
      }}
    >
      <SelectTrigger className="w-full sm:w-[220px]">
        <SelectValue placeholder="Categoría" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas las categorías</SelectItem>
        {sortedCategories.map((c) =>
          c.id ? (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ) : null
        )}
      </SelectContent>
    </Select>
  );

  const typeFilterSelect = (
    <Select
      value={typeFilter}
      onValueChange={(value) => {
        setTypeFilter(value as ImportJobType | "all");
        setPage(1);
      }}
    >
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder="Tipo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los tipos</SelectItem>
        <SelectItem value="products">Productos</SelectItem>
        <SelectItem value="references">Referencias</SelectItem>
        <SelectItem value="applications">Aplicaciones</SelectItem>
      </SelectContent>
    </Select>
  );

  const statusFilterSelect = (
    <Select
      value={statusFilter}
      onValueChange={(value) => {
        setStatusFilter(value as ImportJobStatus | "all");
        setPage(1);
      }}
    >
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder="Estado" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los estados</SelectItem>
        <SelectItem value="pending">Pendiente</SelectItem>
        <SelectItem value="processing">En Progreso</SelectItem>
        <SelectItem value="completed">Completado</SelectItem>
        <SelectItem value="failed">Fallido</SelectItem>
        <SelectItem value="stopped">Detenido</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="w-full max-w-full">
      <Card className="border-0 shadow-none w-full">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 p-0 m-0 pb-6 w-full">
          <CardTitle>Importaciones</CardTitle>
          <div className="flex items-center gap-3 w-full lg:w-auto lg:ml-auto">
            <Drawer direction="bottom">
              <DrawerTrigger asChild>
                <Button variant="outline" className="gap-2 shrink-0 lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                  {activeFilterCount > 0 && (
                    <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="mx-auto flex w-full max-w-md flex-col min-h-0">
                  <DrawerHeader>
                    <DrawerTitle>Filtrar importaciones</DrawerTitle>
                    <DrawerDescription>
                      Filtra los jobs de importación por categoría, tipo y estado.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="flex flex-col gap-4 overflow-y-auto px-4 py-1">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Categoría</label>
                      {categoryFilterSelect}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Tipo</label>
                      {typeFilterSelect}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Estado</label>
                      {statusFilterSelect}
                    </div>
                  </div>
                  <DrawerFooter>
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      disabled={activeFilterCount === 0}
                    >
                      Limpiar filtros
                    </Button>
                    <DrawerClose asChild>
                      <Button>Ver resultados</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
            <div className="hidden lg:flex lg:items-center lg:gap-3">
              {categoryFilterSelect}
              {typeFilterSelect}
              {statusFilterSelect}
            </div>
            {headerActions}
          </div>
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
                      <TableHead>Categoría</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Resultados</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => {
                      const jobErrors = collectErrorsFromJob(job);
                      const categoryLabel =
                        job.categoryId != null && job.categoryId !== ""
                          ? categoryNameById.get(job.categoryId) ?? "—"
                          : "—";
                      return (
                      <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleJobClick(job.id)}>
                        <TableCell className="max-w-[160px] truncate font-medium" title={categoryLabel}>
                          {categoryLabel}
                        </TableCell>
                        <TableCell className="font-medium">
                          {getTypeLabel(job.type)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(job.status, jobErrors, job.warnings)}
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
                            {jobErrors.length > 0 && (
                              <div className="flex items-center gap-1.5 text-red-600">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Errores: {jobErrors.length}
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
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJobClick(job.id);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalles
                              </DropdownMenuItem>
                              {(job.status === "pending" || job.status === "processing") && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStopTarget(job);
                                  }}
                                >
                                  <StopCircle className="h-4 w-4 mr-2" />
                                  Detener
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                    })}
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
                  <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                  <p className="text-sm font-medium">
                    {selectedJobData.categoryId
                      ? categoryNameById.get(selectedJobData.categoryId) ?? selectedJobData.categoryId
                      : "—"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                  <p className="text-sm font-medium">{getTypeLabel(selectedJobData.type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado</label>
                  <div className="mt-1">{getStatusBadge(selectedJobData.status, selectedJobErrors, selectedJobData.warnings)}</div>
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

              {selectedJobErrors.length > 0 && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-destructive mb-2 block">
                    Errores por fila del CSV ({selectedJobErrors.length})
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Cada línea: Error=&quot;…&quot;, Fila=número de fila en el CSV (1 = encabezados), SKU, Tipo. Ordenadas por fila.
                  </p>
                  <div className="rounded-md border max-h-72 overflow-auto divide-y bg-muted/30">
                    {selectedJobErrorRows.map((row) => (
                      <div
                        key={row.key}
                        className="px-3 py-2 font-mono text-[11px] leading-relaxed text-destructive whitespace-pre-wrap break-words"
                      >
                        {formatImportErrorLine(row)}
                      </div>
                    ))}
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

      <AlertDialog
        open={stopTarget !== null}
        onOpenChange={(open) => {
          if (!open && !stopBusy) {
            setStopTarget(null);
          }
        }}
      >
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Detener esta importación?</AlertDialogTitle>
            <AlertDialogDescription>
              El job pasará a estado detenido y el servidor dejará de procesar filas en cuanto sea posible. Los datos ya importados se conservan.
              {stopTarget ? (
                <>
                  {" "}
                  Archivo:{" "}
                  <span className="font-medium text-foreground">
                    {stopTarget.originalFileName || stopTarget.fileName}
                  </span>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stopBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={stopBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!stopTarget) return;
                setStopBusy(true);
                try {
                  await stopImportJob(stopTarget.id);
                  setStopTarget(null);
                } catch (err) {
                  console.error("stopImportJob failed:", err);
                } finally {
                  setStopBusy(false);
                }
              }}
            >
              {stopBusy ? "Deteniendo…" : "Sí, detener"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ImportJobsDashboard;

