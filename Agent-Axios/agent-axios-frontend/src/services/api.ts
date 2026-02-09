/**
 * API Service for Agent Axios
 * Comprehensive security analysis platform with advanced AI-powered vulnerability detection
 */

import { mockDataStore } from './mockData';

// Authentication Token Management
let authToken: string | null = localStorage.getItem('auth_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

// Simulate network delay for realistic UX
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// TYPES
// ============================================================================

export type AnalysisType = 'SHORT' | 'MEDIUM' | 'HARD';
export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ValidationStatus = 'pending' | 'confirmed' | 'false_positive' | 'needs_review';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Analysis {
  analysis_id: number;
  repo_url: string;
  analysis_type: AnalysisType;
  status: AnalysisStatus;
  start_time: string | null;
  end_time: string | null;
  config: Record<string, any> | null;
  error_message: string | null;
  total_files: number;
  total_chunks: number;
  total_findings: number;
  created_at: string;
  updated_at: string;
}

export interface CVEFinding {
  finding_id: number;
  analysis_id: number;
  cve_id: string;
  file_path: string;
  chunk_id: number;
  severity: Severity;
  confidence_score: number;
  validation_status: ValidationStatus;
  validation_explanation: string | null;
  cve_description: string;
  created_at: string;
  updated_at: string;
}

export interface AnalysisResults {
  analysis: Analysis;
  summary: {
    total_files: number;
    total_chunks: number;
    total_findings: number;
    confirmed_vulnerabilities: number;
    false_positives: number;
    severity_breakdown: Record<Severity, number>;
  };
  findings: CVEFinding[];
}

export interface AnalysesList {
  analyses: Array<{
    analysis_id: number;
    repo_url: string;
    analysis_type: AnalysisType;
    status: AnalysisStatus;
    created_at: string;
  }>;
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ProgressUpdate {
  analysis_id: number;
  progress: number;
  stage: 'cloning' | 'chunking' | 'indexing' | 'cve_search' | 'decomposition' | 'code_search' | 'matching' | 'validating' | 'finalizing' | 'completed';
  message: string;
  timestamp: string;
}

export interface IntermediateResult {
  type: 'finding';
  analysis_id: number;
  cve_id: string;
  file_path: string;
  severity: Severity;
  confidence_score: number;
  timestamp: string;
}

export interface AnalysisComplete {
  analysis_id: number;
  status: AnalysisStatus;
  message: string;
  total_findings: number;
  duration_seconds: number;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  avatar?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      tokenType: string;
    };
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
}

export interface Repository {
  id: string;
  name: string;
  url: string;
  fullName: string;
  description?: string;
  language?: string;
  defaultBranch: string;
  branches: number;
  stars: number;
  forks: number;
  lastScan?: string;
  nextScan?: string;
  starred: boolean;
  status: 'healthy' | 'warning' | 'critical' | 'pending';
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  scanFrequency: 'daily' | 'weekly' | 'monthly';
  autoScan: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScanHistory {
  analysis_id: number;
  repo_id: number;
  status: AnalysisStatus;
  start_time: string | null;
  end_time: string | null;
  total_files: number;
  total_chunks: number;
  total_findings: number;
  created_at: string;
  updated_at: string;
  repository?: {
    repo_id: number;
    name: string;
    language: string;
  };
  vulnerabilities?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  message: string;
  sessionId?: string;
  context?: {
    repositoryId?: string;
    [key: string]: any;
  };
}

export interface Notification {
  id: string;
  type: 'scan_complete' | 'vulnerability_found' | 'system' | 'info';
  title: string;
  message: string;
  read: boolean;
  data?: any;
  createdAt: string;
}

export interface UserSettings {
  notifications: {
    email: {
      scanComplete: boolean;
      vulnerabilityFound: boolean;
      weeklyReport: boolean;
    };
    push: {
      scanComplete: boolean;
      vulnerabilityFound: boolean;
    };
    inApp: {
      scanComplete: boolean;
      vulnerabilityFound: boolean;
      systemUpdates: boolean;
    };
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
  };
  scanning: {
    autoScan: boolean;
    scanFrequency: 'daily' | 'weekly' | 'monthly';
    notifyOnComplete: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
  message?: string;
}

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  await delay(500);
  
  const user = mockDataStore.login(credentials.email, credentials.password);
  
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const token = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  setAuthToken(token);

  return {
    success: true,
    data: {
      user,
      token: {
        accessToken: token,
        refreshToken: `refresh_${token}`,
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
    },
  };
}

export async function register(userData: RegisterRequest): Promise<AuthResponse> {
  await delay(600);

  const user = mockDataStore.register(
    userData.email,
    userData.password,
    userData.firstName,
    userData.lastName,
    userData.company
  );

  const token = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  setAuthToken(token);

  return {
    success: true,
    data: {
      user,
      token: {
        accessToken: token,
        refreshToken: `refresh_${token}`,
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
    },
  };
}

export async function logout(refreshToken: string): Promise<ApiResponse> {
  await delay(200);
  mockDataStore.logout();
  setAuthToken(null);

  return {
    success: true,
    message: 'Logged out successfully',
  };
}

export async function getUserProfile(): Promise<ApiResponse<User>> {
  await delay(300);

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const user = mockDataStore.getCurrentUser();

  if (!user) {
    throw new Error('User not found');
  }

  return {
    success: true,
    data: user,
  };
}

export async function refreshToken(refreshToken: string): Promise<ApiResponse> {
  await delay(400);

  const token = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  setAuthToken(token);

  return {
    success: true,
    data: {
      accessToken: token,
      refreshToken: `refresh_${token}`,
      expiresIn: 3600,
      tokenType: 'Bearer',
    },
  };
}

export async function requestPasswordReset(email: string): Promise<ApiResponse> {
  await delay(500);

  return {
    success: true,
    message: 'Password reset email sent',
  };
}

export async function confirmPasswordReset(
  token: string,
  newPassword: string
): Promise<ApiResponse> {
  await delay(500);

  return {
    success: true,
    message: 'Password reset successfully',
  };
}

export async function updateUserProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
  await delay(400);

  const user = mockDataStore.getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const updatedUser = { ...user, ...updates, updatedAt: new Date().toISOString() };

  return {
    success: true,
    data: updatedUser,
  };
}

// ============================================================================
// REPOSITORY API
// ============================================================================

export async function getRepositories(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort?: string;
}): Promise<ApiResponse<{ repositories: Repository[]; total: number; page: number; limit: number }>> {
  await delay(400);

  const repositories = mockDataStore.getRepositories();

  return {
    success: true,
    data: {
      repositories,
      total: repositories.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
    },
  };
}

export async function getRepository(id: string): Promise<ApiResponse<Repository>> {
  await delay(300);

  const repository = mockDataStore.getRepository(id);

  if (!repository) {
    throw new Error('Repository not found');
  }

  return {
    success: true,
    data: repository,
  };
}

export async function addRepository(data: {
  url: string;
  scanFrequency?: 'daily' | 'weekly' | 'monthly';
  autoScan?: boolean;
}): Promise<ApiResponse<Repository>> {
  await delay(600);

  const repository = mockDataStore.addRepository(data.url);

  if (data.scanFrequency) repository.scanFrequency = data.scanFrequency;
  if (data.autoScan !== undefined) repository.autoScan = data.autoScan;

  return {
    success: true,
    data: repository,
  };
}

export async function updateRepository(
  id: string,
  updates: Partial<Repository>
): Promise<ApiResponse<Repository>> {
  await delay(400);

  const repository = mockDataStore.updateRepository(id, updates);

  if (!repository) {
    throw new Error('Repository not found');
  }

  return {
    success: true,
    data: repository,
  };
}

export async function deleteRepository(id: string): Promise<ApiResponse> {
  await delay(400);

  const success = mockDataStore.deleteRepository(id);

  if (!success) {
    throw new Error('Repository not found');
  }

  return {
    success: true,
    message: 'Repository deleted successfully',
  };
}

export async function toggleRepositoryStar(id: string): Promise<ApiResponse<Repository>> {
  await delay(300);

  const repository = mockDataStore.getRepository(id);

  if (!repository) {
    throw new Error('Repository not found');
  }

  const updated = mockDataStore.updateRepository(id, { starred: !repository.starred });

  return {
    success: true,
    data: updated!,
  };
}

export async function scanRepository(
  id: string,
  analysisType: AnalysisType = 'MEDIUM'
): Promise<ApiResponse<{ analysis_id: number }>> {
  await delay(500);

  const repository = mockDataStore.getRepository(id);

  if (!repository) {
    throw new Error('Repository not found');
  }

  const analysis = mockDataStore.createAnalysis(repository.url, analysisType, false);

  // Simulate analysis progress
  simulateAnalysisProgress(analysis.analysis_id);

  return {
    success: true,
    data: { analysis_id: analysis.analysis_id },
  };
}

// ============================================================================
// ANALYSIS API
// ============================================================================

export async function createAnalysis(
  repoUrl: string,
  analysisType: AnalysisType,
  config?: Record<string, any>
): Promise<Analysis> {
  await delay(500);

  const analysis = mockDataStore.createAnalysis(repoUrl, analysisType, false);

  // Simulate analysis progress
  simulateAnalysisProgress(analysis.analysis_id);

  return analysis;
}

export async function getAnalysis(analysisId: number): Promise<Analysis> {
  await delay(300);

  const analysis = mockDataStore.getAnalysis(analysisId);

  if (!analysis) {
    throw new Error('Analysis not found');
  }

  return analysis;
}

export async function getAnalysisResults(analysisId: number): Promise<AnalysisResults> {
  await delay(400);

  const analysis = mockDataStore.getAnalysis(analysisId);

  if (!analysis) {
    throw new Error('Analysis not found');
  }

  const findings = mockDataStore.getFindings(analysisId);

  const severityBreakdown = findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {} as Record<Severity, number>);

  // Ensure all severities are present
  ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(sev => {
    if (!severityBreakdown[sev as Severity]) {
      severityBreakdown[sev as Severity] = 0;
    }
  });

  return {
    analysis,
    summary: {
      total_files: analysis.total_files,
      total_chunks: analysis.total_chunks,
      total_findings: findings.length,
      confirmed_vulnerabilities: findings.filter(f => f.validation_status === 'confirmed').length,
      false_positives: findings.filter(f => f.validation_status === 'false_positive').length,
      severity_breakdown: severityBreakdown,
    },
    findings,
  };
}

export async function listAnalyses(
  page: number = 1,
  perPage: number = 20,
  status?: AnalysisStatus
): Promise<AnalysesList> {
  await delay(400);

  let analyses = mockDataStore.getAnalyses();

  if (status) {
    analyses = analyses.filter(a => a.status === status);
  }

  const total = analyses.length;
  const pages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;

  return {
    analyses: analyses.slice(start, end).map(a => ({
      analysis_id: a.analysis_id,
      repo_url: a.repo_url,
      analysis_type: a.analysis_type,
      status: a.status,
      created_at: a.created_at,
    })),
    total,
    page,
    per_page: perPage,
    pages,
  };
}

export async function updateFindingValidation(
  findingId: number,
  status: ValidationStatus,
  explanation?: string
): Promise<ApiResponse<CVEFinding>> {
  await delay(300);

  const finding = mockDataStore.updateFindingValidation(findingId, status, explanation);

  if (!finding) {
    throw new Error('Finding not found');
  }

  return {
    success: true,
    data: finding,
  };
}

// ============================================================================
// CHAT API
// ============================================================================

export async function sendChatMessage(
  analysisId: number,
  message: string
): Promise<ApiResponse<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>> {
  await delay(800); // Simulate AI processing time

  const userMessage = mockDataStore.addChatMessage(analysisId, message, 'user');
  
  // Generate AI response
  const response = mockDataStore.generateAIResponse(analysisId, message);
  const assistantMessage = mockDataStore.addChatMessage(analysisId, response, 'assistant');

  return {
    success: true,
    data: {
      userMessage,
      assistantMessage,
    },
  };
}

export async function getChatHistory(analysisId: number): Promise<ApiResponse<ChatMessage[]>> {
  await delay(300);

  const messages = mockDataStore.getChatMessages(analysisId);

  return {
    success: true,
    data: messages,
  };
}

// ============================================================================
// DASHBOARD & STATISTICS API
// ============================================================================

export async function getDashboardStats(): Promise<ApiResponse<any>> {
  await delay(400);

  const stats = mockDataStore.getDashboardStats();

  return {
    success: true,
    data: stats,
  };
}

export async function getScanHistory(params?: {
  page?: number;
  limit?: number;
  repositoryId?: string;
}): Promise<ApiResponse<{ scans: ScanHistory[]; total: number }>> {
  await delay(400);

  const analyses = mockDataStore.getAnalyses();

  const scans: ScanHistory[] = analyses.map(a => ({
    ...a,
    repo_id: parseInt(a.repo_url.split('/').pop()?.replace(/\D/g, '') || '1'),
    vulnerabilities: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: a.total_findings,
    },
  }));

  return {
    success: true,
    data: {
      scans: scans.slice(0, params?.limit || 20),
      total: scans.length,
    },
  };
}

