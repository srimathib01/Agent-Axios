/**
 * WorkspaceLoader Component
 *
 * UI component for loading a workspace with repository and analysis report.
 * Allows configuration of both paths and provides visual feedback during loading.
 */

import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { WorkspaceConfig } from '../services/vulnerabilityLoader';

// Default paths (as specified by user)
const DEFAULT_REPO_PATH = 'C:\\Users\\HP\\OneDrive\\Desktop\\Agent-Axios\\Agent-Axios\\agent-axios-node-backend\\data\\repositories\\damn-vulnerable-MCP-server_1768676082504';
const DEFAULT_REPORT_PATH = 'C:\\Users\\HP\\OneDrive\\Desktop\\Agent-Axios\\Agent-Axios\\agent-axios-node-backend\\data\\reports\\analysis_5_report.txt';

interface WorkspaceLoaderProps {
  onLoad: (config: WorkspaceConfig) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const WorkspaceLoader: React.FC<WorkspaceLoaderProps> = ({ onLoad, isLoading, error }) => {
  const [repoPath, setRepoPath] = useState(DEFAULT_REPO_PATH);
  const [reportPath, setReportPath] = useState(DEFAULT_REPORT_PATH);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleBrowseRepo = async () => {
    try {
      const selected = await open({
        directory: true,
        title: 'Select Repository Folder',
      });
      if (selected && typeof selected === 'string') {
        setRepoPath(selected);
      }
    } catch (err) {
      console.error('Failed to open folder dialog:', err);
    }
  };

  const handleBrowseReport = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: 'Reports', extensions: ['txt', 'json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        title: 'Select Analysis Report',
      });
      if (selected && typeof selected === 'string') {
        setReportPath(selected);
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  };

  const handleLoad = async () => {
    await onLoad({
      repositoryPath: repoPath,
      reportPath: reportPath,
    });
  };

  const handleLoadDefault = async () => {
    setRepoPath(DEFAULT_REPO_PATH);
    setReportPath(DEFAULT_REPORT_PATH);
    await onLoad({
      repositoryPath: DEFAULT_REPO_PATH,
      reportPath: DEFAULT_REPORT_PATH,
    });
  };

  return (
    <div className="workspace-loader">
      <div className="workspace-loader-header">
        <div className="workspace-loader-icon">🛡️</div>
        <h1 className="workspace-loader-title">SecureFix IDE</h1>
        <p className="workspace-loader-subtitle">AI-Powered Vulnerability Analysis</p>
      </div>

      <div className="workspace-loader-content">
        {/* Quick Load Section */}
        <div className="workspace-loader-section">
          <h3 className="section-title">Quick Start</h3>
          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleLoadDefault}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Loading Workspace...
              </>
            ) : (
              <>
                <span className="btn-icon">🚀</span>
                Load Default Analysis
              </>
            )}
          </button>
          <p className="section-hint">
            Load the damn-vulnerable-MCP-server with analysis report #5
          </p>
        </div>

        {/* Advanced Configuration */}
        <div className="workspace-loader-section">
          <button
            className="section-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span className={`toggle-arrow ${showAdvanced ? 'open' : ''}`}>▶</span>
            Custom Configuration
          </button>

          {showAdvanced && (
            <div className="advanced-config">
              {/* Repository Path */}
              <div className="config-field">
                <label className="config-label">Repository Path</label>
                <div className="config-input-group">
                  <input
                    type="text"
                    className="config-input"
                    value={repoPath}
                    onChange={(e) => setRepoPath(e.target.value)}
                    placeholder="Path to repository folder..."
                  />
                  <button className="btn btn-secondary" onClick={handleBrowseRepo}>
                    Browse
                  </button>
                </div>
              </div>

              {/* Report Path */}
              <div className="config-field">
                <label className="config-label">Analysis Report</label>
                <div className="config-input-group">
                  <input
                    type="text"
                    className="config-input"
                    value={reportPath}
                    onChange={(e) => setReportPath(e.target.value)}
                    placeholder="Path to analysis report..."
                  />
                  <button className="btn btn-secondary" onClick={handleBrowseReport}>
                    Browse
                  </button>
                </div>
              </div>

              {/* Load Button */}
              <button
                className="btn btn-primary w-full mt-4"
                onClick={handleLoad}
                disabled={isLoading || !repoPath || !reportPath}
              >
                Load Custom Workspace
              </button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="workspace-loader-error">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}

        {/* Info Section */}
        <div className="workspace-loader-info">
          <h4>How it works:</h4>
          <ol>
            <li>Select a repository that has been analyzed by Agent-Axios</li>
            <li>Choose the corresponding analysis report file</li>
            <li>Review vulnerabilities with code context in the editor</li>
            <li>Apply AI-powered fixes (coming in Phase 2.3)</li>
          </ol>
        </div>
      </div>

      <style>{`
        .workspace-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 2rem;
          background: linear-gradient(135deg, #1e1e1e 0%, #252526 100%);
        }

        .workspace-loader-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .workspace-loader-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .workspace-loader-title {
          font-size: 2rem;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }

        .workspace-loader-subtitle {
          color: #808080;
          margin-top: 0.5rem;
        }

        .workspace-loader-content {
          width: 100%;
          max-width: 500px;
        }

        .workspace-loader-section {
          background: #2d2d2d;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }

        .section-title {
          font-size: 0.875rem;
          color: #cccccc;
          margin: 0 0 1rem 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .section-hint {
          font-size: 0.75rem;
          color: #808080;
          margin-top: 0.75rem;
          text-align: center;
        }

        .section-toggle {
          background: none;
          border: none;
          color: #cccccc;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0;
          font-size: 0.875rem;
          width: 100%;
        }

        .toggle-arrow {
          transition: transform 0.2s;
        }

        .toggle-arrow.open {
          transform: rotate(90deg);
        }

        .advanced-config {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #3c3c3c;
        }

        .config-field {
          margin-bottom: 1rem;
        }

        .config-label {
          display: block;
          font-size: 0.75rem;
          color: #808080;
          margin-bottom: 0.5rem;
        }

        .config-input-group {
          display: flex;
          gap: 0.5rem;
        }

        .config-input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          background: #1e1e1e;
          border: 1px solid #3c3c3c;
          border-radius: 4px;
          color: #cccccc;
          font-size: 0.875rem;
        }

        .config-input:focus {
          outline: none;
          border-color: #0078d4;
        }

        .btn {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: #0078d4;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #106ebe;
        }

        .btn-primary:disabled {
          background: #3c3c3c;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #3c3c3c;
          color: #cccccc;
        }

        .btn-secondary:hover {
          background: #4c4c4c;
        }

        .btn-lg {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
        }

        .btn-icon {
          font-size: 1.25rem;
        }

        .w-full {
          width: 100%;
        }

        .mt-4 {
          margin-top: 1rem;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .workspace-loader-error {
          background: #5a1d1d;
          border: 1px solid #d32f2f;
          border-radius: 4px;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .error-icon {
          font-size: 1.25rem;
        }

        .error-text {
          color: #ff8a80;
          font-size: 0.875rem;
        }

        .workspace-loader-info {
          color: #808080;
          font-size: 0.75rem;
          margin-top: 1rem;
        }

        .workspace-loader-info h4 {
          color: #cccccc;
          margin: 0 0 0.5rem 0;
        }

        .workspace-loader-info ol {
          margin: 0;
          padding-left: 1.25rem;
        }

        .workspace-loader-info li {
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
};

export default WorkspaceLoader;
