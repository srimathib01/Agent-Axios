import { useState, useCallback, useEffect } from 'react';
import { 
  getRepositories, 
  getRepository,
  addRepository,
  updateRepository,
  deleteRepository,
  triggerScan,
  type Repository,
  type AnalysisType,
} from '@/services/api';
import { toast } from 'sonner';

interface UseRepositoriesOptions {
  autoLoad?: boolean;
  page?: number;
  limit?: number;
  search?: string;
  status?: 'healthy' | 'warning' | 'critical';
  starred?: boolean;
}

export function useRepositories(options: UseRepositoriesOptions = {}) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: options.page || 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: options.limit || 20,
  });
  const [stats, setStats] = useState({
    total: 0,
    healthy: 0,
    warning: 0,
    critical: 0,
    totalVulnerabilities: 0,
  });

  const mapRepository = useCallback((repo: any): Repository => {
    const metadata = (() => {
      if (!repo?.repo_metadata) return {};
      if (typeof repo.repo_metadata === 'string') {
        try {
          return JSON.parse(repo.repo_metadata);
        } catch (error) {
          console.warn('Failed to parse repo metadata', error);
          return {};
        }
      }
      return repo.repo_metadata;
    })();

    return {
    id: String(repo.repo_id ?? repo.id ?? Date.now()),
    name: repo.name,
    fullName: repo.name,
    url: repo.url,
    description: repo.description,
    language: repo.language,
      defaultBranch: metadata?.default_branch ?? 'main',
      branches: metadata?.branches ?? 1,
    stars: repo.stars ?? 0,
      forks: metadata?.forks ?? 0,
    lastScan: repo.last_scan_at,
    nextScan: undefined,
    starred: Boolean(repo.is_starred),
    status: repo.last_scan_status ?? 'pending',
    vulnerabilities: {
      critical: repo.critical_count ?? 0,
      high: repo.high_count ?? 0,
      medium: repo.medium_count ?? 0,
      low: repo.low_count ?? 0,
      total: repo.vulnerability_count ?? 0,
    },
      scanFrequency: metadata?.scan_frequency ?? 'weekly',
      autoScan: metadata?.auto_scan ?? false,
    createdAt: repo.created_at ?? new Date().toISOString(),
    updatedAt: repo.updated_at ?? new Date().toISOString(),
    };
  }, []);

  const loadRepositories = useCallback(async (params?: UseRepositoriesOptions) => {
    setIsLoading(true);
    try {
      const response = await getRepositories({
        page: params?.page || options.page,
        limit: params?.limit || options.limit,
        search: params?.search || options.search,
        status: params?.status || options.status,
        starred: params?.starred ?? options.starred,
      });

      if (response.success && response.data) {
        const mapped = (response.data.repositories || []).map(mapRepository);
        setRepositories(mapped);
        setPagination({
          currentPage: response.data.page,
          totalPages: response.data.pages,
          totalItems: response.data.total,
          itemsPerPage: response.data.per_page,
        });
        setStats({
          total: mapped.length,
          healthy: mapped.filter(r => r.status === 'healthy').length,
          warning: mapped.filter(r => r.status === 'warning').length,
          critical: mapped.filter(r => r.status === 'critical').length,
          totalVulnerabilities: mapped.reduce((sum, r) => sum + (r.vulnerabilities?.total ?? 0), 0),
        });
      }
    } catch (error: any) {
      console.error('Failed to load repositories:', error);
      toast.error('Failed to load repositories', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const loadRepository = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const response = await getRepository(id);
      if (response.success && response.data) {
        return mapRepository(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load repository:', error);
      toast.error('Failed to load repository', {
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addNewRepository = useCallback(async (data: {
    name: string;
    url: string;
    description?: string;
    language?: string;
    framework?: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await addRepository(data);
      if (response.success && response.data) {
        toast.success('Repository added successfully', {
          description: `${response.data.name} has been added to your repositories`,
        });
        // Reload repositories
        await loadRepositories();
        
        return mapRepository(response.data);
      }
    } catch (error: any) {
      console.error('Failed to add repository:', error);
      toast.error('Failed to add repository', {
        description: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadRepositories]);

  const updateRepo = useCallback(async (id: string, data: Partial<Repository>) => {
    try {
      const response = await updateRepository(id, data);
      if (response.success && response.data) {
        toast.success('Repository updated successfully');
        
        // Update local state
        setRepositories(prev => 
          prev.map(repo => repo.id === id ? mapRepository(response.data) : repo)
        );
        
        return mapRepository(response.data);
      }
    } catch (error: any) {
      console.error('Failed to update repository:', error);
      toast.error('Failed to update repository', {
        description: error.message,
      });
      throw error;
    }
  }, []);

  const deleteRepo = useCallback(async (id: string) => {
    try {
      const response = await deleteRepository(id);
      if (response.success) {
        toast.success('Repository deleted successfully');
        
        // Remove from local state
        setRepositories(prev => prev.filter(repo => repo.id !== id));
        
        return true;
      }
    } catch (error: any) {
      console.error('Failed to delete repository:', error);
      toast.error('Failed to delete repository', {
        description: error.message,
      });
      throw error;
    }
  }, []);

  const startScan = useCallback(async (
    repositoryId: string, 
    options?: { branch?: string; fullScan?: boolean; analysisType?: AnalysisType }
  ) => {
    try {
      const response = await triggerScan(repositoryId, options);
      if (response.success && response.data) {
        toast.success('Scan started successfully', {
          description: `Analysis ${response.data.analysis_id} is ${response.data.status}`,
        });
        
        return response.data;
      }
    } catch (error: any) {
      console.error('Failed to start scan:', error);
      toast.error('Failed to start scan', {
        description: error.message,
      });
      throw error;
    }
  }, []);

  const toggleStar = useCallback(async (id: string, starred: boolean) => {
    return updateRepo(id, { starred });
  }, [updateRepo]);

  const refreshRepositories = useCallback(() => {
    return loadRepositories();
  }, [loadRepositories]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (options.autoLoad !== false) {
      loadRepositories();
    }
  }, []);

  return {
    repositories,
    isLoading,
    pagination,
    stats,
    loadRepositories,
    loadRepository,
    addNewRepository,
    updateRepo,
    deleteRepo,
    startScan,
    toggleStar,
    refreshRepositories,
  };
}
