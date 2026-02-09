/**
 * Agent Tools Index
 * Exports all tools for the LangGraph agent
 */

import { ConversationSession } from '../agent/ConversationSession';
import { createAnalyzeRepositoryStructureTool } from './repositoryAnalysis';
import { createReadFileContentTool, createListDirectoryContentsTool } from './fileOperations';
import { createSearchCodebaseSemanticallTool } from './codebaseSearch';
import { createSearchCVEDatabaseTool } from './cveSearch';
import { createValidateVulnerabilityMatchTool } from './validation';
import { createRecordFindingTool } from './findingRecord';
import { createGenerateVulnerabilityReportTool } from './reportGeneration';
import { createCloneRepositoryTool } from './cloneRepository';
import { createBuildIndexTool } from './buildIndex';

/**
 * Get all tools for the agent
 */
export function getAllTools(conversationSession: ConversationSession) {
  return [
    // STEP 1: Repository Setup (MUST BE FIRST)
    createCloneRepositoryTool(),
    createBuildIndexTool(),
    
    // STEP 2: Repository Exploration
    createAnalyzeRepositoryStructureTool(conversationSession),
    createListDirectoryContentsTool(conversationSession),
    createReadFileContentTool(conversationSession),
    
    // STEP 3: Vulnerability Analysis
    createSearchCodebaseSemanticallTool(conversationSession),
    createSearchCVEDatabaseTool(conversationSession),
    createValidateVulnerabilityMatchTool(conversationSession),
    
    // STEP 4: Results & Reporting
    createRecordFindingTool(conversationSession),
    createGenerateVulnerabilityReportTool(conversationSession),
  ];
}

// Export individual tool creators
export {
  createAnalyzeRepositoryStructureTool,
  createReadFileContentTool,
  createListDirectoryContentsTool,
  createSearchCodebaseSemanticallTool,
  createSearchCVEDatabaseTool,
  createValidateVulnerabilityMatchTool,
  createRecordFindingTool,
  createGenerateVulnerabilityReportTool,
};

// Export context setters
export { setRepoPath, getRepoPath } from './repositoryAnalysis';
export { setIndexingService } from './codebaseSearch';
export { setCVEService } from './cveSearch';
export { setValidationService } from './validation';
export { setAnalysisContext, getAnalysisContext, setRepoContext, getRepoContext, getIndexingService, clearAllContexts } from './context';
export { setPDFGenerator } from './reportGeneration';
