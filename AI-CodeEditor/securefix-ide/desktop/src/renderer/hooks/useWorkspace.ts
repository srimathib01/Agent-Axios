/**
 * useWorkspace Hook
 *
 * React hook for managing workspace state including repository,
 * analysis report, and vulnerabilities.
 */

import { useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setVulnerabilities } from '../../../../gui/src/store/vulnerabilitySlice';
import {
  loadWorkspace,
  LoadedWorkspace,
  WorkspaceConfig,
  getVulnerabilitySummary,
  getVulnerabilitiesForFile,
} from '../services/vulnerabilityLoader';
import { FileNode, readFileContent, FileContent } from '../services/repositoryService';
import { Vulnerability } from '../../../../gui/src/store/vulnerabilitySlice';

export interface UseWorkspaceReturn {
  // State
  workspace: LoadedWorkspace | null;
  isLoading: boolean;
  error: string | null;
  activeFile: FileContent | null;

  // Actions
  loadFromConfig: (config: WorkspaceConfig) => Promise<void>;
  openFile: (path: string) => Promise<FileContent | null>;
  getFileVulnerabilities: (filePath: string) => Vulnerability[];
  getSummary: () => ReturnType<typeof getVulnerabilitySummary> | null;

  // File tree helpers
  fileTree: FileNode[];
  repositoryPath: string | null;
  reportPath: string | null;
}

export function useWorkspace(): UseWorkspaceReturn {
  const dispatch = useDispatch();

  const [workspace, setWorkspace] = useState<LoadedWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<FileContent | null>(null);

  // Load workspace from config
  const loadFromConfig = useCallback(async (config: WorkspaceConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      const loaded = await loadWorkspace(config);
      setWorkspace(loaded);

      // Update Redux store with vulnerabilities
      dispatch(setVulnerabilities(loaded.vulnerabilities));

      console.log(`Loaded workspace: ${loaded.report.totalFindings} vulnerabilities found`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workspace';
      setError(message);
      console.error('Failed to load workspace:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  // Open a file
  const openFile = useCallback(async (path: string): Promise<FileContent | null> => {
    try {
      const content = await readFileContent(path);
      setActiveFile(content);
      return content;
    } catch (err) {
      console.error('Failed to open file:', err);
      return null;
    }
  }, []);

  // Get vulnerabilities for a specific file
  const getFileVulnerabilities = useCallback((filePath: string): Vulnerability[] => {
    if (!workspace) return [];
    return getVulnerabilitiesForFile(workspace.vulnerabilities, filePath);
  }, [workspace]);

  // Get summary
  const getSummary = useCallback(() => {
    if (!workspace) return null;
    return getVulnerabilitySummary(workspace.vulnerabilities);
  }, [workspace]);

  return {
    workspace,
    isLoading,
    error,
    activeFile,
    loadFromConfig,
    openFile,
    getFileVulnerabilities,
    getSummary,
    fileTree: workspace?.fileTree || [],
    repositoryPath: workspace?.config.repositoryPath || null,
    reportPath: workspace?.config.reportPath || null,
  };
}

export default useWorkspace;
