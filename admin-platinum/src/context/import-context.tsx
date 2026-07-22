import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import axiosClient from "@/services/axiosInstance";
import { ImportJobStatus } from "@/models/importJob";
import { useAuthContext } from "./auth-context";
import { invalidateProductListCache } from "@/utils/productListCache";

type ImportType = "products" | "references" | "applications";

interface ImportState {
  isImporting: boolean;
  importType: ImportType | null;
  progress: number | null;
  error: string | null;
  jobId: string | null;
  jobStatus: ImportJobStatus | null;
  startedAt: Date | null;
}

interface ImportContextType {
  importState: ImportState;
  startImport: (file: File, importType: ImportType, categoryId: string, columnMapping?: { [csvColumn: string]: string | null }) => Promise<void>;
  clearImport: () => void;
  bannerDismissed: boolean;
  dismissBanner: () => void;
  showBanner: () => void;
}

const ImportContext = createContext<ImportContextType | undefined>(undefined);

export function useImportContext() {
  const context = useContext(ImportContext);
  if (!context) {
    throw new Error("useImportContext must be used within ImportProvider");
  }
  return context;
}

export const ImportProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { toast } = useToast();
  const { authState } = useAuthContext();
  const client = axiosClient();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const lastProgressRef = useRef<number | null>(null);
  const pollingIntervalMsRef = useRef<number>(10000);

  const [importState, setImportState] = useState<ImportState>({
    isImporting: false,
    importType: null,
    progress: null,
    error: null,
    jobId: null,
    jobStatus: null,
    startedAt: null,
  });
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const getImportTypeLabel = (type: ImportType) => {
    switch (type) {
      case "products":
        return "productos";
      case "references":
        return "referencias";
      case "applications":
        return "aplicaciones";
      default:
        return "datos";
    }
  };

  const checkJobStatus = useCallback(
    async (jobId: string, importType: ImportType) => {
      try {
        const response = await client.get(`/jobs/${jobId}`);
        const job = response.data;

        // Check if job is stale (using new runtime field from backend)
        if (job.runtime?.isStale) {
          console.warn(`[Import] Job ${jobId} is stale, stopping polling`);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setImportState((prev) => ({
            ...prev,
            jobStatus: "failed" as ImportJobStatus,
            error: job.runtime?.isStale 
              ? "El trabajo de importación parece estar detenido. Por favor, revisa el dashboard."
              : prev.error,
          }));
          return;
        }

        const currentProgress = job.progress || 0;
        const progressChanged = lastProgressRef.current !== currentProgress;
        lastProgressRef.current = currentProgress;

        setImportState((prev) => ({
          ...prev,
          progress: currentProgress,
          jobStatus: job.status,
        }));

        // Adaptive polling: if progress hasn't changed, poll less frequently
        if (progressChanged) {
          // Progress updated - reset to faster polling
          pollingIntervalMsRef.current = 10000; // 10 seconds
        } else {
          // No progress - back off gradually (max 30s)
          pollingIntervalMsRef.current = Math.min(30000, pollingIntervalMsRef.current + 5000);
        }

        // Restart polling with new interval if still processing
        if (job.status === "processing" || job.status === "pending") {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          pollingIntervalRef.current = setInterval(() => {
            checkJobStatus(jobId, importType);
          }, pollingIntervalMsRef.current);
        }

        // If job is completed or failed, stop polling and show final message
        if (job.status === "completed" || job.status === "failed") {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          pollingIntervalMsRef.current = 10000;
          lastProgressRef.current = null;

          const elapsedTime = startTimeRef.current
            ? Date.now() - startTimeRef.current.getTime()
            : 0;
          const isQuickProcess = elapsedTime < 3000; // Less than 3 seconds

          // Always show final toast with results
          if (job.status === "completed") {
            const created = job.created || 0;
            const updated = job.updated || 0;
            const failed = job.failed || 0;

            if (importType === "products") {
              invalidateProductListCache();
            }
            
            let description = `Los ${getImportTypeLabel(importType)} se han importado correctamente.`;
            if (created > 0 || updated > 0) {
              description += ` ${created} creado(s), ${updated} actualizado(s).`;
            }
            if (failed > 0) {
              description += ` ${failed} fallido(s).`;
            }

            toast({
              title: "Importación completada",
              description,
              variant: "default",
            });
          } else {
            const errorCount = job.errors?.length || 0;
            const errorMessage = job.errors?.[0] || "Error desconocido";
            
            toast({
              title: "Importación fallida",
              description: errorCount > 0 
                ? `${errorCount} error(es) encontrado(s). ${errorMessage}`
                : "La importación falló. Por favor, revisa el dashboard para más detalles.",
              variant: "destructive",
            });
          }

          // Clear import state after a delay to allow user to see the final state
          // Longer delay for longer processes
          const delay = isQuickProcess ? 3000 : Math.min(10000, Math.max(5000, elapsedTime / 2));
          
          setTimeout(() => {
            setImportState({
              isImporting: false,
              importType: null,
              progress: null,
              error: null,
              jobId: null,
              jobStatus: null,
              startedAt: null,
            });
            startTimeRef.current = null;
          }, delay);
        }
      } catch (error: any) {
        console.error("Error checking job status:", error);
        // Don't stop polling on error, just log it
      }
    },
    [client, toast]
  );

  const startImport = useCallback(
    async (file: File, importType: ImportType, categoryId: string, columnMapping?: { [csvColumn: string]: string | null }) => {
      // Clear any existing polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      const startTime = new Date();
      startTimeRef.current = startTime;

      setBannerDismissed(false);
      setImportState({
        isImporting: true,
        importType,
        progress: 0,
        error: null,
        jobId: null,
        jobStatus: "pending",
        startedAt: startTime,
      });

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("importType", importType);
        formData.append("categoryId", categoryId);
        
        if (columnMapping) {
          formData.append("columnMapping", JSON.stringify(columnMapping));
        }

        const response = await client.post("/import", formData, {
          timeout: 30 * 60 * 1000,
        });
        const { jobId, status } = response.data;

        setImportState((prev) => ({
          ...prev,
          jobId,
          jobStatus: status || "pending",
        }));

        // Reset polling state for new job
        pollingIntervalMsRef.current = 10000; // Start with 10s
        lastProgressRef.current = null;

        pollingIntervalRef.current = setInterval(() => {
          if (jobId) {
            checkJobStatus(jobId, importType);
          }
        }, pollingIntervalMsRef.current);

        checkJobStatus(jobId, importType);
      } catch (error: any) {
        // Clear polling on error
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        const errorMessage =
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Error al iniciar la importación.";

        setImportState({
          isImporting: false,
          importType: null,
          progress: null,
          error: errorMessage,
          jobId: null,
          jobStatus: null,
          startedAt: null,
        });
        startTimeRef.current = null;

        // Show error toast
        toast({
          title: "Error al importar",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [client, toast, checkJobStatus]
  );

  const clearImport = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setImportState({
      isImporting: false,
      importType: null,
      progress: null,
      error: null,
      jobId: null,
      jobStatus: null,
      startedAt: null,
    });
    startTimeRef.current = null;
    setBannerDismissed(false);
  }, []);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
  }, []);

  const showBanner = useCallback(() => {
    setBannerDismissed(false);
  }, []);

  // On mount, check backend for any active jobs (pending/processing)
  useEffect(() => {
    // Only check for active jobs if user is authenticated
    if (!authState.isAuthenticated || authState.loading) {
      return;
    }

    const checkActiveJobs = async () => {
      try {
        const response = await client.get("/jobs?status=processing&limit=1");
        let activeJob = response.data.jobs?.[0];

        if (!activeJob) {
          const pendingResponse = await client.get("/jobs?status=pending&limit=1");
          activeJob = pendingResponse.data.jobs?.[0];
        }

        if (!activeJob) return;

        const start = activeJob.createdAt ? new Date(activeJob.createdAt) : new Date();
        startTimeRef.current = start;

        setImportState({
          isImporting: true,
          importType: activeJob.type as ImportType,
          progress: activeJob.progress || 0,
          error: null,
          jobId: activeJob.id,
          jobStatus: activeJob.status,
          startedAt: start,
        });

        pollingIntervalMsRef.current = 10000;
        lastProgressRef.current = activeJob.progress || null;
        pollingIntervalRef.current = setInterval(() => {
          checkJobStatus(activeJob.id, activeJob.type as ImportType);
        }, pollingIntervalMsRef.current);
      } catch {
        // Silently fail — no active jobs or network error
      }
    };

    if (!importState.isImporting) {
      checkActiveJobs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.isAuthenticated, authState.loading]);

  // Cleanup on unmount or when user logs out
  useEffect(() => {
    if (!authState.isAuthenticated && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setImportState({
        isImporting: false,
        importType: null,
        progress: null,
        error: null,
        jobId: null,
        jobStatus: null,
        startedAt: null,
      });
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [authState.isAuthenticated]);

  return (
    <ImportContext.Provider
      value={{
        importState,
        startImport,
        clearImport,
        bannerDismissed,
        dismissBanner,
        showBanner,
      }}
    >
      {children}
    </ImportContext.Provider>
  );
};

