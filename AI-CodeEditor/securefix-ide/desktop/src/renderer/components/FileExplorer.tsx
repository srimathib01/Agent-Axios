/**
 * FileExplorer Component
 *
 * Displays the repository file tree with vulnerability indicators.
 * Allows navigation and file opening.
 */

import React, { useState, useMemo } from 'react';
import { FileNode } from '../services/repositoryService';
import { Vulnerability } from '../../../../gui/src/store/vulnerabilitySlice';
import { SEVERITY_COLORS } from '../services/vulnerabilityLoader';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode2,
  FileText,
  FileJson,
  FileImage,
  Search,
  X,
  RefreshCw,
  MoreVertical,
  Trash2,
  Copy,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

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

// File type icon helpers
const getFileIcon = (node: FileNode, isExpanded: boolean) => {
  if (node.type === 'directory') {
    return isExpanded ? <FolderOpen className="w-4 h-4 text-blue-400" /> : <Folder className="w-4 h-4 text-blue-400" />;
  }

  const ext = node.name.split('.').pop()?.toLowerCase();

  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'go', 'rs', 'php', 'rb', 'html', 'css'].includes(ext || '')) {
    return <FileCode2 className="w-4 h-4 text-gray-400" />;
  }
  if (['json', 'yaml', 'yml'].includes(ext || '')) {
    return <FileJson className="w-4 h-4 text-yellow-500" />;
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) {
    return <FileImage className="w-4 h-4 text-purple-400" />;
  }
  return <FileText className="w-4 h-4 text-gray-500" />;
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

  // Removed legacy getFileIcon string implementation

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
          className={`group flex items-center px-2 py-1 cursor-pointer text-[13px] transition-colors ${isActive ? 'bg-[#094771] text-white' : 'text-gray-300 hover:bg-[#1A1D27]'
            } ${severity ? `bg-red-500/10` : ''}`}
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
          <div className="w-4 flex items-center justify-center shrink-0">
            {node.type === 'directory' && (
              isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            )}
          </div>

          {/* File/Folder icon */}
          <span className="flex items-center justify-center mx-1.5 shrink-0">
            {getFileIcon(node, isExpanded)}
          </span>

          {/* File name */}
          <span className="file-name flex-1 truncate">{node.name}</span>

          {/* Vulnerability indicator */}
          {severity && (
            <span
              className="ml-2 flex items-center"
              style={{ color: SEVERITY_COLORS[severity] }}
              title={`${severity.charAt(0).toUpperCase() + severity.slice(1)} vulnerability`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
            </span>
          )}

          {/* Directory vulnerability indicator */}
          {hasVulnChildren && !severity && (
            <span className="ml-2 flex items-center text-yellow-500" title="Contains vulnerabilities">
              <ShieldAlert className="w-3.5 h-3.5 opacity-70" />
            </span>
          )}
        </div>

        {/* Children */}
        {node.type === 'directory' && isExpanded && node.children && (
          <div className="flex flex-col">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredTree = filterNodes(fileTree);

  return (
    <div className="file-explorer flex flex-col h-full bg-[#12141C]">
      {/* Search */}
      <div className="p-2 border-b border-[#222533] relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-7 py-1.5 bg-[#1A1D27] border border-[#2A2E3D] rounded-md text-xs text-gray-200 outline-none focus:border-blue-500 transition-colors"
          />
          {searchTerm && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              onClick={() => setSearchTerm('')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {onRefresh && (
          <button
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-[#1A1D27] transition-colors"
            onClick={onRefresh}
            title="Refresh (F5)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-auto py-2">
        {filteredTree.length > 0 ? (
          filteredTree.map(node => renderNode(node))
        ) : (
          <div className="px-4 py-8 text-center text-xs text-gray-500">
            {searchTerm ? 'No matching files' : 'No files in workspace'}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.node && (
        <div
          className="fixed bg-[#1A1D27] border border-[#2A2E3D] rounded-lg shadow-xl z-50 min-w-[160px] py-1 select-none overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.node.type === 'file' && (
            <div className="px-3 py-1.5 text-xs text-gray-300 hover:bg-blue-500 hover:text-white cursor-pointer flex items-center gap-2" onClick={() => handleContextMenuAction('open')}>
              <ExternalLink className="w-3.5 h-3.5" /> Open File
            </div>
          )}
          <div className="px-3 py-1.5 text-xs text-gray-300 hover:bg-blue-500 hover:text-white cursor-pointer flex items-center gap-2" onClick={() => handleContextMenuAction('copyPath')}>
            <Copy className="w-3.5 h-3.5" /> Copy Path
          </div>
          {onDeleteFile && (
            <>
              <div className="h-px bg-[#2A2E3D] my-1" />
              <div className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500 hover:text-white cursor-pointer flex items-center gap-2" onClick={() => handleContextMenuAction('delete')}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </div>
            </>
          )}
          <div className="h-px bg-[#2A2E3D] my-1" />
          <div className="px-3 py-1.5 text-xs text-gray-300 hover:bg-blue-500 hover:text-white cursor-pointer flex items-center gap-2" onClick={() => handleContextMenuAction('refresh')}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </div>
        </div>
      )}

      <style>{`
        /* Minimal custom styles for FileExplorer overrides */
      `}</style>
    </div>
  );
};

export default FileExplorer;
