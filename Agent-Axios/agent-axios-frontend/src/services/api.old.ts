/**
 * API Service for Agent Axios
 * Comprehensive security analysis platform
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

// Simulate network delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Types
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

// Authentication Types
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

// Repository Types
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

// Report Types
export interface ReportVulnerabilitiesDetail {
  cveId: string;
  severity: Severity;
  title: string;
  description: string;
  affectedFile: string;
  recommendedFix: string;
}

export interface Report {
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
  // Computed fields for display
  vulnerabilities?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
}

// Chat Types
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

// Notification Types
export interface Notification {
  id: string;
  type: 'scan_complete' | 'vulnerability_found' | 'system' | 'info';
  title: string;
  message: string;
  read: boolean;
  data?: any;
  createdAt: string;
}

// Settings Types
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

// API Response Types
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

// API Functions

/**
 * Health Check - Test backend connection
 */
export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  return response.json();
}

/**
 * Create Analysis - Start a new repository analysis
 */
export async function createAnalysis(
  repoUrl: string,
  analysisType: AnalysisType,
  config?: Record<string, any>
): Promise<Analysis> {
  const response = await fetch(`${API_BASE_URL}/api/analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repo_url: repoUrl,
      analysis_type: analysisType,
      ...(config && { config }),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create analysis');
  }

  return response.json();
}

/**
 * Get Analysis - Fetch analysis status by ID
 */
export async function getAnalysis(analysisId: number): Promise<Analysis> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/${analysisId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch analysis');
  }

  return response.json();
}

/**
 * Get Analysis Results - Fetch detailed results after completion
 */
export async function getAnalysisResults(analysisId: number): Promise<AnalysisResults> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/${analysisId}/results`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch results');
  }

  return response.json();
}

/**
 * List Analyses - Get all analyses with pagination
 */
export async function listAnalyses(
  page: number = 1,
  perPage: number = 20,
  status?: AnalysisStatus
): Promise<AnalysesList> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    ...(status && { status }),
  });

  const response = await fetch(`${API_BASE_URL}/api/analyses?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list analyses');
  }

  return response.json();
}

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

/**
 * User Login
 */
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const backendData = await response.json();
  
  // Store token
  if (backendData.access_token) {
    setAuthToken(backendData.access_token);
  }

  // Transform backend response to frontend format
  const data: AuthResponse = {
    success: true,
    data: {
      user: {
        id: backendData.user.user_id,
        email: backendData.user.email,
        firstName: backendData.user.first_name,
        lastName: backendData.user.last_name,
        company: backendData.user.company,
        avatar: backendData.user.avatar_url,
        role: backendData.user.role,
        createdAt: backendData.user.created_at,
        updatedAt: backendData.user.updated_at,
      },
      token: {
        accessToken: backendData.access_token,
        refreshToken: '', // Not provided by backend
        expiresIn: 86400, // 24 hours
        tokenType: 'Bearer',
      }
    }
  };

  return data;
}

/**
 * User Registration
 */
export async function register(userData: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  const backendData = await response.json();
  
  // Store token
  if (backendData.access_token) {
    setAuthToken(backendData.access_token);
  }

  // Transform backend response to frontend format
  const data: AuthResponse = {
    success: true,
    data: {
      user: {
        id: backendData.user.user_id,
        email: backendData.user.email,
        firstName: backendData.user.first_name,
        lastName: backendData.user.last_name,
        company: backendData.user.company,
        avatar: backendData.user.avatar_url,
        role: backendData.user.role,
        createdAt: backendData.user.created_at,
        updatedAt: backendData.user.updated_at,
      },
      token: {
        accessToken: backendData.access_token,
        refreshToken: '', // Not provided by backend
        expiresIn: 86400, // 24 hours
        tokenType: 'Bearer',
      }
    }
  };

  return data;
}

/**
 * Refresh Access Token
 */
export async function refreshToken(refreshToken: string): Promise<ApiResponse<{
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}>> {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Token refresh failed');
  }

  const data = await response.json();
  
  // Update token
  if (data.success && data.data.accessToken) {
    setAuthToken(data.data.accessToken);
  }

  return data;
}

/**
 * User Logout
 */
export async function logout(refreshToken: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ refreshToken }),
  });

  // Clear token regardless of response
  setAuthToken(null);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Logout failed');
  }

  return response.json();
}

/**
 * Request Password Reset
 */
export async function requestPasswordReset(email: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Password reset request failed');
  }

  return response.json();
}

/**
 * Confirm Password Reset
 */
export async function confirmPasswordReset(token: string, newPassword: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Password reset failed');
  }

  return response.json();
}

// ============================================================================
// REPOSITORY ENDPOINTS
// ============================================================================

/**
 * Get All Repositories
 */
export async function getRepositories(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'healthy' | 'warning' | 'critical';
  starred?: boolean;
}): Promise<ApiResponse<{
  repositories: Repository[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('perPage', params.limit.toString());
  if (params?.search) searchParams.append('search', params.search);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.starred !== undefined) searchParams.append('isStarred', params.starred.toString());

  const response = await fetch(`${API_BASE_URL}/api/repositories?${searchParams}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch repositories');
  }

  const payload = await response.json();
  return {
    success: true,
    data: payload,
  };
}

