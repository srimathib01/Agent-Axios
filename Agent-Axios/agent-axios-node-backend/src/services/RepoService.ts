/**
 * Repository Service
 * Handles git clone operations and repository management
 */

import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import settings from '../config/settings';
import logger from '../utils/logger';

export class RepoService {
  private git: SimpleGit;

  constructor() {
    this.git = simpleGit();
  }

  /**
   * Clone a repository to local storage
   */
  async clone(repoUrl: string): Promise<string> {
    try {
      logger.info(`Cloning repository: ${repoUrl}`);

      // Generate unique directory name based on repo URL
      const repoHash = crypto.createHash('md5').update(repoUrl).digest('hex');
      const repoName = this.extractRepoName(repoUrl);
      const cloneDir = path.join(settings.paths.cacheDir, 'repositories', `${repoName}_${repoHash}`);

      // Check if already cloned
      if (fs.existsSync(cloneDir) && fs.existsSync(path.join(cloneDir, '.git'))) {
        logger.info(`Repository already exists at: ${cloneDir}`);
        
        // Pull latest changes
        try {
          await simpleGit(cloneDir).pull();
          logger.info('Pulled latest changes');
        } catch (pullError) {
          logger.warn('Could not pull updates, using existing clone');
        }
        
        return cloneDir;
      }

      // Create directory if it doesn't exist
      fs.mkdirSync(cloneDir, { recursive: true });

      // Clone the repository
      await this.git.clone(repoUrl, cloneDir, ['--depth', '1']);

      logger.info(`✓ Repository cloned to: ${cloneDir}`);
      return cloneDir;
    } catch (error: any) {
      logger.error(`Failed to clone repository: ${error.message}`);
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Extract repository name from URL
   */
  private extractRepoName(repoUrl: string): string {
    const match = repoUrl.match(/\/([^\/]+?)(\.git)?$/);
    return match ? match[1] : 'repository';
  }

  /**
   * Get repository information
   */
  async getRepoInfo(repoPath: string): Promise<{ commitHash: string; branch: string }> {
    try {
      const git = simpleGit(repoPath);
      const log = await git.log(['-1']);
      const branch = await git.revparse(['--abbrev-ref', 'HEAD']);

      return {
        commitHash: log.latest?.hash || '',
        branch,
      };
    } catch (error: any) {
      logger.error(`Failed to get repo info: ${error.message}`);
      return { commitHash: '', branch: 'main' };
    }
  }

  /**
   * Cleanup cloned repository
   */
  async cleanup(repoPath: string): Promise<void> {
    try {
      if (fs.existsSync(repoPath)) {
        fs.rmSync(repoPath, { recursive: true, force: true });
        logger.info(`✓ Cleaned up repository at: ${repoPath}`);
      }
    } catch (error: any) {
      logger.error(`Failed to cleanup repository: ${error.message}`);
    }
  }
}
