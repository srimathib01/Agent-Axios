/**
 * CVE Search Tool
 * Search the external CVE database
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { ConversationSession } from '../agent/ConversationSession';
import logger from '../utils/logger';

// This will be implemented with the CVERetrievalService
let cveService: any = null;

export function setCVEService(service: any): void {
  cveService = service;
}

export const createSearchCVEDatabaseTool = (conversationSession: ConversationSession) => {
  return tool(
    async (
      {
        query,
        limit = 10,
        minCvss = 0.0,
        expandQuery = false,
      }: { query: string; limit?: number; minCvss?: number; expandQuery?: boolean },
      config?: LangGraphRunnableConfig
    ) => {
      try {
        logger.info('=' .repeat(80));
        logger.info(`🔍 CVE DATABASE SEARCH REQUEST`);
        logger.info(`Query: ${query.substring(0, 100)}`);
        logger.info(`Limit: ${limit}, Min CVSS: ${minCvss}, Expand: ${expandQuery}`);
        logger.info('=' .repeat(80));

        config?.writer?.('🔍 Searching CVE database...');

        if (!cveService) {
          logger.error('✗ CVE Retrieval Service not available!');
          config?.writer?.('❌ CVE service not initialized');
          return JSON.stringify({
            error: 'CVE Retrieval Service not initialized. Check CVE service configuration.',
            success: false,
            results: [],
            cves: [],
          });
        }

        config?.writer?.(`🔎 Querying external CVE API for: "${query.substring(0, 50)}..."`);

        // Search CVE database
        const result = await cveService.searchByText(query, {
          limit,
          minCvss,
          expandQuery,
        });

        if (result.error) {
          logger.error(`✗ CVE search returned error: ${result.error}`);
          config?.writer?.(`❌ Error: ${result.error}`);
          return JSON.stringify({
            error: result.error,
            success: false,
            results: [],
            cves: [],
          });
        }

        const cves = result.results || result.data || [];

        // Accept all retrieved CVEs (no filtering)
        const filteredCves = cves;

        logger.info(`✓ FINAL RESULT: ${filteredCves.length} CVEs retrieved`);

        if (filteredCves.length > 0) {
          const sample = filteredCves[0];
          logger.info(`Sample CVE: ${sample.cve_id || 'N/A'}`);
          logger.info(`CVSS: ${sample.cvss_score || 'N/A'}`);
        } else {
          logger.warn(`⚠️  NO CVEs FOUND for query: '${query}'`);
        }

        config?.writer?.(`✅ Found ${filteredCves.length} CVEs`);
        logger.info('=' .repeat(80));

        return JSON.stringify({
          success: true,
          results: filteredCves,
          cves: filteredCves,
          total_found: filteredCves.length,
          query,
        });
      } catch (error: any) {
        logger.error(`✗ CRITICAL ERROR in CVE search: ${error.message}`);
        config?.writer?.(`❌ Error: ${error.message}`);
        logger.info('=' .repeat(80));
        return JSON.stringify({
          error: error.message,
          success: false,
          results: [],
          cves: [],
        });
      }
    },
    {
      name: 'search_cve_database',
      description: `Search the CVE vulnerability database using the external FAISS CVE Storage API.

WHEN TO USE:
- After identifying potentially vulnerable code patterns
- To find known CVEs matching specific technologies or patterns
- To get detailed vulnerability information

INPUT:
{
  "query": "SQL injection in Node.js Express",
  "limit": 10,           // optional, max CVEs to return
  "minCvss": 0.0,        // optional, minimum CVSS score
  "expandQuery": false   // optional, expand query with related terms
}

RETURNS:
JSON object with:
- results/cves: Array of matching CVEs with details
- total_found: Number of CVEs found
- Each CVE includes: cve_id, cvss_score, summary, description

This tool queries an external CVE database with semantic search capabilities.
Use it to find relevant vulnerabilities for the codebase you're analyzing.`,
      schema: z.object({
        query: z.string().describe('Text description of vulnerability to search for'),
        limit: z.number().nullable().optional().describe('Maximum number of CVEs to return (default: 10)'),
        minCvss: z.number().nullable().optional().describe('Minimum CVSS score to filter by (default: 0.0)'),
        expandQuery: z.boolean().nullable().optional().describe('Whether to expand query with related terms (default: false)'),
      }),
    }
  );
};