/**
 * Get Repository by ID
 */
export async function getRepository(id: string): Promise<ApiResponse<Repository>> {
  const response = await fetch(`${API_BASE_URL}/api/repositories/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch repository');
  }

  const payload = await response.json();
  return {
    success: true,
    data: payload,
  };
}

/**
 * Add New Repository
 */
export async function addRepository(data: {
  name: string;
  url: string;
  description?: string;
  language?: string;
  framework?: string;
}): Promise<ApiResponse<Repository>> {
  const response = await fetch(`${API_BASE_URL}/api/repositories`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to add repository');
  }

  const payload = await response.json();
  return {
    success: true,
    data: payload,
  };
}

/**
 * Update Repository
 */
export async function updateRepository(id: string, data: Partial<Repository>): Promise<ApiResponse<Repository>> {
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.language !== undefined) payload.language = data.language;
  if (typeof (data as any).starred === 'boolean') payload.isStarred = (data as any).starred;

  const response = await fetch(`${API_BASE_URL}/api/repositories/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update repository');
  }

  const payloadResponse = await response.json();
  return {
    success: true,
    data: payloadResponse,
  };
}

/**
 * Delete Repository
 */
export async function deleteRepository(id: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/repositories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete repository');
  }

  const payload = await response.json();
  return {
    success: true,
    data: payload,
  };
}

/**
 * Trigger Manual Scan
 */
export async function triggerScan(repositoryId: string, data?: {
  branch?: string;
  fullScan?: boolean;
  analysisType?: AnalysisType;
}): Promise<ApiResponse<{
  scanId: string;
  repositoryId: string;
  status: string;
  estimatedDuration: number;
  queuePosition: number;
  startedAt: string | null;
}>> {
  const payload: Record<string, unknown> = {
    analysisType: data?.analysisType ?? 'MEDIUM',
  };

  if (data?.branch) payload.branch = data.branch;
  if (data?.fullScan !== undefined) payload.fullScan = data.fullScan;

  const response = await fetch(`${API_BASE_URL}/api/repositories/${repositoryId}/scan`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to trigger scan');
  }

  const payloadResponse = await response.json();
  return {
    success: true,
    data: payloadResponse,
  };
}

/**
 * Get Scan Status
 */
export async function getScanStatus(repositoryId: string): Promise<ApiResponse<{
  scanId: string;
  repositoryId: string;
  status: string;
  progress: {
    percentage: number;
    currentStep: string;
    stepsCompleted: string[];
    stepsRemaining: string[];
  };
  startedAt: string;
  estimatedCompletion: string;
}>> {
  const response = await fetch(`${API_BASE_URL}/api/repositories/${repositoryId}/scan-status`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch scan status');
  }

  const payload = await response.json();
  return {
    success: true,
    data: payload,
  };
}

// ============================================================================
// CHAT / AI ASSISTANT ENDPOINTS
// ============================================================================

/**
 * Send Chat Message
 */
export async function sendChatMessage(data: SendMessageRequest): Promise<ApiResponse<{
  messageId: string;
  response: string;
  suggestions: string[];
}>> {
  const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to send message');
  }

  return response.json();
}

/**
 * Get Chat History
 */
