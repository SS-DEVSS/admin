import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axiosClient from "@/services/axiosInstance";
import { ImportJob, ImportJobType, ImportJobStatus, ImportJobsResponse } from "@/models/importJob";

interface UseImportJobsOptions {
  type?: ImportJobType;
  status?: ImportJobStatus;
  page?: number;
  limit?: number;
}

export const useImportJobs = (options: UseImportJobsOptions = {}) => {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true); // Start with true to show loader initially
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetchJobs = useCallback(async (opts?: UseImportJobsOptions) => {
    const currentOptions = opts || optionsRef.current;
    try {
      setLoading(true);
      setError(null);
      const client = axiosClient();
      
      const params = new URLSearchParams();
      if (currentOptions.type) params.append('type', currentOptions.type);
      if (currentOptions.status) params.append('status', currentOptions.status);
      if (currentOptions.page) params.append('page', currentOptions.page.toString());
      if (currentOptions.limit) params.append('limit', currentOptions.limit.toString());

      const response = await client.get<ImportJobsResponse>(
        `/jobs?${params.toString()}`
      );

      setJobs(response.data.jobs);
      setPagination({
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Error al cargar los jobs de importación");
      console.error("Error fetching import jobs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(options);
  }, [options.type, options.status, options.page, options.limit, fetchJobs]);

  const jobsRef = useRef<ImportJob[]>([]);
  jobsRef.current = jobs;

  // Update only jobs in progress without reloading the entire list
  const updateJobsInProgress = useCallback(async () => {
    const currentJobs = jobsRef.current;
    const processingJobs = currentJobs.filter(
      job => job.status === "pending" || job.status === "processing"
    );

    if (processingJobs.length === 0) {
      return;
    }

    try {
      const client = axiosClient();
      
      // Fetch updated status for each job in progress
      const updatedJobs = await Promise.all(
        processingJobs.map(async (job) => {
          try {
            const response = await client.get<ImportJob>(`/jobs/${job.id}`);
            const updatedJob = response.data;
            
            // Stop polling if job is stale (backend detected it's not actually running)
            if (updatedJob.runtime?.isStale && updatedJob.status === "processing") {
              // Job is stale - mark as failed in local state
              return { ...updatedJob, status: "failed" as ImportJobStatus };
            }
            
            return updatedJob;
          } catch (err) {
            // If individual job fetch fails, return null to skip update
            return null;
          }
        })
      );

      // Update only the jobs that changed, without reloading the entire list
      setJobs(prevJobs => 
        prevJobs.map(job => {
          const updatedJob = updatedJobs.find(uj => uj && uj.id === job.id);
          return updatedJob || job;
        })
      );
    } catch (err) {
      // Silently fail - don't show error for background updates
      console.error("Error updating jobs in progress:", err);
    }
  }, []);

  // Calculate processing job IDs for dependency tracking
  const processingJobIds = useMemo(() => {
    return jobs
      .filter(j => j.status === "pending" || j.status === "processing")
      .map(j => j.id)
      .join(',');
  }, [jobs]);

  // Auto-refresh if there are jobs in progress
  useEffect(() => {
    if (!processingJobIds) {
      return;
    }

    // Poll every 15 seconds if there are jobs in progress (less frequent since progress updates are infrequent)
    // Only poll when page is visible to save resources
    const handleVisibilityChange = () => {
      // Pause polling when tab is hidden
      if (document.hidden) {
        return;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const poll = () => {
      if (!document.hidden) {
        updateJobsInProgress();
      }
    };

    poll();

    const interval = setInterval(poll, 15000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [processingJobIds, updateJobsInProgress]);

  const refresh = () => {
    fetchJobs(options);
  };

  const stopImportJob = useCallback(async (jobId: string) => {
    const client = axiosClient();
    await client.post(`/jobs/${jobId}/stop`);
    await fetchJobs(optionsRef.current);
  }, [fetchJobs]);

  return {
    jobs,
    loading,
    error,
    pagination,
    refresh,
    fetchJobs,
    stopImportJob,
  };
};

