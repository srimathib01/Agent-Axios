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

// Components
import WorkspaceLoader from './components/WorkspaceLoader';
import FileExplorer from './components/FileExplorer';
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
  const [leftPanelWidth] = useState(280);
  const [rightPanelWidth] = useState(350);
  const [showVulnerabilityPanel, setShowVulnerabilityPanel] = useState(true);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showFixesPanel, setShowFixesPanel] = useState(false);
  const [vulnerabilityDecorations, setVulnerabilityDecorations] = useState<VulnerabilityDecoration[]>([]);

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
    <div className="flex flex-col h-screen bg-[#1e1e1e]">
      {/* Header bar */}
      <div className="header-bar">
        <div className="header-left">
          <span className="header-logo">🛡️</span>
          <span className="header-title">SecureFix IDE</span>
          <span className="header-separator">|</span>
          <span className="header-workspace">{config.repositoryPath.split(/[/\\]/).pop()}</span>
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
        <div className="activity-bar">
          <div
            className={`activity-bar-item ${showVulnerabilityPanel ? 'active' : ''}`}
            onClick={() => setShowVulnerabilityPanel(!showVulnerabilityPanel)}
            title="Explorer & Vulnerabilities"
          >
            📁
          </div>
          <div
            className={`activity-bar-item ${showChatPanel ? 'active' : ''}`}
            onClick={() => setShowChatPanel(!showChatPanel)}
            title="AI Chat"
          >
            💬
          </div>
          <div
            className={`activity-bar-item ${showFixesPanel ? 'active' : ''}`}
            onClick={() => setShowFixesPanel(!showFixesPanel)}
            title="AI Fixes"
          >
            🔧
            {pendingDiffZones.length > 0 && (
              <span className="fixes-badge">{pendingDiffZones.length}</span>
            )}
          </div>
          <div className="activity-bar-spacer" />
          <div
            className="activity-bar-item"
            onClick={() => setWorkspaceLoaded(false)}
            title="Change Workspace"
          >
            ⚙️
          </div>
        </div>

        {/* Left sidebar */}
        {showVulnerabilityPanel && (
          <div
            className="left-sidebar"
            style={{ width: leftPanelWidth }}
          >
            {/* File explorer */}
            <div className="sidebar-section" style={{ flex: 1 }}>
              <div className="sidebar-header">EXPLORER</div>
              <FileExplorer
                fileTree={fileTree}
                vulnerabilities={vulnerabilities}
                onFileClick={handleOpenFile}
                onDeleteFile={handleDeleteFile}
                onRefresh={handleRefreshFileTree}
                activeFilePath={activeFile?.path}
              />
            </div>

            {/* Vulnerability panel */}
            <div className="sidebar-section" style={{ flex: 1, borderTop: '1px solid #3c3c3c' }}>
              <div className="sidebar-header">VULNERABILITIES</div>
              <div className="sidebar-content">
                <VulnerabilityPanel />
              </div>
            </div>
          </div>
        )}

        {/* Main editor area */}
        <div className="editor-area">
          {/* Tabs */}
          {openFiles.length > 0 && (
            <div className="tabs-bar">
              {openFiles.map((file, index) => (
                <div
                  key={file.path}
                  className={`tab ${index === activeFileIndex ? 'active' : ''}`}
                  onClick={() => setActiveFileIndex(index)}
                >
                  <span className="tab-name">
                    {file.isDirty && <span className="dirty-indicator">●</span>}
                    {file.name}
                  </span>
                  <span
                    className="tab-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseFile(index);
                    }}
                  >
                    ✕
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Editor */}
          <div className="editor-content">
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
              <div className="editor-placeholder">
                <div className="placeholder-content">
                  <span className="placeholder-icon">📂</span>
                  <p>Select a file to view</p>
                  <p className="placeholder-hint">
                    Files with vulnerabilities are highlighted in the explorer
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar - Chat */}
        {showChatPanel && (
          <div
            className="right-sidebar"
            style={{ width: rightPanelWidth }}
          >
            <ChatPanel />
          </div>
        )}

        {/* Right sidebar - AI Fixes */}
        {showFixesPanel && (
          <div
            className="right-sidebar fixes-panel"
            style={{ width: rightPanelWidth }}
          >
            <div className="sidebar-header">AI FIXES</div>
            <div className="fixes-panel-content">
              <DiffViewer />
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="status-bar">
        <div className="status-left">
          <span className="status-item" style={{ fontWeight: 600 }}>SecureFix IDE</span>
          {summary.total > 0 && (
            <span className="status-item">
              {summary.critical > 0 && <span style={{ color: '#ff6b6b', fontWeight: 600 }}>{summary.critical}C</span>}
              {summary.critical > 0 && summary.high > 0 && <span style={{ opacity: 0.4, margin: '0 2px' }}>/</span>}
              {summary.high > 0 && <span style={{ color: '#ffa94d' }}>{summary.high}H</span>}
              {(summary.critical > 0 || summary.high > 0) && summary.medium > 0 && <span style={{ opacity: 0.4, margin: '0 2px' }}>/</span>}
              {summary.medium > 0 && <span style={{ color: '#ffd43b' }}>{summary.medium}M</span>}
              {(summary.critical > 0 || summary.high > 0 || summary.medium > 0) && summary.low > 0 && <span style={{ opacity: 0.4, margin: '0 2px' }}>/</span>}
              {summary.low > 0 && <span style={{ color: '#74c0fc' }}>{summary.low}L</span>}
              <span style={{ opacity: 0.5, marginLeft: 4 }}>({summary.total} total)</span>
            </span>
          )}
          <span
            className={`status-item ai-status ${aiConnected ? 'connected' : 'disconnected'}`}
            onClick={checkAIConnection}
            title={aiError || (aiConnected ? 'AI Fix Engine connected' : 'AI Fix Engine offline - click to retry')}
          >
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: aiChecking ? '#ffd43b' : aiConnected ? '#51cf66' : '#ff6b6b', marginRight: 4 }} />
            {aiChecking ? 'Checking...' : aiConnected ? 'AI Connected' : 'AI Offline'}
          </span>
        </div>
        <div className="status-right">
          {activeFile && (
            <>
              <span className="status-item" style={{ fontFamily: 'monospace', fontSize: 11 }}>{activeFile.language}</span>
              <span className="status-item" style={{ opacity: 0.6 }}>UTF-8</span>
            </>
          )}
        </div>
      </div>

      <style>{`
        .header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 16px;
          background: #252526;
          border-bottom: 1px solid #333333;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-logo {
          font-size: 18px;
        }

        .header-title {
          font-weight: 600;
          color: #fff;
        }

        .header-separator {
          color: #3c3c3c;
        }

        .header-workspace {
          color: #808080;
          font-size: 13px;
        }

        .header-right {
          display: flex;
          align-items: center;
        }

        .header-stats {
          display: flex;
          gap: 8px;
        }

        .stat {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 500;
        }

        .stat.critical {
          background: rgba(255, 77, 79, 0.2);
          color: #ff4d4f;
        }

        .stat.high {
          background: rgba(250, 140, 22, 0.2);
          color: #fa8c16;
        }

        .stat.medium {
          background: rgba(250, 219, 20, 0.2);
          color: #fadb14;
        }

        .stat.low {
          background: rgba(24, 144, 255, 0.2);
          color: #1890ff;
        }

        .activity-bar {
          width: 48px;
          background: #333333;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 0;
        }

        .activity-bar-item {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 8px;
          margin-bottom: 4px;
          font-size: 18px;
          opacity: 0.6;
          transition: all 0.2s;
        }

        .activity-bar-item:hover {
          opacity: 1;
          background: #3c3c3c;
        }

        .activity-bar-item.active {
          opacity: 1;
          background: #094771;
        }

        .activity-bar-spacer {
          flex: 1;
        }

        .left-sidebar {
          display: flex;
          flex-direction: column;
          background: #252526;
          border-right: 1px solid #3c3c3c;
          overflow: hidden;
        }

        .sidebar-section {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sidebar-header {
          padding: 8px 16px;
          font-size: 11px;
          font-weight: 600;
          color: #808080;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #3c3c3c;
          flex-shrink: 0;
        }

        .sidebar-content {
          flex: 1;
          overflow: auto;
        }

        .right-sidebar {
          background: #252526;
          border-left: 1px solid #3c3c3c;
          overflow: hidden;
        }

        .editor-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .tabs-bar {
          display: flex;
          background: #252526;
          border-bottom: 1px solid #3c3c3c;
          overflow-x: auto;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          cursor: pointer;
          border-right: 1px solid #3c3c3c;
          font-size: 13px;
          color: #808080;
          transition: background 0.1s;
        }

        .tab:hover {
          background: #2d2d2d;
        }

        .tab.active {
          background: #1e1e1e;
          color: #fff;
          border-bottom: 2px solid #0078d4;
        }

        .tab-name {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .dirty-indicator {
          color: #0078d4;
        }

        .tab-close {
          font-size: 10px;
          opacity: 0;
          transition: opacity 0.1s;
        }

        .tab:hover .tab-close {
          opacity: 1;
        }

        .editor-content {
          flex: 1;
          overflow: hidden;
        }

        .editor-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          background: #1e1e1e;
        }

        .placeholder-content {
          text-align: center;
          color: #808080;
        }

        .placeholder-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 16px;
        }

        .placeholder-hint {
          font-size: 12px;
          margin-top: 8px;
          color: #606060;
        }

        .status-bar {
          display: flex;
          justify-content: space-between;
          padding: 3px 12px;
          background: linear-gradient(90deg, #1a6fb5 0%, #1976c2 100%);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 0.01em;
        }

        .status-left, .status-right {
          display: flex;
          gap: 16px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .ai-status {
          cursor: pointer;
          padding: 0 8px;
          border-radius: 3px;
          transition: background 0.2s;
        }

        .ai-status:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .ai-status.connected {
          color: #89d185;
        }

        .ai-status.disconnected {
          color: #f48771;
        }

        /* Fixes badge */
        .activity-bar-item {
          position: relative;
        }

        .fixes-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          min-width: 16px;
          height: 16px;
          background: #e74c3c;
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          line-height: 1;
          animation: badge-pop 0.3s ease-out;
        }

        @keyframes badge-pop {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        /* Fixes panel */
        .fixes-panel {
          display: flex;
          flex-direction: column;
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
