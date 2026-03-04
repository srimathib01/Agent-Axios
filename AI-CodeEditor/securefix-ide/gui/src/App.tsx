import { useEffect } from 'react';
import { useMessaging } from './hooks/useMessaging';
import { store } from './store';
import { setVulnerabilities } from './store/vulnerabilitySlice';
import MainView from './pages/MainView';

// Demo vulnerabilities for testing when no core/extension layer is connected
const DEMO_VULNERABILITIES = [
  {
    id: 'vuln-001',
    title: 'SQL Injection in User Login',
    description: 'User input is directly concatenated into SQL query string without parameterization, allowing an attacker to inject arbitrary SQL commands.',
    severity: 'critical' as const,
    location: {
      fileUri: 'src/auth/login.js',
      startLine: 42,
      endLine: 45,
    },
    cwe: {
      id: 'CWE-89',
      name: 'SQL Injection',
      description: 'The software constructs all or part of an SQL command using externally-influenced input from an upstream component.',
      url: 'https://cwe.mitre.org/data/definitions/89.html',
    },
    owasp: {
      category: 'A03:2021',
      name: 'Injection',
      url: 'https://owasp.org/Top10/A03_2021-Injection/',
    },
    codeSnippet: `const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
const result = db.execute(query);`,
    recommendation: 'Use parameterized queries or prepared statements instead of string concatenation.',
    status: 'open' as const,
  },
  {
    id: 'vuln-002',
    title: 'Cross-Site Scripting (XSS) in Comment Display',
    description: 'User-submitted comments are rendered as raw HTML without sanitization, enabling stored XSS attacks.',
    severity: 'high' as const,
    location: {
      fileUri: 'src/components/CommentList.jsx',
      startLine: 18,
      endLine: 20,
    },
    cwe: {
      id: 'CWE-79',
      name: 'Cross-site Scripting (XSS)',
      description: 'The software does not neutralize or incorrectly neutralizes user-controllable input before it is placed in output.',
      url: 'https://cwe.mitre.org/data/definitions/79.html',
    },
    owasp: {
      category: 'A07:2021',
      name: 'Cross-Site Scripting',
      url: 'https://owasp.org/Top10/A07_2021/',
    },
    codeSnippet: `<div dangerouslySetInnerHTML={{ __html: comment.body }} />`,
    recommendation: 'Sanitize HTML content using DOMPurify or use textContent instead of innerHTML.',
    status: 'open' as const,
  },
  {
    id: 'vuln-003',
    title: 'Hardcoded API Secret Key',
    description: 'API secret key is hardcoded directly in the source code, which can be exposed in version control.',
    severity: 'medium' as const,
    location: {
      fileUri: 'src/config/api.js',
      startLine: 5,
      endLine: 5,
    },
    cwe: {
      id: 'CWE-798',
      name: 'Use of Hard-coded Credentials',
      description: 'The software contains hard-coded credentials, such as a password or cryptographic key.',
      url: 'https://cwe.mitre.org/data/definitions/798.html',
    },
    codeSnippet: `const API_SECRET = "sk-abc123def456ghi789jkl012mno345pqr678";`,
    recommendation: 'Store secrets in environment variables or a secrets manager, never in source code.',
    status: 'open' as const,
  },
];

function App() {
  const { sendMessage, isReady } = useMessaging();

  useEffect(() => {
    // Send gui_ready message when component mounts
    if (isReady) {
      sendMessage({
        type: 'gui_ready',
        id: `msg-${Date.now()}`,
        timestamp: Date.now()
      });
    }
  }, [isReady, sendMessage]);

  // Load demo vulnerabilities if store is empty after a short delay
  // (gives the core/extension layer time to send real data first)
  useEffect(() => {
    const timer = setTimeout(() => {
      const state = store.getState();
      if (state.vulnerabilities.items.length === 0) {
        console.log('[GUI] No vulnerabilities from core layer, loading demo data');
        store.dispatch(setVulnerabilities(DEMO_VULNERABILITIES));
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen w-full overflow-hidden">
      <MainView />
    </div>
  );
}

export default App;
