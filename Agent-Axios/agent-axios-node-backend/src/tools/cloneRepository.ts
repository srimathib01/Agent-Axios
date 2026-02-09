/**
 * Repository cloning tool using simple-git
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import logger from '../utils/logger';
import settings from '../config/settings';
import { setRepoContext, setAnalysisContext } from './context';
import prisma from '../config/database';

export const createCloneRepositoryTool = () => {
  return tool(
    async (
      { repoUrl }: { repoUrl: string },
      config?: LangGraphRunnableConfig
    ) => {
      try {
        logger.info(`Cloning repository: ${repoUrl}`);
        config?.writer?.(`📦 Cloning repository from ${repoUrl}...`);

        // Extract repo name from URL
        const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
        const timestamp = Date.now();
        const clonePath = path.join(settings.paths.dataDir, 'repositories', `${repoName}_${timestamp}`);

        // Ensure parent directory exists
        await fs.mkdir(path.dirname(clonePath), { recursive: true });

        config?.writer?.(`📁 Clone destination: ${clonePath}`);

        // Clone the repository
        const git = simpleGit();
        await git.clone(repoUrl, clonePath, ['--depth', '1']); // Shallow clone for speed

        logger.info(`✓ Repository cloned successfully to: ${clonePath}`);
        config?.writer?.(`✅ Repository cloned successfully!`);

        // Set repo context for other tools
        setRepoContext(clonePath, repoUrl);

        // Create Analysis record in database
        const analysis = await prisma.analysis.create({
          data: {
            repoUrl,
            analysisType: 'MEDIUM', // Default analysis type
            status: 'running',
            startTime: new Date(),
          },
        });

        // Set analysis context for finding recording and report generation
        setAnalysisContext(analysis.id);
        logger.info(`✓ Created analysis record with ID: ${analysis.id}`);
        config?.writer?.(`📊 Analysis ID: ${analysis.id}`);

        // Get basic repo info
        const files = await fs.readdir(clonePath);

        return JSON.stringify({
          success: true,
          repoPath: clonePath,
          repoUrl,
          repoName,
          analysisId: analysis.id,
          filesCount: files.length,
          message: `Repository cloned to ${clonePath}. Analysis ID: ${analysis.id}`,
        });
      } catch (error: any) {
        logger.error(`✗ Error cloning repository: ${error.message}`);
        config?.writer?.(`❌ Error: ${error.message}`);
        return JSON.stringify({
          success: false,
          error: error.message,
          message: 'Failed to clone repository',
        });
      }
    },
    {
      name: 'clone_repository',
      description: `Clone a Git repository for vulnerability analysis.

WHEN TO USE:
- At the START of any vulnerability analysis workflow
- When the user provides a GitHub/GitLab repository URL
- Before performing any code analysis or CVE searches

CRITICAL:
- ALWAYS call this tool FIRST when analyzing a repository
- This sets up the working directory for all other tools
- All subsequent tools (read_file, list_directory, etc.) will use this cloned repo
- This also creates an analysis record in the database for tracking findings

INPUT:
{
  "repoUrl": "https://github.com/owner/repository.git"
}

RETURNS:
JSON object with:
- success: Boolean indicating if clone succeeded
- repoPath: Local path where repository was cloned
- repoUrl: Original repository URL
- repoName: Extracted repository name
- analysisId: Database ID for tracking this analysis
- filesCount: Number of files in root directory

EXAMPLE:
{
  "repoUrl": "https://github.com/vulnerable-app/example.git"
}

After cloning, all other tools will automatically work within this repository.`,
      schema: z.object({
        repoUrl: z.string().url().describe('Git repository URL to clone (https://github.com/...)'),
      }),
    }
  );
};
