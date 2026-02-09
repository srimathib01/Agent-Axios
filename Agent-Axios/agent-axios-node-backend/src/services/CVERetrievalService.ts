/**
 * CVE Retrieval Service
 * Client for the external FAISS CVE Storage API
 */

import axios, { AxiosInstance } from 'axios';
import settings from '../config/settings';
import logger from '../utils/logger';

export interface CVE {
  cve_id: string;
  cvss_score?: number;
  summary?: string;
  description?: string;
  score?: number;
  published_date?: string;
  [key: string]: any;
}

export interface SearchOptions {
  limit?: number;
  minCvss?: number;
  expandQuery?: boolean;
}

export class CVERetrievalService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = settings.cveService.baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info(`CVE Retrieval Service initialized with base URL: ${this.baseUrl}`);
  }

  /**
   * Initialize and check service health
   */
  async initialize(): Promise<boolean> {
    try {
      // Test connection with a simple search
      const response = await this.client.get('/health', {
        timeout: 5000,
      });

      logger.info('✓ CVE Retrieval Service is healthy');
      return true;
    } catch (error: any) {
      logger.error(`CVE service health check failed: ${error.message}`);
      
      // Service might not have a health endpoint, try a test search instead
      try {
        await this.searchByText('test', { limit: 1 });
        logger.info('✓ CVE Retrieval Service initialized (via test search)');
        return true;
      } catch (searchError: any) {
        logger.error(`CVE service test search failed: ${searchError.message}`);
        return false;
      }
    }
  }

  /**
   * Search CVEs by text query
   */
  async searchByText(
    query: string,
    options: SearchOptions = {}
  ): Promise<{ results: CVE[]; error?: string }> {
    try {
      const { limit = 10, minCvss = 0.0, expandQuery = false } = options;

      logger.info(`Searching CVE database: ${query.substring(0, 100)}`);

      const response = await this.client.post('/search', {
        query,
        limit,
        min_cvss: minCvss,
        expand_query: expandQuery,
      });

      const results = response.data.results || response.data.data || [];

      logger.info(`✓ Found ${results.length} CVEs`);

      return {
        results,
      };
    } catch (error: any) {
      logger.error(`CVE search failed: ${error.message}`);

      return {
        results: [],
        error: error.message,
      };
    }
  }

  /**
   * Fetch a specific CVE by ID
   */
  async fetchCVEById(cveId: string): Promise<CVE | null> {
    try {
      logger.info(`Fetching CVE: ${cveId}`);

      const response = await this.client.get(`/cve/${cveId}`);

      return response.data;
    } catch (error: any) {
      logger.error(`Failed to fetch CVE ${cveId}: ${error.message}`);
      return null;
    }
  }
}
