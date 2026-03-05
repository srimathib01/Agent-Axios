/**
 * SecureFix IDE - Main Application Component
 *
 * Phase 2.2: Vulnerability Integration
 * Phase 2.3: AI Fix Engine Integration
 * - Loads repository and analysis report
 * - Displays file explorer with vulnerability indicators
 * - Shows vulnerability panel with findings
 * - Integrates Monaco editor for code viewing
 * - Connects to AI Fix Engine backend for fix generation
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from '../../../gui/src/store';
import {
  setVulnerabilities,
  selectAllVulnerabilities,
  selectSelectedVulnerability,
  selectVulnerability,
  selectVulnerabilitySummary,
} from '../../../gui/src/store/vulnerabilitySlice';
import { MonacoEditor, MonacoEditorRef, VulnerabilityDecoration } from '../../editor';
import { Shield, FolderGit2, MessagesSquare, Wrench, GitBranchPlus, Settings2, FileCode2, X, AlertTriangle } from 'lucide-react';


// Components
import WorkspaceLoader from './components/WorkspaceLoader';
import FileExplorer from './components/FileExplorer';
import SourceControlPanel from './components/SourceControlPanel';
import VulnerabilityPanel from '../../../gui/src/components/VulnerabilityPanel/VulnerabilityPanel';
import ChatPanel from '../../../gui/src/components/Chat/ChatPanel';
import DiffViewer from '../../../gui/src/components/DiffViewer/DiffViewer';

// Services
import { loadWorkspace, WorkspaceConfig, getVulnerabilitiesForFile, SEVERITY_COLORS } from './services/vulnerabilityLoader';
import { FileNode, readFileContent, writeFileContent, sortFileTree, loadRepositoryTree, deleteFile } from './services/repositoryService';
import { Vulnerability } from '../../../gui/src/store/vulnerabilitySlice';
import { selectPendingDiffZones, selectFixStream } from '../../../gui/src/store/diffSlice';

// AI Fix Engine Integration
import { useAIFixEngine } from './hooks/useAIFixEngine';

// Default configuration (as specified by user)
const DEFAULT_CONFIG: WorkspaceConfig = {
  repositoryPath: 'C:\\Users\\HP\\OneDrive\\Desktop\\Agent-Axios\\Agent-Axios\\agent-axios-node-backend\\data\\repositories\\damn-vulnerable-MCP-server_1768676082504',
  reportPath: 'C:\\Users\\HP\\OneDrive\\Desktop\\Agent-Axios\\Agent-Axios\\agent-axios-node-backend\\data\\reports\\analysis_5_report.txt',
};

// Types
interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
}

// Main App Content (inside Provider)
const AppContent: React.FC = () => {
  const dispatch = useDispatch();
  const vulnerabilities = useSelector(selectAllVulnerabilities);
  const selectedVulnerability = useSelector(selectSelectedVulnerability);
  const summary = useSelector(selectVulnerabilitySummary);

  // AI Fix Engine integration
  const {
    isConnected: aiConnected,
    isChecking: aiChecking,
    error: aiError,
    setVulnerabilities: setAIVulnerabilities,
    checkConnection: checkAIConnection,
  } = useAIFixEngine();

  // Workspace state
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<WorkspaceConfig>(DEFAULT_CONFIG);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);

  // File management state
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(-1);

  // UI state
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(350);
  const [explorerHeightPercent, setExplorerHeightPercent] = useState(50);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isResizingVertical, setIsResizingVertical] = useState(false);
  const [showVulnerabilityPanel, setShowVulnerabilityPanel] = useState(true);
  const [showSourceControlPanel, setShowSourceControlPanel] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showFixesPanel, setShowFixesPanel] = useState(false);
  const [vulnerabilityDecorations, setVulnerabilityDecorations] = useState<VulnerabilityDecoration[]>([]);

  // Resize handlers
  const startResizingLeft = useCallback(() => setIsResizingLeft(true), []);
  const startResizingRight = useCallback(() => setIsResizingRight(true), []);
  const startResizingVertical = useCallback(() => setIsResizingVertical(true), []);
  const stopResizing = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
    setIsResizingVertical(false);
  }, []);

  const handleResize = useCallback((e: MouseEvent) => {
    if (isResizingLeft) {
      const newWidth = e.clientX - 56; // 56px Activity Bar
      if (newWidth > 150 && newWidth < 800) setLeftPanelWidth(newWidth);
    } else if (isResizingRight) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 250 && newWidth < 800) setRightPanelWidth(newWidth);
    } else if (isResizingVertical) {
      // Approximate height using clientY
      const headerHeight = 40;
      const windowHeight = window.innerHeight;
      const newPercent = ((e.clientY - headerHeight) / (windowHeight - headerHeight)) * 100;
      if (newPercent > 10 && newPercent < 90) setExplorerHeightPercent(newPercent);
    }
  }, [isResizingLeft, isResizingRight, isResizingVertical]);

  useEffect(() => {
    if (isResizingLeft || isResizingRight || isResizingVertical) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResizing);
    }
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizingLeft, isResizingRight, isResizingVertical, handleResize, stopResizing]);

  // DiffViewer selectors
  const pendingDiffZones = useSelector(selectPendingDiffZones);
  const fixStream = useSelector(selectFixStream);

  const editorRef = useRef<MonacoEditorRef>(null);

  // Get active file
  const activeFile = activeFileIndex >= 0 && activeFileIndex < openFiles.length
    ? openFiles[activeFileIndex]
    : null;

  // Load workspace
  const handleLoadWorkspace = useCallback(async (workspaceConfig: WorkspaceConfig) => {
    setIsLoading(true);
    setError(null);
    setConfig(workspaceConfig);

    try {
      const workspace = await loadWorkspace(workspaceConfig);

      // Update state
      setFileTree(sortFileTree(workspace.fileTree));
      dispatch(setVulnerabilities(workspace.vulnerabilities));
      setWorkspaceLoaded(true);

      console.log(`✅ Workspace loaded: ${workspace.report.totalFindings} vulnerabilities found`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workspace';
      setError(message);
      console.error('❌ Failed to load workspace:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  // Open file in editor
  const handleOpenFile = useCallback(async (path: string) => {
    // Check if already open
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

  // Close file
  const handleCloseFile = useCallback((index: number) => {
    setOpenFiles(prev => prev.filter((_, i) => i !== index));

    if (activeFileIndex === index) {
      setActiveFileIndex(Math.max(0, index - 1));
    } else if (activeFileIndex > index) {
      setActiveFileIndex(prev => prev - 1);
    }

    if (openFiles.length === 1) {
      setActiveFileIndex(-1);
    }
  }, [activeFileIndex, openFiles.length]);

  // Update decorations when active file changes
  useEffect(() => {
    if (activeFile) {
      const fileVulns = getVulnerabilitiesForFile(vulnerabilities, activeFile.path);
      const decorations: VulnerabilityDecoration[] = fileVulns.map(vuln => ({
        id: vuln.id,
        startLine: vuln.location.startLine,
        endLine: vuln.location.endLine,
        severity: vuln.severity,
        message: `${vuln.cwe.id}: ${vuln.title}`,
        description: vuln.description,
      }));
      setVulnerabilityDecorations(decorations);
    } else {
      setVulnerabilityDecorations([]);
    }
  }, [activeFile, vulnerabilities]);

  // Navigate to vulnerability
  const handleNavigateToVulnerability = useCallback(async (vuln: Vulnerability) => {
    await handleOpenFile(vuln.location.fileUri);
    // Scroll to line is handled by editor component via decorations
  }, [handleOpenFile]);

  // Handle editor content change
  const handleEditorChange = useCallback((content: string) => {
    if (activeFileIndex >= 0) {
      setOpenFiles(prev =>
        prev.map((f, i) =>
          i === activeFileIndex ? { ...f, content, isDirty: true } : f
        )
      );
    }
  }, [activeFileIndex]);

  // Save file
  const handleSaveFile = useCallback(async () => {
    if (!activeFile) return;

    try {
      await writeFileContent(activeFile.path, activeFile.content);
      setOpenFiles(prev =>
        prev.map((f, i) =>
          i === activeFileIndex ? { ...f, isDirty: false } : f
        )
      );
      console.log(`✅ Saved: ${activeFile.name}`);
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  }, [activeFile, activeFileIndex]);

  // Delete file
  const handleDeleteFile = useCallback(async (path: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete this file?\n${path}`);
    if (!confirmDelete) return;

    try {
      const success = await deleteFile(path);
      if (success) {
        // Close the file if it's open
        const openIndex = openFiles.findIndex(f => f.path === path);
        if (openIndex >= 0) {
          handleCloseFile(openIndex);
        }
        // Refresh file tree
        const newTree = await loadRepositoryTree(config.repositoryPath);
        setFileTree(sortFileTree(newTree));
        console.log(`🗑️ Deleted: ${path}`);
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  }, [openFiles, handleCloseFile, config.repositoryPath]);

  // Refresh file tree
  const handleRefreshFileTree = useCallback(async () => {
    try {
      const newTree = await loadRepositoryTree(config.repositoryPath);
      setFileTree(sortFileTree(newTree));
      console.log('🔄 File tree refreshed');
    } catch (err) {
      console.error('Failed to refresh file tree:', err);
    }
  }, [config.repositoryPath]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveFile();
      }
      // F5: Refresh file tree
      if (e.key === 'F5') {
        e.preventDefault();
        handleRefreshFileTree();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveFile, handleRefreshFileTree]);

  // Auto-show fixes panel when fix stream starts or pending zones appear
  useEffect(() => {
    const isStreaming = fixStream && !fixStream.isComplete && !fixStream.error;
    const hasPending = pendingDiffZones.length > 0;
    const hasError = fixStream && fixStream.error;

    if (isStreaming || hasPending || hasError) {
      setShowFixesPanel(true);
    }
  }, [fixStream, pendingDiffZones.length]);

  // Sync vulnerabilities with AI Fix Engine service
  useEffect(() => {
    if (vulnerabilities.length > 0) {
      // Map to core Vulnerability type (add missing detectedAt field)
      const coreVulnerabilities = vulnerabilities.map(v => ({
        ...v,
        detectedAt: new Date(),
      }));
      setAIVulnerabilities(coreVulnerabilities);
    }
  }, [vulnerabilities, setAIVulnerabilities]);

  // If workspace not loaded, show loader
  if (!workspaceLoaded) {
    return (
      <WorkspaceLoader
        onLoad={handleLoadWorkspace}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  return (
    <div className={`flex flex-col h-screen bg-[#1e1e1e] ${isResizingLeft || isResizingRight ? 'select-none cursor-col-resize pointer-events-none' : isResizingVertical ? 'select-none cursor-row-resize pointer-events-none' : ''}`}>
      {/* Header bar */}
      <div className="header-bar bg-[#0B0D11] border-b border-[#222533] px-4 py-2 flex justify-between items-center text-sm shadow-sm z-10">
        <div className="header-left flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-500" />
          <span className="header-title font-semibold text-gray-100 tracking-wide">SecureFix IDE</span>
          <span className="header-separator text-gray-600">|</span>
          <span className="header-workspace text-gray-400 text-xs font-medium bg-[#1A1D27] px-2 py-0.5 rounded-md border border-[#2A2E3D]">
            {config.repositoryPath.split(/[/\\]/).pop()}
          </span>
        </div>
        <div className="header-right">
          <div className="header-stats">
            {summary.critical > 0 && (
              <span className="stat critical">{summary.critical} Critical</span>
            )}
            {summary.high > 0 && (
              <span className="stat high">{summary.high} High</span>
            )}
            {summary.medium > 0 && (
              <span className="stat medium">{summary.medium} Medium</span>
            )}
            {summary.low > 0 && (
              <span className="stat low">{summary.low} Low</span>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity bar */}
        <div className="activity-bar w-14 bg-[#0B0D11] border-r border-[#222533] flex flex-col items-center py-4 gap-2 z-10">
          <div
            className={`activity-bar-item group relative flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-all duration-200 ${showVulnerabilityPanel ? 'bg-blue-500/10 text-blue-400' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1A1D27]'
              }`}
            onClick={() => {
              setShowVulnerabilityPanel(!showVulnerabilityPanel);
              if (!showVulnerabilityPanel) setShowSourceControlPanel(false);
            }}
            title="Explorer & Vulnerabilities"
          >
            <FolderGit2 className="w-5 h-5 transition-transform group-hover:scale-110" strokeWidth={1.5} />
            {showVulnerabilityPanel && <div className="absolute left-0 w-1 h-5 bg-blue-500 rounded-r-md" />}
          </div>
          <div
            className={`activity-bar-item group relative flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-all duration-200 ${showSourceControlPanel ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1A1D27]'
              }`}
            onClick={() => {
              setShowSourceControlPanel(!showSourceControlPanel);
              if (!showSourceControlPanel) setShowVulnerabilityPanel(false);
            }}
            title="Source Control"
          >
            <GitBranchPlus className="w-5 h-5 transition-transform group-hover:scale-110" strokeWidth={1.5} />
            {showSourceControlPanel && <div className="absolute left-0 w-1 h-5 bg-indigo-500 rounded-r-md" />}
          </div>
          <div
            className={`activity-bar-item group relative flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-all duration-200 ${showChatPanel ? 'bg-purple-500/10 text-purple-400' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1A1D27]'
              }`}
            onClick={() => setShowChatPanel(!showChatPanel)}
            title="AI Chat"
          >
            <MessagesSquare className="w-5 h-5 transition-transform group-hover:scale-110" strokeWidth={1.5} />
            {showChatPanel && <div className="absolute left-0 w-1 h-5 bg-purple-500 rounded-r-md" />}
          </div>
          <div
            className={`activity-bar-item group relative flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-all duration-200 ${showFixesPanel ? 'bg-green-500/10 text-green-400' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1A1D27]'
              }`}
            onClick={() => setShowFixesPanel(!showFixesPanel)}
            title="AI Fixes"
          >
            <Wrench className="w-5 h-5 transition-transform group-hover:scale-110" strokeWidth={1.5} />
            {pendingDiffZones.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm border border-[#0B0D11] animate-pulse">
                {pendingDiffZones.length}
              </span>
            )}
            {showFixesPanel && <div className="absolute left-0 w-1 h-5 bg-green-500 rounded-r-md" />}
          </div>
          <div className="flex-1" />
          <div
            className="activity-bar-item group flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer text-gray-500 hover:text-gray-300 hover:bg-[#1A1D27] transition-all duration-200"
            onClick={() => setWorkspaceLoaded(false)}
            title="Change Workspace"
          >
            <Settings2 className="w-5 h-5 transition-transform group-hover:rotate-45" strokeWidth={1.5} />
          </div>
        </div>

        {/* Left sidebar */}
        {showVulnerabilityPanel && (
          <div
            className="left-sidebar bg-[#12141C] border-r border-[#222533] flex flex-col shadow-inner overflow-hidden"
            style={{ width: leftPanelWidth }}
          >
            {/* File explorer */}
            <div className="sidebar-section flex flex-col overflow-hidden" style={{ height: `${explorerHeightPercent}%` }}>
              <div className="sidebar-header px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#222533] bg-[#0F111A]">
                EXPLORER
              </div>
              <FileExplorer
                fileTree={fileTree}
                vulnerabilities={vulnerabilities}
                onFileClick={handleOpenFile}
                onDeleteFile={handleDeleteFile}
                onRefresh={handleRefreshFileTree}
                activeFilePath={activeFile?.path}
              />
            </div>

            {/* Vertical resize handle */}
            <div
              className="h-1 cursor-row-resize bg-transparent hover:bg-blue-500 z-40 transition-colors shrink-0 pointer-events-auto -mt-[1px]"
              onMouseDown={startResizingVertical}
            />

            {/* Vulnerability panel */}
            <div className="sidebar-section flex flex-col border-t border-[#222533] overflow-hidden" style={{ height: `${100 - explorerHeightPercent}%` }}>
              <div className="sidebar-header px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#222533] bg-[#0F111A] flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" /> VULNERABILITIES
              </div>
              <div className="sidebar-content flex-1 overflow-hidden">
                <VulnerabilityPanel />
              </div>
            </div>
          </div>
        )}

        {/* Left sidebar - Source Control */}
        {showSourceControlPanel && (
          <div
            className="left-sidebar bg-[#12141C] border-r border-[#222533] flex flex-col shadow-inner overflow-hidden"
            style={{ width: leftPanelWidth }}
          >
            <SourceControlPanel
              repositoryPath={config.repositoryPath}
              onFileClick={handleOpenFile}
            />
          </div>
        )}

        {/* Left sidebar resize handle */}
        {(showVulnerabilityPanel || showSourceControlPanel) && (
          <div
            className="w-1 bg-transparent hover:bg-blue-500 cursor-col-resize z-40 transition-colors shrink-0 border-r border-transparent hover:border-blue-500 pointer-events-auto -ml-[1px]"
            onMouseDown={startResizingLeft}
          />
        )}

        {/* Main editor area */}
        <div className={`editor-area flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0F111A] ${isResizingLeft || isResizingRight ? 'pointer-events-none' : 'pointer-events-auto'}`}>
          {/* Tabs */}
          {openFiles.length > 0 && (
            <div className="tabs-bar flex bg-[#0B0D11] border-b border-[#222533] overflow-x-auto shadow-sm snap-x">
              {openFiles.map((file, index) => (
                <div
                  key={file.path}
                  className={`tab group flex items-center justify-between gap-3 px-4 py-2 cursor-pointer border-r border-[#222533] text-[13px] transition-all duration-200 snap-start shrink-0 min-w-[120px] max-w-[200px] ${index === activeFileIndex
                    ? 'bg-[#12141C] text-blue-400 border-t-2 border-t-blue-500'
                    : 'text-gray-400 hover:bg-[#1A1D27] hover:text-gray-200 border-t-2 border-t-transparent'
                    }`}
                  onClick={() => setActiveFileIndex(index)}
                >
                  <span className="tab-name flex items-center gap-2 truncate flex-1 font-medium">
                    {file.isDirty ? <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> : <FileCode2 className="w-3.5 h-3.5 opacity-70 shrink-0" />}
                    <span className="truncate">{file.name}</span>
                  </span>
                  <button
                    className={`tab-close rounded p-0.5 transition-all duration-200 ${index === activeFileIndex ? 'opacity-100 hover:bg-[#222533] hover:text-white' : 'opacity-0 group-hover:opacity-100 hover:bg-[#2A2E3D]'
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseFile(index);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Editor */}
          <div className="editor-content flex-1 overflow-hidden relative">
            {activeFile ? (
              <MonacoEditor
                ref={editorRef}
                value={activeFile.content}
                language={activeFile.language}
                path={activeFile.path}
                onChange={handleEditorChange}
                onSave={handleSaveFile}
                vulnerabilityDecorations={vulnerabilityDecorations}
              />
            ) : (
              <div className="editor-placeholder flex items-center justify-center h-full bg-[#0F111A]">
                <div className="placeholder-content text-center flex flex-col items-center">
                  <div className="w-24 h-24 mb-6 rounded-2xl bg-gradient-to-tr from-[#1A1D27] to-[#222533] flex items-center justify-center shadow-lg border border-[#2A2E3D]">
                    <FileCode2 className="w-12 h-12 text-gray-500" strokeWidth={1} />
                  </div>
                  <h3 className="text-xl font-medium text-gray-300 mb-2">Select a file to view</h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Navigate through the Explorer or Source Control to open and edit project files
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar resize handle */}
        {(showChatPanel || showFixesPanel) && (
          <div
            className="w-1 bg-transparent hover:bg-blue-500 cursor-col-resize z-40 transition-colors shrink-0 border-l border-transparent hover:border-blue-500 pointer-events-auto -mr-[1px]"
            onMouseDown={startResizingRight}
          />
        )}

        {/* Right sidebar - Chat */}
        {showChatPanel && (
          <div
            className="right-sidebar bg-[#12141C] border-l border-[#222533] shadow-inner"
            style={{ width: rightPanelWidth }}
          >
            <ChatPanel />
          </div>
        )}

        {/* Right sidebar - AI Fixes */}
        {showFixesPanel && (
          <div
            className="right-sidebar fixes-panel bg-[#12141C] border-l border-[#222533] flex flex-col shadow-inner"
            style={{ width: rightPanelWidth }}
          >
            <div className="sidebar-header px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#222533] bg-[#0F111A] flex items-center gap-2">
              <Wrench className="w-3 h-3" /> AI FIXES
            </div>
            <div className="fixes-panel-content">
              <DiffViewer />
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="status-bar bg-[#0B0D11] border-t border-[#222533] px-3 py-1 flex justify-between items-center text-[11px] text-gray-400 z-10 bottom-0 select-none">
        <div className="status-left flex gap-4">
          <span className="status-item font-semibold text-gray-300">SecureFix IDE</span>
          {summary.total > 0 && (
            <span className="status-item flex items-center gap-1.5 bg-[#12141C] px-2 py-0.5 rounded-sm border border-[#222533]">
              {summary.critical > 0 && <span className="text-red-400 font-bold">{summary.critical}C</span>}
              {summary.critical > 0 && summary.high > 0 && <span className="text-gray-600">/</span>}
              {summary.high > 0 && <span className="text-orange-400 font-medium">{summary.high}H</span>}
              {(summary.critical > 0 || summary.high > 0) && summary.medium > 0 && <span className="text-gray-600">/</span>}
              {summary.medium > 0 && <span className="text-yellow-400">{summary.medium}M</span>}
              {(summary.critical > 0 || summary.high > 0 || summary.medium > 0) && summary.low > 0 && <span className="text-gray-600">/</span>}
              {summary.low > 0 && <span className="text-blue-400">{summary.low}L</span>}
            </span>
          )}
          <span
            className={`status-item flex items-center gap-1.5 px-2 py-0.5 rounded-sm cursor-pointer transition-colors border ${aiConnected ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
              : aiChecking ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
              }`}
            onClick={checkAIConnection}
            title={aiError || (aiConnected ? 'AI Fix Engine connected' : 'AI Fix Engine offline - click to retry')}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${aiChecking ? 'bg-yellow-400 animate-pulse' : aiConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            {aiChecking ? 'Checking...' : aiConnected ? 'AI Connected' : 'AI Offline'}
          </span>
        </div>
        <div className="status-right flex gap-4">
          {activeFile && (
            <>
              <span className="status-item font-mono bg-[#12141C] px-2 py-0.5 rounded-sm border border-[#222533]">{activeFile.language}</span>
              <span className="status-item text-gray-500">UTF-8</span>
            </>
          )}
        </div>
      </div>

      <style>{`
        /* Global CSS Reset & Overrides */
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* Scrollbar aesthetics */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0B0D11;
        }
        ::-webkit-scrollbar-thumb {
          background: #2A2E3D;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #3c4257;
        }

        .fixes-panel-content {
          flex: 1;
          overflow: auto;
        }
      `}</style>
    </div>
  );
};

// Root App with Provider
const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;
