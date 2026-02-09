/**
 * Finding Record Tool
 * Record confirmed vulnerability findings in the database
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { ConversationSession } from '../agent/ConversationSession';
import prisma from '../config/database';
import logger from '../utils/logger';
import { getAnalysisContext } from './context';

// Re-export from context for backwards compatibility
export { setAnalysisContext, getAnalysisContext } from './context';

export const createRecordFindingTool = (conversationSession: ConversationSession) => {
  return tool(
    async (
      {
        cveId,
        filePath,
        severity,
        confidenceScore,
        description,
        validationExplanation = '',
      }: {
        cveId: string;
        filePath: string;
        severity: string;
        confidenceScore: number;
        description: string;
        validationExplanation?: string;
      },
      config?: LangGraphRunnableConfig
    ) => {
      try {
        const analysisId = getAnalysisContext();

        if (!analysisId) {
          logger.error('No analysis context active');
          return 'Error: No analysis context active. Make sure to clone a repository first using clone_repository tool.';
        }

        logger.info(`Recording finding: ${cveId} in ${filePath}`);
        config?.writer?.(`💾 Recording finding: ${cveId}...`);

        // Create finding in database
        const finding = await prisma.cVEFinding.create({
          data: {
            analysisId,
            cveId,
            filePath,
            severity,
            confidenceScore,
            cveDescription: description,
            validationExplanation,
            validationStatus: 'confirmed',
          },
        });

        // Update analysis total findings count
        await prisma.analysis.update({
          where: { id: analysisId },
          data: {
            totalFindings: {
              increment: 1,
            },
          },
        });

        logger.info(`✓ Recorded finding ${cveId} (ID: ${finding.id})`);
        config?.writer?.(`✅ Finding recorded successfully`);

        return `Successfully recorded finding ${cveId} in ${filePath} (Finding ID: ${finding.id})`;
      } catch (error: any) {
        logger.error(`✗ Error recording finding: ${error.message}`);
        config?.writer?.(`❌ Error: ${error.message}`);
        return `Error recording finding: ${error.message}`;
      }
    },
    {
      name: 'record_finding',
      description: `Record a confirmed vulnerability finding in the database.

WHEN TO USE:
- After successfully validating a CVE match with validate_vulnerability_match
- When you have confirmed a vulnerability exists in the code
- Only call this for validated, confirmed vulnerabilities

PREREQUISITE:
- You MUST call clone_repository first to set up the analysis context

INPUT:
{
  "cveId": "CVE-2023-12345",
  "filePath": "path/to/vulnerable/file.js",
  "severity": "high",  // critical, high, medium, low
  "confidenceScore": 0.95,  // 0.0 - 1.0
  "description": "Description of the vulnerability",
  "validationExplanation": "Why this code is vulnerable"
}

RETURNS:
String confirmation message with the finding ID.

This tool persists the finding to the database for report generation.
Each finding is associated with the current analysis session.`,
      schema: z.object({
        cveId: z.string().describe('CVE identifier'),
        filePath: z.string().describe('Path to the vulnerable file'),
        severity: z.enum(['critical', 'high', 'medium', 'low']).describe('Severity level of the vulnerability'),
        confidenceScore: z.number().min(0).max(1).describe('Confidence score 0.0-1.0'),
        description: z.string().describe('Description of the vulnerability'),
        validationExplanation: z.string().nullable().optional().describe('Explanation of why the code is vulnerable'),
      }),
    }
  );
};