export async function getChatHistory(sessionId: string): Promise<ApiResponse<ChatSession>> {
  const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}/messages`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch chat history');
  }

  return response.json();
}

/**
 * Stream Chat Response (SSE)
 */
export function streamChatResponse(sessionId: string, onMessage: (data: any) => void, onError?: (error: Error) => void): EventSource {
  const eventSource = new EventSource(
  `${API_BASE_URL}/api/chat/stream/${sessionId}`,
    // Note: EventSource doesn't support custom headers, use query param for auth
  );

  eventSource.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
    }
  });

  eventSource.addEventListener('progress', (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage({ type: 'progress', ...data });
    } catch (error) {
      console.error('Failed to parse progress event:', error);
    }
  });

  eventSource.addEventListener('complete', (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage({ type: 'complete', ...data });
      eventSource.close();
    } catch (error) {
      console.error('Failed to parse complete event:', error);
    }
  });

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    onError?.(new Error('Connection error'));
    eventSource.close();
  };

  return eventSource;
}

// ============================================================================
// USER PROFILE & SETTINGS ENDPOINTS
// ============================================================================

/**
 * Get User Profile
 */
export async function getUserProfile(): Promise<ApiResponse<User>> {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch profile');
  }

  const payload = await response.json();
  const normalized: User = {
    id: payload.user_id,
    email: payload.email,
    firstName: payload.first_name,
    lastName: payload.last_name,
    company: payload.company,
    avatar: payload.avatar_url,
    role: payload.role,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
  };
  return {
    success: true,
    data: normalized,
  };
}

/**
 * Update User Profile
 */
export async function updateUserProfile(data: Partial<User>): Promise<ApiResponse<User>> {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update profile');
  }

  return response.json();
}

/**
 * Upload Avatar
 */
export async function uploadAvatar(file: File): Promise<ApiResponse<{
  avatar: string;
  updatedAt: string;
}>> {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetch(`${API_BASE_URL}/api/user/avatar`, {
    method: 'POST',
    headers: {
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to upload avatar');
  }

  return response.json();
}

/**
 * Get User Settings
 */
export async function getUserSettings(): Promise<ApiResponse<UserSettings>> {
  const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch settings');
  }

  return response.json();
}

/**
 * Update User Settings
 */
export async function updateUserSettings(data: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
  const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update settings');
  }

  return response.json();
}

/**
 * Change Password
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/user/password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to change password');
  }

  return response.json();
}

// ============================================================================
// NOTIFICATIONS ENDPOINTS
// ============================================================================

/**
 * Get Notifications
 */
export async function getNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<ApiResponse<{
  notifications: Notification[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  unread_count: number;
}>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('perPage', params.limit.toString());
  if (params?.unreadOnly) searchParams.append('unreadOnly', params.unreadOnly.toString());

  const response = await fetch(`${API_BASE_URL}/api/notifications?${searchParams}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch notifications');
  }

  const payload = await response.json();
  return {
    success: true,
    data: payload,
  };
}

/**
 * Mark Notification as Read
 */
export async function markNotificationAsRead(id: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to mark notification as read');
  }

  const payload = await response.json();
  return {
    success: true,
    data: payload,
  };
}

/**
 * Mark All Notifications as Read
 */
export async function markAllNotificationsAsRead(): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to mark all notifications as read');
  }

  const payload = await response.json();
  return {
    success: true,
    data: payload,
  };
}

// ============================================================================
// REPORT ENDPOINTS
// ============================================================================

/**
 * Get Reports - List all analysis reports with filtering
 */
export async function getReports(params?: {
  page?: number;
  perPage?: number;
  status?: AnalysisStatus;
  repoId?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: 'created_at' | 'vulnerability_count';
}): Promise<ApiResponse<{
  reports: Report[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}>> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.perPage) searchParams.append('perPage', params.perPage.toString());
  if (params?.status) searchParams.append('status', params.status);
  if (params?.repoId) searchParams.append('repoId', params.repoId.toString());
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy);

  const response = await fetch(
    `${API_BASE_URL}/api/reports?${searchParams}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch reports');
  }

  const payload = await response.json();
  return {
    success: true,
    data: payload,
  };
}

/**
 * Get Report - Get detailed report for a specific analysis
 */
export async function getReport(analysisId: number): Promise<ApiResponse<{
  analysis: Analysis;
  findings: CVEFinding[];
  summary: {
    total_findings: number;
    by_severity: Record<Severity, number>;
    by_validation: Record<ValidationStatus, number>;
    confirmed_vulnerabilities: number;
    false_positives: number;
  };
  repository: {
    repo_id: number;
    name: string;
    url: string;
    language: string;
  };
}>> {
  const response = await fetch(
    `${API_BASE_URL}/api/reports/${analysisId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch report');
  }

  const payload = await response.json();
  return {
    success: true,
    data: payload,
  };
}

/**
 * Export Report - Export report as PDF
 */
export async function exportReport(
  analysisId: number,
  format: 'pdf' | 'json' = 'pdf'
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/api/reports/${analysisId}/export?format=${format}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to export report');
  }

  return response.blob();
}

/**
 * Compare Reports - Compare two analysis reports
 */
