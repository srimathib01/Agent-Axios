/**
 * Mock Data Generator for Agent Axios
 * Provides realistic security analysis data without backend dependencies
 */

import type { 
  User, 
  Repository, 
  Analysis, 
  CVEFinding, 
  Severity, 
  AnalysisStatus,
  ValidationStatus,
  AnalysisType 
} from './api';

// CVE Database
const CVE_DATABASE = [
  { id: 'CVE-2024-1234', description: 'SQL Injection vulnerability in database query construction', severity: 'CRITICAL' as Severity },
  { id: 'CVE-2024-5678', description: 'Cross-Site Scripting (XSS) in user input handling', severity: 'HIGH' as Severity },
  { id: 'CVE-2024-9012', description: 'Insecure deserialization in API endpoint', severity: 'CRITICAL' as Severity },
  { id: 'CVE-2023-4567', description: 'Authentication bypass in login mechanism', severity: 'CRITICAL' as Severity },
  { id: 'CVE-2023-8901', description: 'Directory traversal in file upload functionality', severity: 'HIGH' as Severity },
  { id: 'CVE-2023-2345', description: 'Weak cryptographic algorithm usage', severity: 'MEDIUM' as Severity },
  { id: 'CVE-2023-6789', description: 'Insufficient input validation in API parameters', severity: 'MEDIUM' as Severity },
  { id: 'CVE-2024-3456', description: 'XML External Entity (XXE) injection vulnerability', severity: 'HIGH' as Severity },
  { id: 'CVE-2024-7890', description: 'Server-Side Request Forgery (SSRF) in webhook handler', severity: 'HIGH' as Severity },
  { id: 'CVE-2023-1122', description: 'Insecure direct object reference in API', severity: 'MEDIUM' as Severity },
  { id: 'CVE-2023-3344', description: 'Missing rate limiting on authentication endpoints', severity: 'MEDIUM' as Severity },
  { id: 'CVE-2024-5566', description: 'Command injection in system call execution', severity: 'CRITICAL' as Severity },
  { id: 'CVE-2024-7788', description: 'Insecure random number generation', severity: 'LOW' as Severity },
  { id: 'CVE-2023-9900', description: 'Hardcoded credentials in configuration file', severity: 'CRITICAL' as Severity },
  { id: 'CVE-2023-2211', description: 'Missing authentication on sensitive endpoints', severity: 'CRITICAL' as Severity },
  { id: 'CVE-2024-4433', description: 'Improper certificate validation', severity: 'HIGH' as Severity },
  { id: 'CVE-2024-6655', description: 'Use of vulnerable third-party library', severity: 'HIGH' as Severity },
  { id: 'CVE-2023-8877', description: 'Information disclosure through error messages', severity: 'LOW' as Severity },
  { id: 'CVE-2023-1199', description: 'Cross-Site Request Forgery (CSRF) protection missing', severity: 'MEDIUM' as Severity },
  { id: 'CVE-2024-2288', description: 'Buffer overflow in string processing', severity: 'HIGH' as Severity },
];

const FILE_PATHS = [
  'src/auth/login.ts',
  'src/api/users.ts',
  'src/database/query.ts',
  'src/utils/crypto.ts',
  'src/middleware/auth.ts',
  'src/services/payment.ts',
  'src/controllers/upload.ts',
  'src/models/user.ts',
  'src/routes/api.ts',
  'src/config/database.ts',
  'src/lib/validation.ts',
  'src/services/webhook.ts',
  'src/utils/file.ts',
  'src/api/admin.ts',
  'src/services/email.ts',
  'config/secrets.json',
  'src/handlers/xml.ts',
  'src/lib/crypto.ts',
  'src/middleware/cors.ts',
  'src/services/external.ts',
];

const REPO_NAMES = [
  { name: 'payment-gateway', desc: 'Secure payment processing service', lang: 'TypeScript' },
  { name: 'user-management', desc: 'User authentication and authorization system', lang: 'Python' },
  { name: 'api-server', desc: 'REST API backend service', lang: 'Node.js' },
  { name: 'data-processor', desc: 'Background job processing service', lang: 'Java' },
  { name: 'web-dashboard', desc: 'Administrative web interface', lang: 'React' },
  { name: 'notification-service', desc: 'Real-time notification delivery', lang: 'Go' },
  { name: 'analytics-engine', desc: 'Data analytics and reporting', lang: 'Python' },
  { name: 'file-storage', desc: 'Distributed file storage system', lang: 'Rust' },
];

