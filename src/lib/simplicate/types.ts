/**
 * Simplicate Type Definitions
 */

export type {
  SimplicateConfig,
  SimplicateProject,
  SimplicateEmployee,
  SimplicateHours,
  SimplicateDocument,
  SimplicateInvoice,
} from './client';

// Additional utility types
export interface WebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: string;
}

export interface ProjectSyncResult {
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ projectId: string; error: string }>;
}