export async function compareReports(
  analysisId1: number,
  analysisId2: number
): Promise<ApiResponse<{
  analysis1: Analysis;
  analysis2: Analysis;
  comparison: {
    new_findings: CVEFinding[];
    resolved_findings: CVEFinding[];
    common_findings: CVEFinding[];
    severity_changes: any[];
  };
}>> {
  const response = await fetch(`${API_BASE_URL}/api/reports/compare`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      analysis_id_1: analysisId1,
      analysis_id_2: analysisId2,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to compare reports');
  }

  return response.json();
}

// ============================================================================
// DASHBOARD / ANALYTICS ENDPOINTS
// ============================================================================

/**
 * Get Dashboard Overview
 */
export async function getDashboardOverview(): Promise<ApiResponse<{
  repositories: {
    total: number;
    starred: number;
    recent: Repository[];
  };
  scans: {
    total: number;
    active: number;
    completed: number;
    failed: number;
    recent_count: number;
    recent: Analysis[];
  };
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  notifications: {
    unread: number;
  };
}>> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/overview`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch dashboard overview');
  }

  return response.json();
}

/**
 * Get Analytics
 */
export async function getAnalytics(params?: {
  timeRange?: '7d' | '30d' | '90d' | '1y';
  groupBy?: 'day' | 'week' | 'month';
}): Promise<ApiResponse<{
  timeRange: string;
  vulnerabilitiesByTime: any[];
  vulnerabilitiesBySeverity: any[];
  topAffectedRepositories: any[];
}>> {
  const searchParams = new URLSearchParams();
  if (params?.timeRange) searchParams.append('timeRange', params.timeRange);
  if (params?.groupBy) searchParams.append('groupBy', params.groupBy);

  const response = await fetch(`${API_BASE_URL}/api/dashboard/analytics?${searchParams}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch analytics');
  }

  return response.json();
}

// WebSocket Connection

export interface AnalysisCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onAnalysisStarted?: (data: { analysis_id: number; room: string; message: string }) => void;
  onProgress?: (data: ProgressUpdate) => void;
  onIntermediateResult?: (data: IntermediateResult) => void;
  onComplete?: (data: AnalysisComplete) => void;
  onError?: (data: { message: string; details?: string; stage?: string }) => void;
  // New agent-specific callbacks
  onAgentThought?: (data: { thought: string; timestamp: string }) => void;
  onAgentAction?: (data: { action: string; tool: string; args?: any; timestamp: string }) => void;
  onAgentResponse?: (data: { response: string; full_response: string; timestamp: string }) => void;
  onToolResult?: (data: { tool: string; result_preview: string; timestamp: string }) => void;
  onRepoAnalysis?: (data: { data: any; timestamp: string }) => void;
  onCVEDiscovered?: (data: { cves: any[]; total_count: number; timestamp: string }) => void;
  onReportGenerated?: (data: { report_type: string; report_path?: string; timestamp: string }) => void;
  onFindingValidated?: (data: { finding: any; timestamp: string }) => void;
}

/**
 * Connect to Analysis WebSocket - Real-time updates
 */
