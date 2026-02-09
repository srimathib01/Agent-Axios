/**
 * Repository Analysis Tool
 * Analyzes repository structure to identify key components, technologies, and entry points
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { ConversationSession } from '../agent/ConversationSession';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';

// Global context for repository path
let currentRepoPath: string | null = null;

export function setRepoPath(repoPath: string): void {
  currentRepoPath = repoPath;
  logger.info(`Set repository path context to: ${repoPath}`);
}

export function getRepoPath(): string | null {
  return currentRepoPath;
}

function resolveRepoPath(relativePath: string): string {
  if (currentRepoPath && !path.isAbsolute(relativePath)) {
    return path.join(currentRepoPath, relativePath);
  }
  return relativePath;
}

export const createAnalyzeRepositoryStructureTool = (conversationSession: ConversationSession) => {
  return tool(
    async ({ repoPath }: { repoPath: string }, config?: LangGraphRunnableConfig) => {
      try {
        const originalPath = repoPath;
        repoPath = resolveRepoPath(repoPath);

        logger.info(`Analyzing repository structure at: ${repoPath}`);
        config?.writer?.('🔍 Starting repository structure analysis...');

        if (!fs.existsSync(repoPath)) {
          return JSON.stringify({
            error: `Repository path does not exist: ${originalPath}`,
            success: false,
          });
        }

        config?.writer?.('📂 Scanning directory tree...');

        const files: string[] = [];
        const languages: Record<string, number> = {};
        const frameworks: string[] = [];
        const importantDirs: Record<string, string[]> = {};

        function scanDirectory(dir: string, depth: number = 0) {
          if (depth > 4) return; // Limit depth

          const items = fs.readdirSync(dir);

          for (const item of items) {
            // Skip hidden and common ignore directories
            if (
              item.startsWith('.') ||
              ['node_modules', 'venv', '__pycache__', 'dist', 'build'].includes(item)
            ) {
              continue;
            }

            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
              scanDirectory(fullPath, depth + 1);
            } else if (stat.isFile()) {
              files.push(fullPath);
              const ext = path.extname(item);
              if (ext) {
                languages[ext] = (languages[ext] || 0) + 1;
              }

              // Detect frameworks by config files
              const frameworkMap: Record<string, string> = {
                'package.json': 'Node.js/JavaScript',
                'requirements.txt': 'Python',
                'Gemfile': 'Ruby',
                'pom.xml': 'Java/Maven',
                'build.gradle': 'Java/Gradle',
                'Cargo.toml': 'Rust',
                'go.mod': 'Go',
                'composer.json': 'PHP',
              };

              if (frameworkMap[item] && !frameworks.includes(frameworkMap[item])) {
                frameworks.push(frameworkMap[item]);
              }
            }
          }
        }

        scanDirectory(repoPath);

        config?.writer?.(`✅ Analyzed ${files.length} files`);

        const result = {
          total_files: files.length,
          languages,
          frameworks_detected: frameworks,
          important_directories: importantDirs,
        };

        logger.info(`✓ Repository analysis complete: ${files.length} files`);

        return JSON.stringify({
          success: true,
          analysis: result,
        });
      } catch (error: any) {
        logger.error(`✗ Error analyzing repository: ${error.message}`);
        config?.writer?.(`❌ Error: ${error.message}`);
        return JSON.stringify({
          error: error.message,
          success: false,
        });
      }
    },
    {
      name: 'analyze_repository_structure',
      description: `Analyze the structure of a repository to identify key components, technologies, and entry points.

WHEN TO USE:
- At the start of vulnerability analysis to understand the codebase
- To identify programming languages and frameworks used
- To determine the scope and complexity of the project

INPUT:
{
  "repoPath": "path/to/repository"
}

RETURNS:
JSON object with:
- total_files: Number of files analyzed
- languages: File extensions and counts
- frameworks_detected: Array of detected frameworks
- important_directories: Key directories in the project

This tool helps you understand the repository structure before searching for vulnerabilities.`,
      schema: z.object({
        repoPath: z.string().describe('Path to the cloned repository'),
      }),
    }
  );
};
