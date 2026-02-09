/**
 * Repository Service
 *
 * Handles loading and managing repository files for the SecureFix IDE.
 * Works with any repository path provided dynamically.
 */

import { invoke } from '@tauri-apps/api/core';

// FileInfo type matching Rust struct from read_file command
interface FileInfo {
  path: string;
  name: string;
  content: string;
  language: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  language?: string;
  children?: FileNode[];
  size?: number;
}

export interface RepositoryInfo {
  path: string;
  name: string;
  fileCount: number;
  directoryCount: number;
  languages: { [key: string]: number };
}

export interface FileContent {
  path: string;
  name: string;
  content: string;
  language: string;
  size: number;
}

// Language detection based on file extension
const EXTENSION_TO_LANGUAGE: { [key: string]: string } = {
  // Web
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.json': 'json',
  '.vue': 'vue',
  '.svelte': 'svelte',

  // Backend
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.cs': 'csharp',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',

  // Config & Data
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.toml': 'toml',
  '.ini': 'ini',
  '.env': 'plaintext',
  '.conf': 'plaintext',

  // Shell
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.ps1': 'powershell',
  '.bat': 'batch',
  '.cmd': 'batch',

  // Documentation
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.txt': 'plaintext',
  '.rst': 'restructuredtext',

  // Docker & Build
  'Dockerfile': 'dockerfile',
  '.dockerignore': 'plaintext',
  'Makefile': 'makefile',
  '.gitignore': 'plaintext',

  // SQL
  '.sql': 'sql',
};

/**
 * Detect language from file path
 */
export function detectLanguage(filePath: string): string {
  const name = filePath.split(/[/\\]/).pop() || '';

  // Check exact name matches first
  if (EXTENSION_TO_LANGUAGE[name]) {
    return EXTENSION_TO_LANGUAGE[name];
  }

  // Then check extension
  const ext = '.' + name.split('.').pop()?.toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] || 'plaintext';
}

/**
 * Load the file tree for a repository
 */
export async function loadRepositoryTree(repoPath: string): Promise<FileNode[]> {
  try {
    const tree = await invoke<FileNode[]>('get_file_tree', { dirPath: repoPath });
    return enrichFileTree(tree);
  } catch (error) {
    console.error('Failed to load repository tree:', error);
    return [];
  }
}

/**
 * Enrich file tree with language information
 */
function enrichFileTree(nodes: FileNode[]): FileNode[] {
  return nodes.map(node => {
    if (node.type === 'file') {
      return {
        ...node,
        language: detectLanguage(node.path),
      };
    } else if (node.children) {
      return {
        ...node,
        children: enrichFileTree(node.children),
      };
    }
    return node;
  });
}

/**
 * Read file content
 */
export async function readFileContent(filePath: string): Promise<FileContent> {
  try {
    // read_file returns FileInfo object with path, name, content, language
    const fileInfo = await invoke<FileInfo>('read_file', { path: filePath });

    return {
      path: fileInfo.path,
      name: fileInfo.name,
      content: fileInfo.content,
      language: fileInfo.language || detectLanguage(filePath),
      size: fileInfo.content.length,
    };
  } catch (error) {
    console.error('Failed to read file:', error);
    throw error;
  }
}

/**
 * Write file content
 */
export async function writeFileContent(filePath: string, content: string): Promise<void> {
  try {
    await invoke<void>('write_file', { path: filePath, content });
  } catch (error) {
    console.error('Failed to write file:', error);
    throw error;
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    return await invoke<boolean>('file_exists', { path: filePath });
  } catch (error) {
    console.error('Failed to check file existence:', error);
    return false;
  }
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    await invoke<void>('delete_file', { path: filePath });
    return true;
  } catch (error) {
    console.error('Failed to delete file:', error);
    return false;
  }
}

/**
 * Create a new file
 */
export async function createFile(filePath: string, content: string = ''): Promise<boolean> {
  try {
    await invoke<void>('write_file', { path: filePath, content });
    return true;
  } catch (error) {
    console.error('Failed to create file:', error);
    return false;
  }
}

/**
 * Rename/move a file
 */
export async function renameFile(oldPath: string, newPath: string): Promise<boolean> {
  try {
    // Read content, write to new location, delete old
    const fileInfo = await invoke<FileInfo>('read_file', { path: oldPath });
    await invoke<void>('write_file', { path: newPath, content: fileInfo.content });
    await invoke<void>('delete_file', { path: oldPath });
    return true;
  } catch (error) {
    console.error('Failed to rename file:', error);
    return false;
  }
}

/**
 * Get repository info (stats)
 */
export async function getRepositoryInfo(repoPath: string): Promise<RepositoryInfo> {
  const tree = await loadRepositoryTree(repoPath);

  let fileCount = 0;
  let directoryCount = 0;
  const languages: { [key: string]: number } = {};

  function countNodes(nodes: FileNode[]) {
    for (const node of nodes) {
      if (node.type === 'file') {
        fileCount++;
        const lang = node.language || 'unknown';
        languages[lang] = (languages[lang] || 0) + 1;
      } else {
        directoryCount++;
        if (node.children) {
          countNodes(node.children);
        }
      }
    }
  }

  countNodes(tree);

  return {
    path: repoPath,
    name: repoPath.split(/[/\\]/).pop() || '',
    fileCount,
    directoryCount,
    languages,
  };
}

/**
 * Find file in repository by relative path
 */
export function resolveFilePath(repoPath: string, relativePath: string): string {
  // Normalize path separators
  const normalizedRelative = relativePath.replace(/\\/g, '/');
  const normalizedRepo = repoPath.replace(/\\/g, '/');

  // Remove leading slashes from relative path
  const cleanRelative = normalizedRelative.replace(/^[/\\]+/, '');

  // Combine paths
  return `${normalizedRepo}/${cleanRelative}`;
}

/**
 * Get a flat list of all files in repository
 */
export function flattenFileTree(nodes: FileNode[]): FileNode[] {
  const files: FileNode[] = [];

  function traverse(nodeList: FileNode[]) {
    for (const node of nodeList) {
      if (node.type === 'file') {
        files.push(node);
      } else if (node.children) {
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return files;
}

/**
 * Filter files by extension or pattern
 */
export function filterFiles(nodes: FileNode[], extensions: string[]): FileNode[] {
  const files = flattenFileTree(nodes);
  return files.filter(file => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return extensions.includes(ext);
  });
}

/**
 * Sort file tree (directories first, then alphabetically)
 */
export function sortFileTree(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    // Directories first
    if (a.type === 'directory' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'directory') return 1;
    // Then alphabetically
    return a.name.localeCompare(b.name);
  }).map(node => {
    if (node.children) {
      return { ...node, children: sortFileTree(node.children) };
    }
    return node;
  });
}

export default {
  detectLanguage,
  loadRepositoryTree,
  readFileContent,
  writeFileContent,
  fileExists,
  deleteFile,
  createFile,
  renameFile,
  getRepositoryInfo,
  resolveFilePath,
  flattenFileTree,
  filterFiles,
  sortFileTree,
};