export function connectToAnalysis(analysisId: number, callbacks: AnalysisCallbacks): Socket {
  const socket = io(`${WS_URL}/analysis`, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Connection events
  socket.on('connect', () => {
    console.log('✅ Connected to analysis agent');
    callbacks.onConnect?.();
    
    // Start the analysis
    socket.emit('start_analysis', { analysis_id: analysisId });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from analysis agent');
    callbacks.onDisconnect?.();
  });

  socket.on('connected', (data) => {
    console.log('📡 Connected to namespace:', data);
  });

  // Analysis events
  socket.on('analysis_started', (data) => {
    console.log('🚀 Analysis started:', data);
    callbacks.onAnalysisStarted?.(data);
  });

  socket.on('progress_update', (data: ProgressUpdate) => {
    console.log(`⚡ ${data.progress}% - ${data.stage}: ${data.message}`);
    callbacks.onProgress?.(data);
  });

  socket.on('intermediate_result', (data: IntermediateResult) => {
    console.log('📦 Intermediate result:', data);
    callbacks.onIntermediateResult?.(data);
  });

  socket.on('analysis_complete', (data: AnalysisComplete) => {
    console.log('🎉 Analysis complete!', data);
    callbacks.onComplete?.(data);
  });

  socket.on('error', (data) => {
    console.error('❌ Error:', data);
    callbacks.onError?.(data);
  });
  
  // New event for analysis failures with detailed information
  socket.on('analysis_failed', (data) => {
    console.error('🔴 Analysis Failed:', data);
    console.error('Error:', data.error);
    console.error('Details:', data.details);
    console.error('Recommendations:', data.recommendations);
    callbacks.onError?.(data);
  });

  // New agent-specific events
  socket.on('agent_thought', (data) => {
    console.log('💭 Agent thought:', data.thought?.substring(0, 100));
    callbacks.onAgentThought?.(data);
  });

  socket.on('agent_action', (data) => {
    console.log('🔧 Agent calling tool:', data.tool);
    callbacks.onAgentAction?.(data);
  });

  socket.on('agent_response', (data) => {
    console.log('💬 Agent response:', data.response?.substring(0, 100));
    callbacks.onAgentResponse?.(data);
  });

  socket.on('tool_result', (data) => {
    console.log('✅ Tool result from:', data.tool);
    callbacks.onToolResult?.(data);
  });

  socket.on('repo_analysis', (data) => {
    console.log('📊 Repository analysis:', data);
    callbacks.onRepoAnalysis?.(data);
  });

  socket.on('cve_discovered', (data) => {
    console.log('🔍 CVEs discovered:', data.total_count);
    callbacks.onCVEDiscovered?.(data);
  });

  socket.on('report_generated', (data) => {
    console.log('📄 Report generated:', data.report_type);
    callbacks.onReportGenerated?.(data);
  });

  socket.on('finding_validated', (data) => {
    console.log('✅ Finding validated:', data.finding?.cve_id);
    callbacks.onFindingValidated?.(data);
  });

  return socket;
}

/**
 * Disconnect WebSocket
 */
export function disconnectSocket(socket: Socket): void {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}

// Helper Functions

/**
 * Extract GitHub URL from text
 */
export function extractGitHubUrl(text: string): string | null {
  const patterns = [
    /https?:\/\/github\.com\/[\w-]+\/[\w.-]+/gi,
    /github\.com\/[\w-]+\/[\w.-]+/gi,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let url = match[0];
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      // Remove trailing slash and .git
      url = url.replace(/\/$/, '').replace(/\.git$/, '');
      return url;
    }
  }

  return null;
}

/**
 * Format analysis type description
 */
export function getAnalysisTypeDescription(type: AnalysisType): string {
  const descriptions = {
    SHORT: 'Quick Scan (2-3 minutes) - Fast vulnerability detection without AI validation',
    MEDIUM: 'Standard Audit (5-10 minutes) - Balanced scan with GPT-4 validation',
    HARD: 'Deep Scan (15-40 minutes) - Comprehensive enterprise-grade security assessment',
  };
  return descriptions[type];
}

/**
 * Get stage description
 */
export function getStageDescription(stage: string): string {
  const descriptions: Record<string, string> = {
    cloning: 'Cloning repository from GitHub...',
    chunking: 'Parsing and chunking code files...',
    indexing: 'Creating searchable codebase index with FAISS...',
    cve_search: 'Searching CVE database for relevant vulnerabilities...',
    decomposition: 'Decomposing CVE queries using AI (Hype)...',
    code_search: 'Searching codebase for vulnerability patterns...',
    matching: 'Matching CVEs to code locations...',
    validating: 'Validating findings with GPT-4.1...',
    finalizing: 'Generating reports and finalizing results...',
    completed: 'Analysis completed successfully!',
  };
  return descriptions[stage] || stage;
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: Severity): string {
  const colors: Record<Severity, string> = {
    CRITICAL: 'text-red-600 bg-red-100 dark:bg-red-950',
    HIGH: 'text-orange-600 bg-orange-100 dark:bg-orange-950',
    MEDIUM: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950',
    LOW: 'text-blue-600 bg-blue-100 dark:bg-blue-950',
  };
  return colors[severity] || 'text-gray-600 bg-gray-100';
}

/**
 * Format duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format relative time
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

export default {
  // Core Analysis
  healthCheck,
  createAnalysis,
  getAnalysis,
  getAnalysisResults,
  listAnalyses,
  connectToAnalysis,
  disconnectSocket,
  
  // Authentication
  login,
  register,
  refreshToken,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  setAuthToken,
  getAuthToken,
  
  // Repositories
  getRepositories,
  getRepository,
  addRepository,
  updateRepository,
  deleteRepository,
  triggerScan,
  getScanStatus,
  
  // Reports
  getReports,
  getReport,
  exportReport,
  compareReports,
  
  // Chat
  sendChatMessage,
  getChatHistory,
  streamChatResponse,
  
  // User Profile
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  getUserSettings,
  updateUserSettings,
  changePassword,
  
  // Notifications
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  
  // Dashboard
  getDashboardOverview,
  getAnalytics,
  
  // Helpers
  extractGitHubUrl,
  getAnalysisTypeDescription,
  getStageDescription,
  getSeverityColor,
  formatDuration,
  formatRelativeTime,
};
