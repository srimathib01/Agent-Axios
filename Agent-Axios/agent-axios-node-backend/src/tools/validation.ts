/**
 * Vulnerability Validation Tool
 * Use GPT-4 to validate whether code is vulnerable to a specific CVE
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { ConversationSession } from '../agent/ConversationSession';
import logger from '../utils/logger';

// This will be implemented with the ValidationService
let validationService: any = null;

export function setValidationService(service: any): void {
  validationService = service;
}

export const createValidateVulnerabilityMatchTool = (conversationSession: ConversationSession) => {
  return tool(
    async (
      {
        cveId,
        cveDescription,
        codeSnippet,
        filePath,
      }: { cveId: string; cveDescription: string; codeSnippet: string; filePath: string },
      config?: LangGraphRunnableConfig
    ) => {
      try {
        logger.info(`Validating ${cveId} against ${filePath}`);
        config?.writer?.(`🔬 Validating ${cveId} with GPT-4...`);

        if (!validationService) {
          logger.warn('Validation service not initialized');
          return JSON.stringify({
            error: 'Validation service not initialized',
            success: false,
            is_vulnerable: false,
            confidence: 0.0,
          });
        }

        config?.writer?.('🤖 Analyzing code with AI...');

        // Use ValidationService which has GPT-4 integration
        const result = await validationService.validateCVEMatch({
          cveId,
          cveDescription,
          codeSnippet,
          filePath,
        });

        const isVulnerable = result.is_vulnerable || false;
        const confidence = result.confidence || 0.0;

        logger.info(
          `✓ Validation complete: ${isVulnerable ? 'VULNERABLE' : 'NOT VULNERABLE'} (confidence: ${confidence.toFixed(2)})`
        );

        if (isVulnerable) {
          config?.writer?.(`⚠️  VULNERABLE (${(confidence * 100).toFixed(0)}% confidence)`);
        } else {
          config?.writer?.(`✅ Not vulnerable (${(confidence * 100).toFixed(0)}% confidence)`);
        }

        return JSON.stringify({
          success: true,
          ...result,
        });
      } catch (error: any) {
        logger.error(`✗ Error validating vulnerability: ${error.message}`);
        config?.writer?.(`❌ Error: ${error.message}`);
        return JSON.stringify({
          error: error.message,
          success: false,
          is_vulnerable: false,
          confidence: 0.0,
        });
      }
    },
    {
      name: 'validate_vulnerability_match',
      description: `Use GPT-4 to validate whether a code snippet is actually vulnerable to a specific CVE.

WHEN TO USE:
- After finding potential CVE matches from search_cve_database
- To confirm if the vulnerability actually applies to the code
- To reduce false positives

INPUT:
{
  "cveId": "CVE-2023-12345",
  "cveDescription": "Description of the vulnerability",
  "codeSnippet": "Code to analyze",
  "filePath": "path/to/file.js"
}

RETURNS:
JSON object with:
- is_vulnerable: Boolean indicating if code is vulnerable
- confidence: Float 0-1 indicating confidence level
- reasoning: Explanation of the validation decision

This tool uses GPT-4 to perform deep analysis and validation.
Only call this for serious potential matches to avoid unnecessary API calls.`,
      schema: z.object({
        cveId: z.string().describe('CVE identifier'),
        cveDescription: z.string().describe('Description of the vulnerability'),
        codeSnippet: z.string().describe('Code snippet to analyze for vulnerability'),
        filePath: z.string().describe('Path to the file containing the code'),
      }),
    }
  );
};