// Helper Functions
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): string {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

// Mock Data Storage
class MockDataStore {
  private users: Map<string, User> = new Map();
  private repositories: Map<string, Repository> = new Map();
  private analyses: Map<number, Analysis> = new Map();
  private findings: Map<number, CVEFinding[]> = new Map();
  private chatMessages: Map<number, any[]> = new Map();
  private currentUserId: string | null = null;
  private analysisCounter = 1;
  private findingCounter = 1;

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Create default user
    const defaultUser: User = {
      id: 'user_1',
      email: 'admin@agentaxios.com',
      firstName: 'Alex',
      lastName: 'Johnson',
      company: 'TechCorp',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
      role: 'Security Engineer',
      createdAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set('admin@agentaxios.com', defaultUser);

    // Create repositories
    REPO_NAMES.forEach((repo, idx) => {
      const repository: Repository = {
        id: `repo_${idx + 1}`,
        name: repo.name,
        url: `https://github.com/company/${repo.name}`,
        fullName: `company/${repo.name}`,
        description: repo.desc,
        language: repo.lang,
        defaultBranch: 'main',
        branches: randomInt(3, 15),
        stars: randomInt(10, 1000),
        forks: randomInt(5, 200),
        lastScan: randomDate(new Date('2024-10-01'), new Date()),
        nextScan: new Date(Date.now() + 86400000 * randomInt(1, 7)).toISOString(),
        starred: Math.random() > 0.5,
        status: randomElement(['healthy', 'warning', 'critical'] as const),
        vulnerabilities: {
          critical: randomInt(0, 5),
          high: randomInt(0, 10),
          medium: randomInt(0, 15),
          low: randomInt(0, 20),
          total: 0,
        },
        scanFrequency: randomElement(['daily', 'weekly', 'monthly'] as const),
        autoScan: Math.random() > 0.3,
        createdAt: randomDate(new Date('2024-01-01'), new Date('2024-06-01')),
        updatedAt: new Date().toISOString(),
      };
      repository.vulnerabilities.total = 
        repository.vulnerabilities.critical +
        repository.vulnerabilities.high +
        repository.vulnerabilities.medium +
        repository.vulnerabilities.low;
      
      this.repositories.set(repository.id, repository);
    });

    // Create some completed analyses
    this.repositories.forEach(repo => {
      const numAnalyses = randomInt(2, 5);
      for (let i = 0; i < numAnalyses; i++) {
        this.createAnalysis(repo.url, randomElement(['SHORT', 'MEDIUM', 'HARD'] as AnalysisType[]), true);
      }
    });
  }

  // Authentication
  login(email: string, password: string): User | null {
    const user = this.users.get(email);
    // In mock mode, accept any non-empty password for registered users
    if (user && password && password.trim().length > 0) {
      this.currentUserId = user.id;
      return user;
    }
    return null;
  }

  register(email: string, password: string, firstName: string, lastName: string, company?: string): User {
    const userId = `user_${this.users.size + 1}`;
    const user: User = {
      id: userId,
      email,
      firstName,
      lastName,
      company,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}`,
      role: 'Security Analyst',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(email, user);
    this.currentUserId = userId;
    return user;
  }

  getCurrentUser(): User | null {
    if (!this.currentUserId) return null;
    for (const user of this.users.values()) {
      if (user.id === this.currentUserId) return user;
    }
    return null;
  }

  logout() {
    this.currentUserId = null;
  }

  // Repositories
  getRepositories(): Repository[] {
    return Array.from(this.repositories.values());
  }

  getRepository(id: string): Repository | null {
    return this.repositories.get(id) || null;
  }

  addRepository(url: string): Repository {
    const repoName = url.split('/').pop() || 'unknown';
    const repoInfo = REPO_NAMES[randomInt(0, REPO_NAMES.length - 1)];
    
    const repository: Repository = {
      id: `repo_${this.repositories.size + 1}`,
      name: repoName,
      url,
      fullName: `github/${repoName}`,
      description: repoInfo.desc,
      language: repoInfo.lang,
      defaultBranch: 'main',
      branches: randomInt(3, 15),
      stars: randomInt(10, 1000),
      forks: randomInt(5, 200),
      starred: false,
      status: 'pending',
      vulnerabilities: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
      },
      scanFrequency: 'weekly',
      autoScan: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.repositories.set(repository.id, repository);
    return repository;
  }

  updateRepository(id: string, updates: Partial<Repository>): Repository | null {
    const repo = this.repositories.get(id);
    if (!repo) return null;
    
    const updated = { ...repo, ...updates, updatedAt: new Date().toISOString() };
    this.repositories.set(id, updated);
    return updated;
  }

  deleteRepository(id: string): boolean {
    return this.repositories.delete(id);
  }

  // Analyses
  createAnalysis(repoUrl: string, analysisType: AnalysisType, autoComplete = false): Analysis {
    const analysisId = this.analysisCounter++;
    const totalFiles = randomInt(50, 500);
    const totalChunks = totalFiles * randomInt(3, 10);
    
    const analysis: Analysis = {
      analysis_id: analysisId,
      repo_url: repoUrl,
      analysis_type: analysisType,
      status: autoComplete ? 'completed' : 'pending',
      start_time: autoComplete ? randomDate(new Date(Date.now() - 86400000 * 7), new Date()) : new Date().toISOString(),
      end_time: autoComplete ? new Date().toISOString() : null,
      config: {
        deep_scan: analysisType === 'HARD',
        include_dependencies: true,
        max_depth: analysisType === 'SHORT' ? 3 : analysisType === 'MEDIUM' ? 5 : 10,
      },
      error_message: null,
      total_files: totalFiles,
      total_chunks: totalChunks,
      total_findings: 0,
      created_at: autoComplete ? randomDate(new Date(Date.now() - 86400000 * 7), new Date()) : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.analyses.set(analysisId, analysis);

    // Generate findings for completed analyses
    if (autoComplete) {
      this.generateFindings(analysisId, analysisType);
    }

    return analysis;
  }

  private generateFindings(analysisId: number, analysisType: AnalysisType) {
    const numFindings = analysisType === 'SHORT' ? randomInt(5, 15) :
                       analysisType === 'MEDIUM' ? randomInt(15, 30) :
                       randomInt(30, 50);

    const findings: CVEFinding[] = [];
    
    for (let i = 0; i < numFindings; i++) {
      const cve = randomElement(CVE_DATABASE);
      const validationStatus = randomElement(['confirmed', 'confirmed', 'false_positive', 'needs_review'] as ValidationStatus[]);
      
      const finding: CVEFinding = {
        finding_id: this.findingCounter++,
        analysis_id: analysisId,
        cve_id: cve.id,
        file_path: randomElement(FILE_PATHS),
        chunk_id: randomInt(1, 100),
        severity: cve.severity,
        confidence_score: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
        validation_status: validationStatus,
        validation_explanation: validationStatus === 'confirmed' 
          ? 'Verified vulnerability with potential security impact'
          : validationStatus === 'false_positive'
          ? 'Code pattern matches but context shows safe usage'
          : 'Requires manual review to determine actual risk',
        cve_description: cve.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      findings.push(finding);
    }

    this.findings.set(analysisId, findings);

    // Update analysis
    const analysis = this.analyses.get(analysisId);
    if (analysis) {
      analysis.total_findings = findings.length;
      this.analyses.set(analysisId, analysis);
    }
  }

  getAnalyses(): Analysis[] {
    return Array.from(this.analyses.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getAnalysis(id: number): Analysis | null {
    return this.analyses.get(id) || null;
  }

  updateAnalysisStatus(id: number, status: AnalysisStatus, progress?: number): Analysis | null {
    const analysis = this.analyses.get(id);
    if (!analysis) return null;

    analysis.status = status;
    analysis.updated_at = new Date().toISOString();

    if (status === 'running' && !analysis.start_time) {
      analysis.start_time = new Date().toISOString();
    }

    if (status === 'completed') {
      analysis.end_time = new Date().toISOString();
      if (this.findings.get(id)?.length === 0) {
        this.generateFindings(id, analysis.analysis_type);
      }
    }

    this.analyses.set(id, analysis);
    return analysis;
  }

  getFindings(analysisId: number): CVEFinding[] {
    return this.findings.get(analysisId) || [];
  }

  updateFindingValidation(findingId: number, status: ValidationStatus, explanation?: string): CVEFinding | null {
    for (const findings of this.findings.values()) {
      const finding = findings.find(f => f.finding_id === findingId);
      if (finding) {
        finding.validation_status = status;
        if (explanation) finding.validation_explanation = explanation;
        finding.updated_at = new Date().toISOString();
        return finding;
      }
    }
    return null;
  }

  // Chat Messages
  getChatMessages(analysisId: number): any[] {
    return this.chatMessages.get(analysisId) || [];
  }

  addChatMessage(analysisId: number, message: string, role: 'user' | 'assistant'): any {
    const messages = this.chatMessages.get(analysisId) || [];
    const newMessage = {
      id: `msg_${messages.length + 1}`,
      role,
      content: message,
      timestamp: new Date().toISOString(),
    };
    messages.push(newMessage);
    this.chatMessages.set(analysisId, messages);
    return newMessage;
  }

  generateAIResponse(analysisId: number, userMessage: string): string {
    const analysis = this.analyses.get(analysisId);
    const findings = this.findings.get(analysisId) || [];

    // Simple keyword-based responses
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('summary') || lowerMessage.includes('overview')) {
      const critical = findings.filter(f => f.severity === 'CRITICAL').length;
      const high = findings.filter(f => f.severity === 'HIGH').length;
      return `I've analyzed the repository and found ${findings.length} potential vulnerabilities: ${critical} critical, ${high} high severity issues. The most concerning findings relate to authentication and input validation. Would you like me to explain any specific vulnerability?`;
    }

    if (lowerMessage.includes('critical') || lowerMessage.includes('severe')) {
      const critical = findings.filter(f => f.severity === 'CRITICAL');
      if (critical.length > 0) {
        return `There are ${critical.length} critical vulnerabilities detected. The most severe is ${critical[0].cve_id} in ${critical[0].file_path}: ${critical[0].cve_description}. I recommend prioritizing this for immediate remediation.`;
      }
      return 'No critical vulnerabilities were detected in this analysis.';
    }

    if (lowerMessage.includes('fix') || lowerMessage.includes('remediate')) {
      return 'To remediate these vulnerabilities, I recommend: 1) Update all dependencies to latest secure versions, 2) Implement input validation and sanitization, 3) Add authentication checks on sensitive endpoints, 4) Enable security headers and CSRF protection. Would you like specific code examples?';
    }

    if (lowerMessage.includes('false positive')) {
      return 'To mark findings as false positives, review each vulnerability in context. Common false positives occur when security patterns are detected but proper validation exists elsewhere in the code flow. Use the validation status feature to mark and track these.';
    }

    // Default response
    return `Based on the analysis of ${analysis?.repo_url || 'this repository'}, I can help you understand the ${findings.length} findings, explain specific vulnerabilities, suggest remediation strategies, or dive deeper into any security concern. What would you like to know more about?`;
  }

  // Statistics
  getDashboardStats() {
    const allFindings = Array.from(this.findings.values()).flat();
    const analyses = Array.from(this.analyses.values());
    
    return {
      totalRepositories: this.repositories.size,
      totalScans: analyses.length,
      activeScans: analyses.filter(a => a.status === 'running').length,
      totalVulnerabilities: allFindings.length,
      criticalVulnerabilities: allFindings.filter(f => f.severity === 'CRITICAL' && f.validation_status === 'confirmed').length,
      recentActivity: analyses.slice(0, 10).map(a => ({
        id: a.analysis_id,
        type: 'scan',
        repository: a.repo_url.split('/').pop(),
        status: a.status,
        timestamp: a.updated_at,
      })),
    };
  }
}

// Singleton instance
export const mockDataStore = new MockDataStore();
