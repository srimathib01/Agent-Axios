/**
 * Report Parser Service
 *
 * Parses vulnerability analysis reports from Agent-Axios in various formats.
 * Supports both JSON (from Python backend) and TXT (from Node backend) formats.
 */

export interface ParsedVulnerability {
  id: string;
  cveId: string;
  filePath: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: number;
  description: string;
  lineNumber?: number;
}

export interface ParsedReport {
  analysisId: string;
  generatedAt: string;
  totalFindings: number;
  vulnerabilities: ParsedVulnerability[];
}

/**
 * Parse a text-based analysis report (format from Node backend)
 *
 * Expected format:
 * ```
 * Vulnerability Analysis Report
 * Analysis ID: 5
 * Generated: 2026-01-17T22:33:30.977Z
 * Total Findings: 2
 *
 * Findings:
 *
 * 1. CVE-2024-48050
 *    File: challenges\hard\challenge8\server_sse.py
 *    Severity: critical
 *    Confidence: 100%
 *    Description: Arbitrary code execution via eval()...
 * ```
 */
export function parseTextReport(content: string): ParsedReport {
  const lines = content.split('\n').map(line => line.trim());

  // Parse header
  let analysisId = '';
  let generatedAt = '';
  let totalFindings = 0;

  for (const line of lines) {
    if (line.startsWith('Analysis ID:')) {
      analysisId = line.replace('Analysis ID:', '').trim();
    } else if (line.startsWith('Generated:')) {
      generatedAt = line.replace('Generated:', '').trim();
    } else if (line.startsWith('Total Findings:')) {
      totalFindings = parseInt(line.replace('Total Findings:', '').trim(), 10) || 0;
    }
  }

  // Parse vulnerabilities
  const vulnerabilities: ParsedVulnerability[] = [];
  let currentVuln: Partial<ParsedVulnerability> | null = null;
  let findingNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for new finding (e.g., "1. CVE-2024-48050")
    const findingMatch = line.match(/^(\d+)\.\s+(CVE-\d+-\d+|CWE-\d+)/);
    if (findingMatch) {
      // Save previous vulnerability if exists
      if (currentVuln && currentVuln.cveId) {
        vulnerabilities.push(currentVuln as ParsedVulnerability);
      }

      findingNumber = parseInt(findingMatch[1], 10);
      currentVuln = {
        id: `finding-${findingNumber}`,
        cveId: findingMatch[2],
        filePath: '',
        severity: 'medium',
        confidence: 0,
        description: '',
      };
      continue;
    }

    // Parse vulnerability properties
    if (currentVuln) {
      if (line.startsWith('File:')) {
        currentVuln.filePath = line.replace('File:', '').trim();
      } else if (line.startsWith('Severity:')) {
        const severity = line.replace('Severity:', '').trim().toLowerCase();
        currentVuln.severity = validateSeverity(severity);
      } else if (line.startsWith('Confidence:')) {
        const confidenceStr = line.replace('Confidence:', '').trim().replace('%', '');
        currentVuln.confidence = parseInt(confidenceStr, 10) || 0;
      } else if (line.startsWith('Description:')) {
        currentVuln.description = line.replace('Description:', '').trim();
      } else if (line.startsWith('Line:')) {
        currentVuln.lineNumber = parseInt(line.replace('Line:', '').trim(), 10);
      }
    }
  }

  // Don't forget the last vulnerability
  if (currentVuln && currentVuln.cveId) {
    vulnerabilities.push(currentVuln as ParsedVulnerability);
  }

  return {
    analysisId,
    generatedAt,
    totalFindings,
    vulnerabilities,
  };
}

/**
 * Parse a JSON-based analysis report (format from Python backend)
 */
export function parseJsonReport(content: string): ParsedReport {
  try {
    const json = JSON.parse(content);

    const vulnerabilities: ParsedVulnerability[] = (json.findings || []).map((finding: any, index: number) => ({
      id: `finding-${finding.finding_id || index + 1}`,
      cveId: finding.cve_id || finding.cweId || `VULN-${index + 1}`,
      filePath: finding.file_path || finding.filePath || '',
      severity: validateSeverity(finding.severity),
      confidence: finding.confidence_score || finding.confidence || 0,
      description: finding.cve_description || finding.description || '',
      lineNumber: finding.line_number || finding.lineNumber,
    }));

    return {
      analysisId: String(json.analysis?.analysis_id || json.analysisId || ''),
      generatedAt: json.generated_at || json.generatedAt || new Date().toISOString(),
      totalFindings: json.summary?.total_findings || vulnerabilities.length,
      vulnerabilities,
    };
  } catch (error) {
    console.error('Failed to parse JSON report:', error);
    return {
      analysisId: '',
      generatedAt: '',
      totalFindings: 0,
      vulnerabilities: [],
    };
  }
}

/**
 * Auto-detect report format and parse accordingly
 */
export function parseReport(content: string | unknown): ParsedReport {
  // Handle null/undefined or non-string input
  if (content == null || typeof content !== 'string') {
    console.error('parseReport received invalid content:', typeof content);
    return {
      analysisId: '',
      generatedAt: '',
      totalFindings: 0,
      vulnerabilities: [],
    };
  }

  const trimmedContent = content.trim();

  // Check if content is JSON
  if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
    return parseJsonReport(trimmedContent);
  }

  // Otherwise, treat as text report
  return parseTextReport(trimmedContent);
}

/**
 * Validate and normalize severity value
 */
function validateSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  const normalized = severity?.toLowerCase() || 'medium';
  if (['critical', 'high', 'medium', 'low', 'info'].includes(normalized)) {
    return normalized as 'critical' | 'high' | 'medium' | 'low' | 'info';
  }
  return 'medium';
}

export default {
  parseTextReport,
  parseJsonReport,
  parseReport,
};
