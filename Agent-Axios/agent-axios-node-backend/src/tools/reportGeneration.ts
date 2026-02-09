/**
 * Report Generation Tool
 * Generate PDF vulnerability report
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { ConversationSession } from '../agent/ConversationSession';
import prisma from '../config/database';
import logger from '../utils/logger';
import { getAnalysisContext } from './context';

// This will be implemented with the PDFReportGenerator service
let pdfGenerator: any = null;

export function setPDFGenerator(generator: any): void {
  pdfGenerator = generator;
}

export const createGenerateVulnerabilityReportTool = (conversationSession: ConversationSession) => {
  return tool(
    async ({}: {}, config?: LangGraphRunnableConfig) => {
      try {
        const analysisId = getAnalysisContext();

        if (!analysisId) {
          logger.error('No analysis context active');
          return 'Error: No analysis context active. Make sure to clone a repository first using clone_repository tool.';
        }

        logger.info(`Generating vulnerability report for analysis ${analysisId}`);
        config?.writer?.('📄 Generating PDF report...');

        // Fetch findings from database
        const findings = await prisma.cVEFinding.findMany({
          where: { analysisId },
          include: {
            analysis: true,
          },
        });

        if (findings.length === 0) {
          logger.warn('No findings recorded. Cannot generate report.');
          return 'No findings recorded. Cannot generate report. Record findings first using record_finding tool.';
        }

        config?.writer?.(`📊 Found ${findings.length} vulnerabilities to include...`);

        if (!pdfGenerator) {
          // Fallback: return text summary if PDF generator not available
          logger.warn('PDF generator not initialized, returning text summary');

          const summary = `
Vulnerability Analysis Report
Analysis ID: ${analysisId}
Total Findings: ${findings.length}

Findings:
${findings
  .map(
    (f, i) => `
${i + 1}. ${f.cveId}
   File: ${f.filePath}
   Severity: ${f.severity}
   Confidence: ${(f.confidenceScore * 100).toFixed(0)}%
   Description: ${f.cveDescription}
`
  )
  .join('\n')}
`;

          return summary;
        }

        config?.writer?.('🖨️  Generating PDF document...');

        // Generate PDF report
        const reportPath = await pdfGenerator.generateReport(analysisId, findings);

        logger.info(`✓ Report generated successfully at: ${reportPath}`);
        config?.writer?.(`✅ Report generated successfully`);

        return `Report generated successfully at: ${reportPath}`;
      } catch (error: any) {
        logger.error(`✗ Error generating report: ${error.message}`);
        config?.writer?.(`❌ Error: ${error.message}`);
        return `Error generating report: ${error.message}`;
      }
    },
    {
      name: 'generate_vulnerability_report',
      description: `Generate a PDF report listing all the vulnerabilities recorded for this analysis.

WHEN TO USE:
- At the very end of your vulnerability analysis
- After you have recorded all confirmed findings
- To provide a comprehensive summary to the user

INPUT:
No input required - uses the current analysis context.

RETURNS:
String with the path to the generated PDF report, or a text summary if PDF generation is unavailable.

This tool should be called LAST, after all vulnerability analysis is complete.
It creates a professional PDF report of all findings recorded with record_finding.`,
      schema: z.object({}),
    }
  );
};
