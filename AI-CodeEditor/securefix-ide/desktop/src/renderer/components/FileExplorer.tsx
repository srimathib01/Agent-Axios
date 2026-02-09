/**
 * FileExplorer Component
 *
 * Displays the repository file tree with vulnerability indicators.
 * Allows navigation and file opening.
 */

import React, { useState, useMemo } from 'react';
import { FileNode } from '../services/repositoryService';
import { Vulnerability } from '../../../../gui/src/store/vulnerabilitySlice';
import { SEVERITY_COLORS, SEVERITY_ICONS } from '../services/vulnerabilityLoader';

interface FileExplorerProps {
  fileTree: FileNode[];
  vulnerabilities: Vulnerability[];
  onFileClick: (path: string) => void;
  onDeleteFile?: (path: string) => void;
  onRefresh?: () => void;
  activeFilePath?: string;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  node: FileNode | null;
}

// File type icons
const FILE_ICONS: Record<string, string> = {
  javascript: '📜',
  typescript: '📘',
  python: '🐍',
  java: '☕',
  go: '🔷',
  rust: '🦀',
  ruby: '💎',
  php: '🐘',
  html: '🌐',
  css: '🎨',
  json: '📋',
  yaml: '⚙️',
  markdown: '📝',
  shell: '🖥️',
  dockerfile: '🐳',
  default: '📄',
};

