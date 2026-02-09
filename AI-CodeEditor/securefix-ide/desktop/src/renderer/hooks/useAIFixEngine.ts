/**
 * useAIFixEngine Hook
 *
 * React hook for integrating the AI Fix Engine service into components.
 * Manages connection status, health monitoring, and service initialization.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getAIFixEngineService, AIFixEngineService } from '../services/AIFixEngineService';
import { checkBackendHealth, getBackendHealthDetails } from '../services/aiFixEngineConfig';
import type { Vulnerability } from '@securefix/core';

export interface AIFixEngineStatus {
  /** Whether the backend is connected and healthy */
  isConnected: boolean;
  /** Whether we're currently checking the connection */
  isChecking: boolean;
  /** Error message if connection failed */
  error: string | null;
  /** Backend service name (if available) */
  serviceName?: string;
  /** Backend version (if available) */
  version?: string;
  /** Whether LLM is configured on backend */
  llmConfigured?: boolean;
}

export interface UseAIFixEngineResult extends AIFixEngineStatus {
  /** Manually check the backend connection */
  checkConnection: () => Promise<boolean>;
  /** The AI Fix Engine service instance */
  service: AIFixEngineService;
  /** Update the vulnerability cache */
  setVulnerabilities: (vulnerabilities: Vulnerability[]) => void;
}

/**
 * Hook for using the AI Fix Engine in React components
 *
 * @example
 * ```tsx
 * const { isConnected, error, service, setVulnerabilities } = useAIFixEngine();
 *
 * useEffect(() => {
 *   setVulnerabilities(vulnerabilities);
 * }, [vulnerabilities, setVulnerabilities]);
 * ```
 */
export function useAIFixEngine(): UseAIFixEngineResult {
  const [status, setStatus] = useState<AIFixEngineStatus>({
    isConnected: false,
    isChecking: true,
    error: null,
  });

  const serviceRef = useRef<AIFixEngineService | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get or create the service
  const getService = useCallback((): AIFixEngineService => {
    if (!serviceRef.current) {
      serviceRef.current = getAIFixEngineService();
    }
    return serviceRef.current;
  }, []);

  // Check backend connection
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setStatus(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const healthDetails = await getBackendHealthDetails();

      if (healthDetails.healthy) {
        setStatus({
          isConnected: true,
          isChecking: false,
          error: null,
          serviceName: healthDetails.service,
          version: healthDetails.version,
          llmConfigured: healthDetails.llmConfigured,
        });
        return true;
      } else {
        setStatus({
          isConnected: false,
          isChecking: false,
          error: 'AI Fix Engine backend is not running on localhost:8000',
        });
        return false;
      }
    } catch (err) {
      setStatus({
        isConnected: false,
        isChecking: false,
        error: 'Failed to connect to AI Fix Engine backend',
      });
      return false;
    }
  }, []);

  // Set vulnerabilities on the service
  const setVulnerabilities = useCallback((vulnerabilities: Vulnerability[]) => {
    getService().setVulnerabilities(vulnerabilities);
  }, [getService]);

  // Initialize on mount
  useEffect(() => {
    const service = getService();

    // Initialize the service
    service.initialize().then(() => {
      // Check initial connection
      checkConnection();
    }).catch(console.error);

    // Set up periodic health check (every 30 seconds)
    healthCheckIntervalRef.current = setInterval(() => {
      checkBackendHealth().then(healthy => {
        setStatus(prev => ({
          ...prev,
          isConnected: healthy,
          error: healthy ? null : 'AI Fix Engine backend connection lost',
        }));
      });
    }, 30000);

    // Cleanup on unmount
    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [getService, checkConnection]);

  return {
    ...status,
    checkConnection,
    service: getService(),
    setVulnerabilities,
  };
}

export default useAIFixEngine;
