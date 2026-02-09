/**
 * File Operations Tools
 * Read file content and list directory contents
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { ConversationSession } from '../agent/ConversationSession';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';
import { getRepoPath } from './repositoryAnalysis';

function resolveRepoPath(relativePath: string): string {
  const repoPath = getRepoPath();
  if (repoPath && !path.isAbsolute(relativePath)) {
    return path.join(repoPath, relativePath);
  }
  return relativePath;
}

export const createReadFileContentTool = (conversationSession: ConversationSession) => {
  return tool(
    async ({ filePath, maxLines = 500 }: { filePath: string; maxLines?: number }, config?: LangGraphRunnableConfig) => {
      try {
        const originalPath = filePath;
        filePath = resolveRepoPath(filePath);

        logger.info(`Reading file: ${filePath}`);
        config?.writer?.(`📖 Reading file: ${path.basename(filePath)}...`);

        if (!fs.existsSync(filePath)) {
          return JSON.stringify({
            error: `File does not exist: ${originalPath}`,
            success: false,
          });
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const truncated = lines.length > maxLines;
        const readLines = lines.slice(0, maxLines);
        const resultContent = readLines.join('\n');

        logger.info(`✓ Read ${readLines.length} lines from ${path.basename(filePath)}`);
        config?.writer?.(`✅ Read ${readLines.length} lines${truncated ? ' (truncated)' : ''}`);

        return JSON.stringify({
          success: true,
          file_path: originalPath,
          content: resultContent,
          lines_read: readLines.length,
          truncated,
        });
      } catch (error: any) {
        logger.error(`✗ Error reading file ${filePath}: ${error.message}`);
        config?.writer?.(`❌ Error: ${error.message}`);
        return JSON.stringify({
          error: error.message,
          success: false,
        });
      }
    },
    {
      name: 'read_file_content',
      description: `Read the content of a specific file in the repository.

WHEN TO USE:
- To examine source code files for vulnerabilities
- To read configuration files
- To analyze specific code sections

INPUT:
{
  "filePath": "path/to/file.js",
  "maxLines": 500  // optional, default 500
}

RETURNS:
JSON object with:
- content: The file content
- lines_read: Number of lines read
- truncated: Whether content was truncated

Use this to examine files identified as potentially vulnerable.`,
      schema: z.object({
        filePath: z.string().describe('Path to the file to read'),
        maxLines: z.number().nullable().optional().describe('Maximum number of lines to read (default: 500)'),
      }),
    }
  );
};

export const createListDirectoryContentsTool = (conversationSession: ConversationSession) => {
  return tool(
    async (
      { directoryPath, recursive = false, maxDepth = 2 }: { directoryPath: string; recursive?: boolean; maxDepth?: number },
      config?: LangGraphRunnableConfig
    ) => {
      try {
        const originalPath = directoryPath;
        directoryPath = resolveRepoPath(directoryPath);

        logger.info(`Listing directory: ${directoryPath} (recursive=${recursive})`);
        config?.writer?.(`📁 Listing directory: ${path.basename(directoryPath)}...`);

        if (!fs.existsSync(directoryPath)) {
          return JSON.stringify({
            error: `Directory does not exist: ${originalPath}`,
            success: false,
          });
        }

        if (!fs.statSync(directoryPath).isDirectory()) {
          return JSON.stringify({
            error: `Path is not a directory: ${originalPath}`,
            success: false,
          });
        }

        const items: { files: string[]; directories: string[] } = {
          files: [],
          directories: [],
        };

        function listDir(dir: string, depth: number = 0) {
          if (recursive && depth > maxDepth) return;

          const entries = fs.readdirSync(dir);

          for (const entry of entries) {
            if (entry.startsWith('.')) continue; // Skip hidden files

            const fullPath = path.join(dir, entry);
            const relativePath = path.relative(directoryPath, fullPath);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
              items.directories.push(relativePath);
              if (recursive) {
                listDir(fullPath, depth + 1);
              }
            } else {
              items.files.push(relativePath);
            }
          }
        }

        listDir(directoryPath);

        logger.info(`✓ Listed ${items.files.length} files, ${items.directories.length} directories`);
        config?.writer?.(`✅ Found ${items.files.length} files, ${items.directories.length} directories`);

        return JSON.stringify({
          success: true,
          directory_path: originalPath,
          ...items,
        });
      } catch (error: any) {
        logger.error(`✗ Error listing directory ${directoryPath}: ${error.message}`);
        config?.writer?.(`❌ Error: ${error.message}`);
        return JSON.stringify({
          error: error.message,
          success: false,
        });
      }
    },
    {
      name: 'list_directory_contents',
      description: `List files and directories in a given path.

WHEN TO USE:
- To explore the repository structure
- To find specific files or directories
- To navigate the codebase

INPUT:
{
  "directoryPath": "path/to/directory",
  "recursive": false,  // optional, default false
  "maxDepth": 2        // optional, max recursion depth
}

RETURNS:
JSON object with:
- files: Array of file paths
- directories: Array of directory paths

Use this to navigate and explore the repository structure.`,
      schema: z.object({
        directoryPath: z.string().describe('Path to the directory'),
        recursive: z.boolean().nullable().optional().describe('Whether to list recursively (default: false)'),
        maxDepth: z.number().nullable().optional().describe('Maximum recursion depth if recursive=true (default: 2)'),
      }),
    }
  );
};
