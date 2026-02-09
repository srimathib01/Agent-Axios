/**
 * Code context types for AI fix generation
 * Provides rich context to improve fix quality
 */

export interface CodeContext {
  fileUri: string;
  language: string;
  startLine: number;
  endLine: number;
  vulnerableCode: string;
  surroundingCode: string;
  imports: string[];
  classOrFunctionContext?: string;
  framework?: FrameworkInfo;
}

export interface FrameworkInfo {
  name: string;           // e.g., "Django", "Express", "Spring"
  version?: string;
  securityPatterns: string[];  // Framework-specific security recommendations
}

export interface FileContext {
  fileUri: string;
  fileName: string;
  language: string;
  totalLines: number;
  content: string;
  imports: ImportInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
}

export interface ImportInfo {
  module: string;
  imports: string[];
  line: number;
  isRelative: boolean;
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
}

export interface ClassInfo {
  name: string;
  startLine: number;
  endLine: number;
  methods: FunctionInfo[];
  properties: string[];
}

export function detectLanguage(fileUri: string): string {
  const extension = fileUri.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    'py': 'python',
    'js': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescriptreact',
    'jsx': 'javascriptreact',
    'java': 'java',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'php': 'php',
    'cs': 'csharp',
    'cpp': 'cpp',
    'c': 'c',
    'swift': 'swift',
    'kt': 'kotlin'
  };
  return languageMap[extension] || 'plaintext';
}

export function detectFramework(imports: string[], language: string): FrameworkInfo | undefined {
  const frameworkPatterns: Record<string, { pattern: RegExp; info: FrameworkInfo }[]> = {
    python: [
      {
        pattern: /django/i,
        info: {
          name: 'Django',
          securityPatterns: [
            'Use Django ORM instead of raw SQL',
            'Use CSRF tokens for forms',
            'Sanitize user input with escape filters'
          ]
        }
      },
      {
        pattern: /flask/i,
        info: {
          name: 'Flask',
          securityPatterns: [
            'Use parameterized queries with SQLAlchemy',
            'Enable CSRF protection',
            'Use Werkzeug security helpers'
          ]
        }
      },
      {
        pattern: /fastapi/i,
        info: {
          name: 'FastAPI',
          securityPatterns: [
            'Use Pydantic models for input validation',
            'Use dependency injection for auth',
            'Enable CORS properly'
          ]
        }
      }
    ],
    javascript: [
      {
        pattern: /express/i,
        info: {
          name: 'Express',
          securityPatterns: [
            'Use helmet middleware for security headers',
            'Use parameterized queries',
            'Sanitize user input'
          ]
        }
      },
      {
        pattern: /react/i,
        info: {
          name: 'React',
          securityPatterns: [
            'Avoid dangerouslySetInnerHTML',
            'Sanitize user input before rendering',
            'Use Content Security Policy'
          ]
        }
      }
    ],
    java: [
      {
        pattern: /springframework|spring/i,
        info: {
          name: 'Spring',
          securityPatterns: [
            'Use Spring Security for authentication',
            'Use JPA/Hibernate instead of raw SQL',
            'Enable CSRF protection'
          ]
        }
      }
    ]
  };

  const patterns = frameworkPatterns[language] || [];
  const importsStr = imports.join(' ');

  for (const { pattern, info } of patterns) {
    if (pattern.test(importsStr)) {
      return info;
    }
  }

  return undefined;
}
