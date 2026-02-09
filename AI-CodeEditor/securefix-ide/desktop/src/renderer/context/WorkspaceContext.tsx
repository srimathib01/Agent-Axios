/**
 * Workspace Context
 *
 * React context for sharing workspace state across the application.
 * This includes repository, vulnerabilities, and file management.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setVulnerabilities, selectAllVulnerabilities } from '../../../../gui/src/store/vulnerabilitySlice';
import {
  loadWorkspace,
  LoadedWorkspace,
  WorkspaceConfig,
  getVulnerabilitySummary,
  getVulnerabilitiesForFile,
  SEVERITY_COLORS,
  SEVERITY_ICONS,
} from '../services/vulnerabilityLoader';
import { FileNode, readFileContent, FileContent, sortFileTree } from '../services/repositoryService';
import { Vulnerability } from '../../../../gui/src/store/vulnerabilitySlice';

// Default workspace configuration (your specified paths)
const DEFAULT_CONFIG: WorkspaceConfig = {
  repositoryPath: 'C:\\Users\\HP\\OneDrive\\Desktop\\Agent-Axios\\Agent-Axios\\agent-axios-node-backend\\data\\repositories\\damn-vulnerable-MCP-server_1768676082504',
  reportPath: 'C:\\Users\\HP\\OneDrive\\Desktop\\Agent-Axios\\Agent-Axios\\agent-axios-node-backend\\data\\reports\\analysis_5_report.txt',
};

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
}

export interface WorkspaceContextValue {
  // Workspace state
  workspace: LoadedWorkspace | null;
  isLoading: boolean;
  error: string | null;
  config: WorkspaceConfig;

  // File management
  fileTree: FileNode[];
  openFiles: OpenFile[];
  activeFileIndex: number;
  activeFile: OpenFile | null;

  // Vulnerabilities
  vulnerabilities: Vulnerability[];
  selectedVulnerability: Vulnerability | null;

  // Actions
  setConfig: (config: WorkspaceConfig) => void;
  loadWorkspaceFromConfig: () => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeFile: (index: number) => void;
  setActiveFile: (index: number) => void;
  updateFileContent: (index: number, content: string) => void;
  saveFile: (index: number) => Promise<void>;
  selectVulnerability: (vuln: Vulnerability | null) => void;
  navigateToVulnerability: (vuln: Vulnerability) => Promise<void>;

  // Helpers
  getFileVulnerabilities: (filePath: string) => Vulnerability[];
  getSummary: () => ReturnType<typeof getVulnerabilitySummary> | null;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();
  const vulnerabilities = useSelector(selectAllVulnerabilities);

  // Workspace state
  const [workspace, setWorkspace] = useState<LoadedWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<WorkspaceConfig>(DEFAULT_CONFIG);

  // File management state
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(-1);

  // Vulnerability state
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null);

  // Computed
  const activeFile = activeFileIndex >= 0 && activeFileIndex < openFiles.length
    ? openFiles[activeFileIndex]
    : null;

  // Load workspace from current config
  const loadWorkspaceFromConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loaded = await loadWorkspace(config);
      setWorkspace(loaded);
      setFileTree(sortFileTree(loaded.fileTree));

      // Update Redux store with vulnerabilities
      dispatch(setVulnerabilities(loaded.vulnerabilities));

      console.log(`✅ Workspace loaded: ${loaded.report.totalFindings} vulnerabilities found`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workspace';
      setError(message);
      console.error('❌ Failed to load workspace:', err);
    } finally {
      setIsLoading(false);
    }
  }, [config, dispatch]);

  // Open a file in the editor
  const openFile = useCallback(async (path: string) => {
    // Check if file is already open
    const existingIndex = openFiles.findIndex(f => f.path === path);
    if (existingIndex >= 0) {
      setActiveFileIndex(existingIndex);
      return;
    }

    try {
      const content = await readFileContent(path);
      const newFile: OpenFile = {
        path: content.path,
        name: content.name,
        content: content.content,
        language: content.language,
        isDirty: false,
      };

      setOpenFiles(prev => [...prev, newFile]);
      setActiveFileIndex(openFiles.length);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, [openFiles]);

  // Close a file
  const closeFile = useCallback((index: number) => {
    setOpenFiles(prev => prev.filter((_, i) => i !== index));

    if (activeFileIndex === index) {
      setActiveFileIndex(Math.max(0, index - 1));
    } else if (activeFileIndex > index) {
      setActiveFileIndex(activeFileIndex - 1);
    }

    if (openFiles.length === 1) {
      setActiveFileIndex(-1);
    }
  }, [activeFileIndex, openFiles.length]);

  // Set active file
  const setActiveFile = useCallback((index: number) => {
    if (index >= 0 && index < openFiles.length) {
      setActiveFileIndex(index);
    }
  }, [openFiles.length]);

  // Update file content
  const updateFileContent = useCallback((index: number, content: string) => {
    setOpenFiles(prev =>
      prev.map((f, i) =>
        i === index ? { ...f, content, isDirty: true } : f
      )
    );
  }, []);

  // Save file
  const saveFile = useCallback(async (index: number) => {
    const file = openFiles[index];
    if (!file) return;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('write_file', { path: file.path, content: file.content });
      setOpenFiles(prev =>
        prev.map((f, i) =>
          i === index ? { ...f, isDirty: false } : f
        )
      );
      console.log(`✅ Saved: ${file.name}`);
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  }, [openFiles]);

  // Select a vulnerability
  const selectVulnerability = useCallback((vuln: Vulnerability | null) => {
    setSelectedVulnerability(vuln);
  }, []);

  // Navigate to a vulnerability (open file and scroll to line)
  const navigateToVulnerability = useCallback(async (vuln: Vulnerability) => {
    selectVulnerability(vuln);
    await openFile(vuln.location.fileUri);
    // Note: Scrolling to line would be handled by the editor component
  }, [openFile, selectVulnerability]);

  // Get vulnerabilities for a specific file
  const getFileVulnerabilities = useCallback((filePath: string): Vulnerability[] => {
    return getVulnerabilitiesForFile(vulnerabilities, filePath);
  }, [vulnerabilities]);

  // Get summary
  const getSummary = useCallback(() => {
    return getVulnerabilitySummary(vulnerabilities);
  }, [vulnerabilities]);

  const value: WorkspaceContextValue = {
    // State
    workspace,
    isLoading,
    error,
    config,
    fileTree,
    openFiles,
    activeFileIndex,
    activeFile,
    vulnerabilities,
    selectedVulnerability,

    // Actions
    setConfig,
    loadWorkspaceFromConfig,
    openFile,
    closeFile,
    setActiveFile,
    updateFileContent,
    saveFile,
    selectVulnerability,
    navigateToVulnerability,

    // Helpers
    getFileVulnerabilities,
    getSummary,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }
  return context;
}

// Re-export severity helpers
export { SEVERITY_COLORS, SEVERITY_ICONS };

export default WorkspaceContext;