export async function getVulnerabilityTrends(days: number = 30): Promise<ApiResponse<any>> {
  await delay(400);

  // Generate trend data
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      critical: Math.floor(Math.random() * 5),
      high: Math.floor(Math.random() * 10),
      medium: Math.floor(Math.random() * 15),
      low: Math.floor(Math.random() * 20),
    });
  }

  return {
    success: true,
    data: { trends: data },
  };
}

// ============================================================================
// NOTIFICATIONS API
// ============================================================================

export async function getNotifications(params?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<ApiResponse<Notification[]>> {
  await delay(300);

  const notifications: Notification[] = [
    {
      id: 'notif_1',
      type: 'scan_complete',
      title: 'Scan Complete',
      message: 'Security scan completed for payment-gateway',
      read: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'notif_2',
      type: 'vulnerability_found',
      title: 'Critical Vulnerability Found',
      message: 'CVE-2024-1234 detected in user-management',
      read: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'notif_3',
      type: 'system',
      title: 'System Update',
      message: 'New security definitions available',
      read: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  const filtered = params?.unreadOnly 
    ? notifications.filter(n => !n.read) 
    : notifications;

  return {
    success: true,
    data: filtered.slice(0, params?.limit || 50),
  };
}

export async function markNotificationAsRead(id: string): Promise<ApiResponse> {
  await delay(200);

  return {
    success: true,
    message: 'Notification marked as read',
  };
}

export async function markAllNotificationsAsRead(): Promise<ApiResponse> {
  await delay(300);

  return {
    success: true,
    message: 'All notifications marked as read',
  };
}

// ============================================================================
// REPORTS API
// ============================================================================

export async function generateReport(
  analysisId: number,
  format: 'pdf' | 'json' | 'csv' = 'pdf'
): Promise<ApiResponse<{ downloadUrl: string }>> {
  await delay(1500); // Simulate report generation

  return {
    success: true,
    data: {
      downloadUrl: `/reports/analysis_${analysisId}_report.${format}`,
    },
  };
}

export async function getReportHistory(): Promise<ApiResponse<any[]>> {
  await delay(300);

  const reports = [
    {
      id: 'report_1',
      analysisId: 1,
      format: 'pdf',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      size: '2.4 MB',
    },
    {
      id: 'report_2',
      analysisId: 2,
      format: 'pdf',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      size: '1.8 MB',
    },
  ];

  return {
    success: true,
    data: reports,
  };
}

// ============================================================================
// USER SETTINGS API
// ============================================================================

export async function getUserSettings(): Promise<ApiResponse<UserSettings>> {
  await delay(300);

  const settings: UserSettings = {
    notifications: {
      email: {
        scanComplete: true,
        vulnerabilityFound: true,
        weeklyReport: true,
      },
      push: {
        scanComplete: true,
        vulnerabilityFound: true,
      },
      inApp: {
        scanComplete: true,
        vulnerabilityFound: true,
        systemUpdates: true,
      },
    },
    preferences: {
      theme: 'dark',
      language: 'en',
      timezone: 'UTC',
    },
    scanning: {
      autoScan: true,
      scanFrequency: 'weekly',
      notifyOnComplete: true,
    },
  };

  return {
    success: true,
    data: settings,
  };
}

export async function updateUserSettings(
  settings: Partial<UserSettings>
): Promise<ApiResponse<UserSettings>> {
  await delay(400);

  const current = await getUserSettings();

  const updated = {
    ...current.data!,
    ...settings,
  };

  return {
    success: true,
    data: updated,
  };
}

// ============================================================================
// HEALTH & SYSTEM API
// ============================================================================

export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  await delay(100);

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// SIMULATED REAL-TIME UPDATES
// ============================================================================

type ProgressCallback = (update: ProgressUpdate) => void;
type ResultCallback = (result: IntermediateResult) => void;
type CompleteCallback = (complete: AnalysisComplete) => void;

const progressCallbacks = new Map<number, ProgressCallback[]>();
const resultCallbacks = new Map<number, ResultCallback[]>();
const completeCallbacks = new Map<number, CompleteCallback[]>();

export function subscribeToAnalysis(
  analysisId: number,
  callbacks: {
    onProgress?: ProgressCallback;
    onResult?: ResultCallback;
    onComplete?: CompleteCallback;
  }
) {
  if (callbacks.onProgress) {
    if (!progressCallbacks.has(analysisId)) {
      progressCallbacks.set(analysisId, []);
    }
    progressCallbacks.get(analysisId)!.push(callbacks.onProgress);
  }

  if (callbacks.onResult) {
    if (!resultCallbacks.has(analysisId)) {
      resultCallbacks.set(analysisId, []);
    }
    resultCallbacks.get(analysisId)!.push(callbacks.onResult);
  }

  if (callbacks.onComplete) {
    if (!completeCallbacks.has(analysisId)) {
      completeCallbacks.set(analysisId, []);
    }
    completeCallbacks.get(analysisId)!.push(callbacks.onComplete);
  }

  return () => {
    if (callbacks.onProgress) {
      const cbs = progressCallbacks.get(analysisId);
      if (cbs) {
        const idx = cbs.indexOf(callbacks.onProgress);
        if (idx > -1) cbs.splice(idx, 1);
      }
    }
    if (callbacks.onResult) {
      const cbs = resultCallbacks.get(analysisId);
      if (cbs) {
        const idx = cbs.indexOf(callbacks.onResult);
        if (idx > -1) cbs.splice(idx, 1);
      }
    }
    if (callbacks.onComplete) {
      const cbs = completeCallbacks.get(analysisId);
      if (cbs) {
        const idx = cbs.indexOf(callbacks.onComplete);
        if (idx > -1) cbs.splice(idx, 1);
      }
    }
  };
}

function simulateAnalysisProgress(analysisId: number) {
  const analysis = mockDataStore.getAnalysis(analysisId);
  const findings = mockDataStore.getFindings(analysisId);
  
  // Realistic stage progression with detailed sub-tasks
  const stages = [
    {
      stage: 'cloning' as ProgressUpdate['stage'],
      duration: 2500,
      substeps: [
        { progress: 2, message: 'Initializing Git client...' },
        { progress: 5, message: 'Connecting to repository...' },
        { progress: 8, message: 'Fetching repository metadata...' },
        { progress: 11, message: 'Cloning repository files...' },
      ]
    },
    {
      stage: 'chunking' as ProgressUpdate['stage'],
      duration: 3500,
      substeps: [
        { progress: 15, message: 'Scanning directory structure...' },
        { progress: 18, message: `Discovered ${analysis?.total_files || 0} files to analyze` },
        { progress: 22, message: 'Parsing source code files...' },
        { progress: 26, message: 'Creating semantic code chunks...' },
        { progress: 30, message: `Generated ${analysis?.total_chunks || 0} code chunks` },
      ]
    },
    {
      stage: 'indexing' as ProgressUpdate['stage'],
      duration: 3000,
      substeps: [
        { progress: 34, message: 'Initializing FAISS vector store...' },
        { progress: 38, message: 'Computing embeddings with Cohere...' },
        { progress: 42, message: 'Building semantic search index...' },
        { progress: 46, message: 'Optimizing index for fast retrieval...' },
      ]
    },
    {
      stage: 'cve_search' as ProgressUpdate['stage'],
      duration: 2800,
      substeps: [
        { progress: 50, message: 'Querying NVD CVE database...' },
        { progress: 53, message: 'Fetching latest vulnerability definitions...' },
        { progress: 56, message: `Retrieved ${findings.length * 2} potential CVE matches` },
        { progress: 60, message: 'Filtering relevant vulnerabilities...' },
      ]
    },
    {
      stage: 'decomposition' as ProgressUpdate['stage'],
      duration: 4000,
      substeps: [
        { progress: 63, message: 'Analyzing CVE descriptions with NLP...' },
        { progress: 66, message: 'Extracting vulnerability patterns...' },
        { progress: 70, message: 'Decomposing attack vectors...' },
        { progress: 73, message: 'Identifying code patterns to search...' },
        { progress: 76, message: 'Building vulnerability signatures...' },
      ]
    },
    {
      stage: 'code_search' as ProgressUpdate['stage'],
      duration: 4500,
      substeps: [
        { progress: 79, message: 'Searching codebase with semantic similarity...' },
        { progress: 82, message: 'Analyzing function calls and data flows...' },
        { progress: 85, message: 'Detecting potentially vulnerable patterns...' },
        { progress: 88, message: `Found ${findings.length} potential matches` },
      ]
    },
    {
      stage: 'matching' as ProgressUpdate['stage'],
      duration: 3500,
      substeps: [
        { progress: 90, message: 'Performing deep code analysis...' },
        { progress: 92, message: 'Computing confidence scores...' },
        { progress: 94, message: 'Ranking findings by severity...' },
      ]
    },
    {
      stage: 'validating' as ProgressUpdate['stage'],
      duration: 5500,
      substeps: [
        { progress: 95, message: 'Initializing AI validation agent...' },
        { progress: 96, message: 'Analyzing code context with LLM...' },
        { progress: 97, message: 'Validating true positives vs false positives...' },
        { progress: 98, message: 'Generating validation explanations...' },
      ]
    },
    {
      stage: 'finalizing' as ProgressUpdate['stage'],
      duration: 2000,
      substeps: [
        { progress: 99, message: 'Compiling final report...' },
        { progress: 100, message: 'Analysis complete!' },
      ]
    },
  ];

  let currentStageIndex = 0;
  let currentSubstepIndex = 0;
  let findingIndex = 0;

  const runSubstep = () => {
    if (currentStageIndex >= stages.length) {
      // Mark as completed
      mockDataStore.updateAnalysisStatus(analysisId, 'completed');

      const completeUpdate: AnalysisComplete = {
        analysis_id: analysisId,
        status: 'completed',
        message: 'Analysis completed successfully',
        total_findings: findings.length,
        duration_seconds: Math.floor((Date.now() - new Date(analysis!.start_time!).getTime()) / 1000),
        timestamp: new Date().toISOString(),
      };

      const cbs = completeCallbacks.get(analysisId);
      if (cbs) {
        cbs.forEach(cb => cb(completeUpdate));
      }

      return;
    }

    const stage = stages[currentStageIndex];
    const substep = stage.substeps[currentSubstepIndex];

    // Update to running status on first stage
    if (currentStageIndex === 0 && currentSubstepIndex === 0) {
      mockDataStore.updateAnalysisStatus(analysisId, 'running');
    }

    // Send progress update
    const progressUpdate: ProgressUpdate = {
      analysis_id: analysisId,
      progress: substep.progress,
      stage: stage.stage,
      message: substep.message,
      timestamp: new Date().toISOString(),
    };

    const progressCbs = progressCallbacks.get(analysisId);
    if (progressCbs) {
      progressCbs.forEach(cb => cb(progressUpdate));
    }

    // Emit findings gradually during matching and validating stages
    if ((stage.stage === 'matching' || stage.stage === 'validating') && findingIndex < findings.length) {
      const findingsToEmit = stage.stage === 'matching' ? 
        Math.ceil(findings.length * 0.6) : // Emit 60% during matching
        findings.length; // Emit rest during validation

      if (findingIndex < findingsToEmit) {
        setTimeout(() => {
          const finding = findings[findingIndex];
          const result: IntermediateResult = {
            type: 'finding',
            analysis_id: analysisId,
            cve_id: finding.cve_id,
            file_path: finding.file_path,
            severity: finding.severity,
            confidence_score: finding.confidence_score,
            timestamp: new Date().toISOString(),
          };

          const resultCbs = resultCallbacks.get(analysisId);
          if (resultCbs) {
            resultCbs.forEach(cb => cb(result));
          }
          
          findingIndex++;
        }, Math.random() * 800 + 200); // Random delay between 200-1000ms
      }
    }

    // Move to next substep or stage
    currentSubstepIndex++;
    if (currentSubstepIndex >= stage.substeps.length) {
      currentSubstepIndex = 0;
      currentStageIndex++;
    }

    const delay = stage.duration / stage.substeps.length;
    setTimeout(runSubstep, delay);
  };

  // Start the simulation
  setTimeout(runSubstep, 500);
}

export function unsubscribeFromAnalysis(analysisId: number) {
  progressCallbacks.delete(analysisId);
  resultCallbacks.delete(analysisId);
  completeCallbacks.delete(analysisId);
}

// ============================================================================
// ADDITIONAL API FUNCTIONS
// ============================================================================

export interface Report {
  id: string;
  analysis_id: number;
  repo_url: string;
  status: AnalysisStatus;
  created_at: string;
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export async function getReports(params?: {
  page?: number;
  perPage?: number;
  status?: AnalysisStatus;
  repoId?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
}): Promise<ApiResponse<{ reports: Report[]; page: number; pages: number; total: number }>> {
  await delay(400);

  const analyses = mockDataStore.getAnalyses();
  
  const reports: Report[] = analyses.map(a => {
    const findings = mockDataStore.getFindings(a.analysis_id);
    return {
      id: `report_${a.analysis_id}`,
      analysis_id: a.analysis_id,
      repo_url: a.repo_url,
      status: a.status,
      created_at: a.created_at,
      total_findings: findings.length,
      critical: findings.filter(f => f.severity === 'CRITICAL').length,
      high: findings.filter(f => f.severity === 'HIGH').length,
      medium: findings.filter(f => f.severity === 'MEDIUM').length,
      low: findings.filter(f => f.severity === 'LOW').length,
    };
  });

  const page = params?.page || 1;
  const perPage = params?.perPage || 10;
  const total = reports.length;
  const pages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;

  return {
    success: true,
    data: {
      reports: reports.slice(start, start + perPage),
      page,
      pages,
      total,
    },
  };
}

export async function getReport(id: string): Promise<ApiResponse<Report>> {
  await delay(300);

  const analysisId = parseInt(id.replace('report_', ''));
  const analysis = mockDataStore.getAnalysis(analysisId);

  if (!analysis) {
    throw new Error('Report not found');
  }

  const findings = mockDataStore.getFindings(analysisId);

  return {
    success: true,
    data: {
      id,
      analysis_id: analysisId,
      repo_url: analysis.repo_url,
      status: analysis.status,
      created_at: analysis.created_at,
      total_findings: findings.length,
      critical: findings.filter(f => f.severity === 'CRITICAL').length,
      high: findings.filter(f => f.severity === 'HIGH').length,
      medium: findings.filter(f => f.severity === 'MEDIUM').length,
      low: findings.filter(f => f.severity === 'LOW').length,
    },
  };
}

export async function exportReport(analysisId: number, format: 'pdf' | 'json' | 'csv' = 'pdf'): Promise<Blob> {
  await delay(1000);

  const results = await getAnalysisResults(analysisId);

  if (format === 'pdf') {
    // Generate a simple PDF-like content
    const content = `
SECURITY VULNERABILITY REPORT
Analysis ID: ${analysisId}
Repository: ${results.analysis.repo_url}
Generated: ${new Date().toISOString()}

SUMMARY
=======
Total Files Analyzed: ${results.summary.total_files}
Code Chunks: ${results.summary.total_chunks}
Total Vulnerabilities: ${results.summary.total_findings}
Confirmed Vulnerabilities: ${results.summary.confirmed_vulnerabilities}
False Positives: ${results.summary.false_positives}

SEVERITY BREAKDOWN
==================
CRITICAL: ${results.summary.severity_breakdown.CRITICAL}
HIGH: ${results.summary.severity_breakdown.HIGH}
MEDIUM: ${results.summary.severity_breakdown.MEDIUM}
LOW: ${results.summary.severity_breakdown.LOW}

DETAILED FINDINGS
=================
${results.findings.map((f, i) => `
${i + 1}. ${f.cve_id} - ${f.severity}
   File: ${f.file_path}
   Confidence: ${(f.confidence_score * 100).toFixed(1)}%
   Status: ${f.validation_status}
   Description: ${f.cve_description}
   ${f.validation_explanation ? `Explanation: ${f.validation_explanation}` : ''}
`).join('\n')}

END OF REPORT
`;

    return new Blob([content], { type: 'application/pdf' });
  }

  if (format === 'json') {
    return new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  }

  // CSV format
  const csv = `CVE ID,File Path,Severity,Confidence,Status,Description
${results.findings.map(f => `"${f.cve_id}","${f.file_path}","${f.severity}","${(f.confidence_score * 100).toFixed(1)}%","${f.validation_status}","${f.cve_description}"`).join('\n')}`;

  return new Blob([csv], { type: 'text/csv' });
}

export async function compareReports(reportIds: string[]): Promise<ApiResponse<any>> {
  await delay(500);

  return {
    success: true,
    data: {
      comparison: 'Report comparison feature',
    },
  };
}

export async function triggerScan(repoId: string, analysisType: AnalysisType = 'MEDIUM'): Promise<ApiResponse<{ analysis_id: number }>> {
  return scanRepository(repoId, analysisType);
}

export async function getDashboardOverview(): Promise<ApiResponse<any>> {
  await delay(400);

  const stats = mockDataStore.getDashboardStats();
  const repos = mockDataStore.getRepositories();
  const analyses = mockDataStore.getAnalyses();

  return {
    success: true,
    data: {
      scans: {
        total: stats.totalScans,
        active: stats.activeScans,
        completed: analyses.filter(a => a.status === 'completed').length,
        failed: analyses.filter(a => a.status === 'failed').length,
      },
      repositories: {
        total: stats.totalRepositories,
        starred: repos.filter(r => r.starred).length,
      },
      vulnerabilities: {
        total: stats.totalVulnerabilities,
        critical: stats.criticalVulnerabilities,
        high: stats.totalVulnerabilities - stats.criticalVulnerabilities,
      },
      overview: stats,
    },
  };
}

