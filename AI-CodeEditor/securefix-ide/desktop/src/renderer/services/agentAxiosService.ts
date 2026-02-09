/**
 * Agent-Axios Integration Service
 *
 * This service connects the SecureFix IDE with the Agent-Axios vulnerability
 * analysis platform, fetching analysis results and repository information.
 */

import { invoke } from '@tauri-apps/api/core';
import { Vulnerability } from '../../../../gui/src/store/vulnerabilitySlice';

// Types matching Agent-Axios backend models
export interface AgentAxiosAnalysis {
  analysis_id: number;
  repo_url: string;
  repo_id: number | null;
  analysis_type: 'SHORT' | 'MEDIUM' | 'HARD';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  start_time: string;
  end_time: string | null;
  config: Record<string, unknown>;
  error_message: string | null;
  total_files: number;
  total_chunks: number;
  total_findings: number;
  created_at: string;
  updated_at: string;
}

export interface AgentAxiosFinding {
  finding_id: number;
  analysis_id: number;
  cve_id: string;
  file_path: string;
  chunk_id: number | null;
  severity: 'critical' | 'high' | 'medium' | 'low' | null;
  confidence_score: number;
  validation_status: 'pending' | 'confirmed' | 'false_positive' | 'needs_review';
  validation_explanation: string | null;
  cve_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentAxiosReport {
  generated_at: string;
  analysis: AgentAxiosAnalysis;
  summary: {
    total_files_analyzed: number;
    total_chunks_analyzed: number;
    total_findings: number;
    confirmed_vulnerabilities: number;
    severity_breakdown: Record<string, number>;
  };
  findings: AgentAxiosFinding[];
}

export interface RepositoryInfo {
  repo_id: number;
  user_id: number;
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  framework: string | null;
  local_path: string | null;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  last_scan: string | null;
  created_at: string;
  updated_at: string;
}

// Path configuration - these will be resolved by Tauri backend
const PATHS = {
  // Relative paths from AI-CodeEditor to Agent-Axios
  pythonReportsDir: '../../../Agent-Axios/agent-axios-backend/data/reports',
  nodeReportsDir: '../../../Agent-Axios/agent-axios-node-backend/data/reports',
  pythonReposDir: '../../../Agent-Axios/agent-axios-backend/data/cache/repositories',
  nodeReposDir: '../../../Agent-Axios/agent-axios-node-backend/data/repositories',
};

/**
 * Fetch analysis report from Agent-Axios
 */
export async function fetchAnalysisReport(analysisId: number): Promise<AgentAxiosReport | null> {
  try {
    // Try Python backend first
    const pythonReportPath = `${PATHS.pythonReportsDir}/analysis_${analysisId}/analysis_${analysisId}.json`;
    const content = await invoke<string>('read_agent_axios_report', { reportPath: pythonReportPath });

    if (content) {
      return JSON.parse(content) as AgentAxiosReport;
    }

    // Fallback to Node backend
    const nodeReportPath = `${PATHS.nodeReportsDir}/analysis_${analysisId}_report.txt`;
    const nodeContent = await invoke<string>('read_agent_axios_report', { reportPath: nodeReportPath });

    if (nodeContent) {
      // Node backend might have different format, parse accordingly
      return JSON.parse(nodeContent) as AgentAxiosReport;
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch analysis report:', error);
    return null;
  }
}

/**
 * List all available analysis reports
 */
export async function listAnalysisReports(): Promise<number[]> {
  try {
    const reports = await invoke<number[]>('list_analysis_reports', {
      reportsDir: PATHS.pythonReportsDir,
    });
    return reports;
  } catch (error) {
    console.error('Failed to list analysis reports:', error);
    return [];
  }
}

/**
 * Get the local path where a repository is cached
 */
export async function getRepositoryLocalPath(repoUrl: string): Promise<string | null> {
  try {
    const localPath = await invoke<string | null>('get_repository_local_path', {
      repoUrl,
      pythonReposDir: PATHS.pythonReposDir,
      nodeReposDir: PATHS.nodeReposDir,
    });
    return localPath;
  } catch (error) {
    console.error('Failed to get repository local path:', error);
    return null;
  }
}

/**
 * Convert Agent-Axios finding to SecureFix IDE Vulnerability format
 */
export function convertFindingToVulnerability(
  finding: AgentAxiosFinding,
  repoBasePath: string
): Vulnerability {
  // Map validation_status to IDE status
  const statusMap: Record<string, Vulnerability['status']> = {
    pending: 'open',
    confirmed: 'open',
    false_positive: 'ignored',
    needs_review: 'in_progress',
  };

  // Extract line numbers from file_path if available (format: path:line)
  let filePath = finding.file_path;
  let startLine = 1;
  let endLine = 10;

  if (finding.file_path.includes(':')) {
    const parts = finding.file_path.split(':');
    filePath = parts[0];
    startLine = parseInt(parts[1], 10) || 1;
    endLine = startLine + 10;
  }

  // Build full file URI
  const fileUri = `${repoBasePath}/${filePath}`.replace(/\\/g, '/');

  return {
    id: `finding-${finding.finding_id}`,
    title: finding.cve_id,
    description: finding.cve_description || `Potential vulnerability: ${finding.cve_id}`,
    severity: finding.severity || 'medium',
    location: {
      fileUri,
      startLine,
      endLine,
    },
    cwe: {
      id: finding.cve_id,
      name: finding.cve_id,
      description: finding.cve_description || '',
      url: `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${finding.cve_id}`,
    },
    codeSnippet: '', // Will be loaded when file is opened
    recommendation: finding.validation_explanation || 'Review and fix this potential vulnerability.',
    status: statusMap[finding.validation_status] || 'open',
  };
}

/**
 * Load vulnerabilities from an analysis report
 */
export async function loadVulnerabilitiesFromAnalysis(
  analysisId: number
): Promise<Vulnerability[]> {
  const report = await fetchAnalysisReport(analysisId);

  if (!report || !report.findings.length) {
    return [];
  }

  // Get repository local path
  const repoPath = await getRepositoryLocalPath(report.analysis.repo_url);
  const basePath = repoPath || '';

  return report.findings.map((finding) => convertFindingToVulnerability(finding, basePath));
}

/**
 * Fetch analysis results from Agent-Axios API (when backend is running)
 */
export async function fetchAnalysisFromAPI(analysisId: number): Promise<AgentAxiosReport | null> {
  try {
    const response = await fetch(
      `http://localhost:5000/api/reports/${analysisId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch from API:', error);
    return null;
  }
}

/**
 * List all repositories from Agent-Axios API
 */
export async function fetchRepositoriesFromAPI(): Promise<RepositoryInfo[]> {
  try {
    const response = await fetch('http://localhost:5000/api/repositories', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.repositories || [];
  } catch (error) {
    console.error('Failed to fetch repositories from API:', error);
    return [];
  }
}

export default {
  fetchAnalysisReport,
  listAnalysisReports,
  getRepositoryLocalPath,
  loadVulnerabilitiesFromAnalysis,
  fetchAnalysisFromAPI,
  fetchRepositoriesFromAPI,
  convertFindingToVulnerability,
};
