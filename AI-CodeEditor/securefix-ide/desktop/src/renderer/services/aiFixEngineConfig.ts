/**
 * AI Fix Engine Configuration
 *
 * Configuration for connecting to the SecureFix AI Fix Engine backend (FastAPI).
 * Default: http://localhost:8000
 */

export interface AIFixEngineConfig {
  /** Backend HTTP URL */
  httpUrl: string;
  /** Backend WebSocket URL */
  wsUrl: string;
  /** Optional API key for authentication */
  apiKey?: string;
  /** Connection timeout in milliseconds */
  timeout: number;
  /** Number of retry attempts on failure */
  retryAttempts: number;
}

const DEFAULT_CONFIG: AIFixEngineConfig = {
  httpUrl: (import.meta.env.VITE_AI_FIX_ENGINE_URL as string) || 'http://localhost:8000',
  wsUrl: (import.meta.env.VITE_AI_FIX_ENGINE_WS_URL as string) || 'ws://localhost:8000',
  apiKey: import.meta.env.VITE_AI_FIX_ENGINE_API_KEY as string | undefined,
  timeout: 30000,
  retryAttempts: 3,
};

// Singleton configuration instance
let currentConfig: AIFixEngineConfig = { ...DEFAULT_CONFIG };

/**
 * Get the current AI Fix Engine configuration
 */
export function getAIFixEngineConfig(): AIFixEngineConfig {
  return { ...currentConfig };
}

/**
 * Update the AI Fix Engine configuration
 */
export function setAIFixEngineConfig(config: Partial<AIFixEngineConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Check if the AI Fix Engine backend is healthy and running
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${currentConfig.httpUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('[AIFixEngine] Health check failed:', error);
    return false;
  }
}

/**
 * Get backend health details
 */
export async function getBackendHealthDetails(): Promise<{
  healthy: boolean;
  service?: string;
  version?: string;
  llmConfigured?: boolean;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${currentConfig.httpUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        healthy: true,
        service: data.service,
        version: data.version,
        llmConfigured: data.llm_configured,
      };
    }

    return { healthy: false };
  } catch (error) {
    return { healthy: false };
  }
}

export default {
  getConfig: getAIFixEngineConfig,
  setConfig: setAIFixEngineConfig,
  checkHealth: checkBackendHealth,
  getHealthDetails: getBackendHealthDetails,
};
