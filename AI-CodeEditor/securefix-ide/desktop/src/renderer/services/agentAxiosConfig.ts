/**
 * Configuration for Agent-Axios integration
 *
 * This file contains paths and settings for connecting the SecureFix IDE
 * with the main Agent-Axios vulnerability analysis platform.
 *
 * Note: Path-based configurations should be accessed via IPC from the main process.
 * The renderer only uses API endpoints.
 */

export const AgentAxiosConfig = {
  // API Endpoints (when backends are running)
  api: {
    pythonBackend: (import.meta.env.VITE_PYTHON_BACKEND_URL as string) || 'http://localhost:5000',
    nodeBackend: (import.meta.env.VITE_NODE_BACKEND_URL as string) || 'http://localhost:3001',
  },

};

export default AgentAxiosConfig;
