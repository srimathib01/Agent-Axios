import { useState, useCallback, useEffect } from 'react';
import { 
  getReports,
  getReport,
  exportReport,
  compareReports,
  type Report,
  type AnalysisStatus,
} from '@/services/api';
import { toast } from 'sonner';

interface UseReportsOptions {
  autoLoad?: boolean;
  page?: number;
  perPage?: number;
  status?: AnalysisStatus;
  repoId?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: 'created_at' | 'vulnerability_count';
}

export function useReports(options: UseReportsOptions = {}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: options.page || 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: options.perPage || 10,
  });

  const loadReports = useCallback(async (params?: UseReportsOptions) => {
    setIsLoading(true);
    try {
      const response = await getReports({
        page: params?.page || options.page,
        perPage: params?.perPage || options.perPage,
        status: params?.status || options.status,
        repoId: params?.repoId || options.repoId,
        startDate: params?.startDate || options.startDate,
        endDate: params?.endDate || options.endDate,
        sortBy: params?.sortBy || options.sortBy,
      });

      if (response.success && response.data) {
        setReports(response.data.reports);
        setPagination({
          currentPage: response.data.page,
          totalPages: response.data.pages,
          totalItems: response.data.total,
          itemsPerPage: response.data.per_page,
        });
      }
    } catch (error: any) {
      console.error('Failed to load reports:', error);
      toast.error('Failed to load reports', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const loadReport = useCallback(async (analysisId: number) => {
    setIsLoading(true);
    try {
      const response = await getReport(analysisId);
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error: any) {
      console.error('Failed to load report:', error);
      toast.error('Failed to load report', {
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const downloadReport = useCallback(async (
    analysisId: number,
    format: 'pdf' | 'json' = 'pdf'
  ) => {
    try {
      toast.info('Preparing export...', {
        description: 'Please wait while we generate the report',
      });

      const blob = await exportReport(analysisId, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-${analysisId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Report exported successfully');
    } catch (error: any) {
      console.error('Failed to export report:', error);
      toast.error('Failed to export report', {
        description: error.message,
      });
      throw error;
    }
  }, []);

  const compareReportsData = useCallback(async (
    analysisId1: number,
    analysisId2: number
  ) => {
    setIsLoading(true);
    try {
      const response = await compareReports(analysisId1, analysisId2);
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error: any) {
      console.error('Failed to compare reports:', error);
      toast.error('Failed to compare reports', {
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshReports = useCallback(() => {
    return loadReports();
  }, [loadReports]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (options.autoLoad !== false) {
      loadReports();
    }
  }, []);

  return {
    reports,
    isLoading,
    pagination,
    loadReports,
    loadReport,
    downloadReport,
    compareReportsData,
    refreshReports,
  };
}