const FileExplorer: React.FC<FileExplorerProps> = ({
  fileTree,
  vulnerabilities,
  onFileClick,
  onDeleteFile,
  onRefresh,
  activeFilePath,
}) => {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
  });

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  // Handle context menu actions
  const handleContextMenuAction = (action: string) => {
    if (!contextMenu.node) return;

    switch (action) {
      case 'open':
        if (contextMenu.node.type === 'file') {
          onFileClick(contextMenu.node.path);
        }
        break;
      case 'delete':
        if (onDeleteFile) {
          onDeleteFile(contextMenu.node.path);
        }
        break;
      case 'copyPath':
        navigator.clipboard.writeText(contextMenu.node.path);
        break;
      case 'refresh':
        if (onRefresh) {
          onRefresh();
        }
        break;
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Create a map of file paths to their vulnerabilities
  const vulnerabilityMap = useMemo(() => {
    const map = new Map<string, Vulnerability[]>();
    for (const vuln of vulnerabilities) {
      const path = vuln.location.fileUri.replace(/\\/g, '/').toLowerCase();
      if (!map.has(path)) {
        map.set(path, []);
      }
      map.get(path)!.push(vuln);
    }
    return map;
  }, [vulnerabilities]);

  // Get highest severity for a file
  const getFileSeverity = (path: string): Vulnerability['severity'] | null => {
    const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
    const vulns = vulnerabilityMap.get(normalizedPath);
    if (!vulns || vulns.length === 0) return null;

    const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
    for (const severity of severityOrder) {
      if (vulns.some(v => v.severity === severity)) {
        return severity as Vulnerability['severity'];
      }
    }
    return null;
  };

  // Check if any child has vulnerabilities
  const hasVulnerableChildren = (node: FileNode): boolean => {
    if (node.type === 'file') {
      return getFileSeverity(node.path) !== null;
    }
    return node.children?.some(child => hasVulnerableChildren(child)) || false;
  };

  // Toggle directory expansion
  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Expand all directories with vulnerabilities on mount
  React.useEffect(() => {
    const dirsToExpand = new Set<string>();

    const collectDirs = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'directory') {
          if (hasVulnerableChildren(node)) {
            dirsToExpand.add(node.path);
          }
          if (node.children) {
            collectDirs(node.children);
          }
        }
      }
    };

    collectDirs(fileTree);
    setExpandedDirs(dirsToExpand);
  }, [fileTree, vulnerabilities]);

  // Get icon for file
  const getFileIcon = (node: FileNode): string => {
    if (node.type === 'directory') {
      return expandedDirs.has(node.path) ? '📂' : '📁';
    }
    return FILE_ICONS[node.language || 'default'] || FILE_ICONS.default;
  };

  // Filter files based on search
  const filterNodes = (nodes: FileNode[]): FileNode[] => {
    if (!searchTerm) return nodes;

    return nodes.filter(node => {
      if (node.type === 'file') {
        return node.name.toLowerCase().includes(searchTerm.toLowerCase());
      }
      const filteredChildren = filterNodes(node.children || []);
      return filteredChildren.length > 0;
    }).map(node => {
      if (node.type === 'directory' && node.children) {
        return { ...node, children: filterNodes(node.children) };
      }
      return node;
    });
  };

  // Render a file node
  const renderNode = (node: FileNode, depth: number = 0) => {
    const severity = node.type === 'file' ? getFileSeverity(node.path) : null;
    const hasVulnChildren = node.type === 'directory' && hasVulnerableChildren(node);
    const isExpanded = expandedDirs.has(node.path);
    const isActive = activeFilePath === node.path;

    return (
      <div key={node.path} className="file-node">
        <div
          className={`file-node-item ${isActive ? 'active' : ''} ${severity ? `severity-${severity}` : ''}`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleDir(node.path);
            } else {
              onFileClick(node.path);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          {/* Expand/Collapse indicator for directories */}
          {node.type === 'directory' && (
            <span className="expand-indicator">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}

          {/* File/Folder icon */}
          <span className="file-icon">{getFileIcon(node)}</span>

          {/* File name */}
          <span className="file-name">{node.name}</span>

          {/* Vulnerability indicator */}
          {severity && (
            <span
              className="vuln-indicator"
              style={{ color: SEVERITY_COLORS[severity] }}
              title={`${severity.charAt(0).toUpperCase() + severity.slice(1)} vulnerability`}
            >
              {SEVERITY_ICONS[severity]}
            </span>
          )}

          {/* Directory vulnerability indicator */}
          {hasVulnChildren && !severity && (
            <span className="vuln-count" title="Contains vulnerabilities">
              ⚠️
            </span>
          )}
        </div>

        {/* Children */}
        {node.type === 'directory' && isExpanded && node.children && (
          <div className="file-children">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredTree = filterNodes(fileTree);

  return (
    <div className="file-explorer">
      {/* Search */}
      <div className="file-explorer-search">
        <input
          type="text"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button
            className="search-clear"
            onClick={() => setSearchTerm('')}
          >
            ✕
          </button>
        )}
        {onRefresh && (
          <button
            className="refresh-btn"
            onClick={onRefresh}
            title="Refresh (F5)"
          >
            🔄
          </button>
        )}
      </div>

      {/* File Tree */}
      <div className="file-explorer-tree">
        {filteredTree.length > 0 ? (
          filteredTree.map(node => renderNode(node))
        ) : (
          <div className="no-files">
            {searchTerm ? 'No matching files' : 'No files in workspace'}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.node && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.node.type === 'file' && (
            <div className="context-menu-item" onClick={() => handleContextMenuAction('open')}>
              📄 Open
            </div>
          )}
          <div className="context-menu-item" onClick={() => handleContextMenuAction('copyPath')}>
            📋 Copy Path
          </div>
          {onDeleteFile && (
            <div className="context-menu-item danger" onClick={() => handleContextMenuAction('delete')}>
              🗑️ Delete
            </div>
          )}
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={() => handleContextMenuAction('refresh')}>
            🔄 Refresh
          </div>
        </div>
      )}

      <style>{`
        .file-explorer {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #252526;
        }

        .file-explorer-search {
          padding: 8px;
          border-bottom: 1px solid #3c3c3c;
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 6px 28px 6px 8px;
          background: #3c3c3c;
          border: 1px solid #3c3c3c;
          border-radius: 4px;
          color: #cccccc;
          font-size: 12px;
        }

        .search-input:focus {
          outline: none;
          border-color: #0078d4;
        }

        .search-clear {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #808080;
          cursor: pointer;
          font-size: 10px;
          padding: 2px 4px;
        }

        .search-clear:hover {
          color: #cccccc;
        }

        .file-explorer-tree {
          flex: 1;
          overflow: auto;
          padding: 4px 0;
        }

        .file-node-item {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 13px;
          color: #cccccc;
          transition: background 0.1s;
        }

        .file-node-item:hover {
          background: #2a2d2e;
        }

        .file-node-item.active {
          background: #094771;
        }

        .file-node-item.severity-critical {
          background: rgba(255, 77, 79, 0.1);
        }

        .file-node-item.severity-high {
          background: rgba(250, 140, 22, 0.1);
        }

        .file-node-item.severity-medium {
          background: rgba(250, 219, 20, 0.05);
        }

        .expand-indicator {
          width: 16px;
          font-size: 8px;
          color: #808080;
          flex-shrink: 0;
        }

        .file-icon {
          margin-right: 6px;
          font-size: 14px;
          flex-shrink: 0;
        }

        .file-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vuln-indicator {
          margin-left: 6px;
          font-size: 12px;
        }

        .vuln-count {
          margin-left: 6px;
          font-size: 10px;
          opacity: 0.7;
        }

        .no-files {
          padding: 16px;
          text-align: center;
          color: #808080;
          font-size: 12px;
        }

        .refresh-btn {
          position: absolute;
          right: 36px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #808080;
          cursor: pointer;
          font-size: 12px;
          padding: 2px 4px;
        }

        .refresh-btn:hover {
          color: #cccccc;
        }

        .context-menu {
          position: fixed;
          background: #252526;
          border: 1px solid #3c3c3c;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          z-index: 1000;
          min-width: 150px;
          padding: 4px 0;
        }

        .context-menu-item {
          padding: 6px 12px;
          font-size: 12px;
          color: #cccccc;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .context-menu-item:hover {
          background: #094771;
        }

        .context-menu-item.danger {
          color: #ff6b6b;
        }

        .context-menu-item.danger:hover {
          background: #5a1d1d;
        }

        .context-menu-divider {
          height: 1px;
          background: #3c3c3c;
          margin: 4px 0;
        }
      `}</style>
    </div>
  );
};

export default FileExplorer;
