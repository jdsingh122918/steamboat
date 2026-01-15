/**
 * AI Agents Module
 *
 * Exports all agent-related functionality for the Steamboat app.
 */

// Configuration
export {
  AgentModel,
  type AgentModelType,
  getAgentConfig,
  createAgentClient,
  getModelConfig,
  calculateCost,
  getRecommendedModel,
  type AgentConfig,
} from './config';

// Types
export {
  AgentRole,
  AgentStatus,
  type AgentRoleType,
  type AgentStatusType,
  type AgentContext,
  type AgentResponse,
  type AgentResult,
  type ToolCall,
  type ToolResult,
  type TokenUsage,
  type ExtractedExpenseData,
  type PaymentSplit,
  type SettlementSuggestion,
  type ActivityRecommendation,
  type PollAnalysis,
  type MediaOrganization,
  createAgentContext,
  createSuccessResult,
  createErrorResult,
  isSuccessResult,
  isErrorResult,
} from './types';

// Prompts
export {
  getSystemPrompt,
  buildUserPrompt,
  PromptTemplate,
  RECEIPT_PROCESSOR_PROMPT,
  PAYMENT_ASSISTANT_PROMPT,
  EXPENSE_RECONCILER_PROMPT,
  GALLERY_ORGANIZER_PROMPT,
  ACTIVITY_RECOMMENDER_PROMPT,
  POLL_DECISION_PROMPT,
} from './prompts';

// Cost Tracking
export {
  CostTracker,
  type CostEntry,
  type CostSummary,
  type UsageInput,
  calculateModelCost,
  formatCost,
  getGlobalCostTracker,
  resetGlobalCostTracker,
} from './cost-tracker';

// Agents
export {
  ReceiptProcessor,
  parseReceiptResponse,
  validateExtractedData,
  type ProcessReceiptInput,
  type ValidationResult,
} from './receipt-processor';

export {
  PaymentAssistant,
  parsePaymentResponse,
  calculateOptimalSettlements,
  type CalculateSplitInput,
  type SplitResult,
  type SuggestSettlementsInput,
  type SettlementsResult,
} from './payment-assistant';

export {
  ExpenseReconciler,
  analyzeExpenses,
  findDuplicates,
  type ExpenseRecord,
  type ReconcileInput,
  type Discrepancy,
  type ReconciliationResult,
  type ExpenseAnalysis,
} from './expense-reconciler';

export {
  GalleryOrganizer,
  groupMediaByDate,
  type MediaItem,
  type OrganizeInput,
  type OrganizationResult,
} from './gallery-organizer';

export {
  ActivityRecommender,
  type RecommendInput,
  type RecommendationResult,
} from './activity-recommender';

export {
  PollDecisionAgent,
  calculateVoteStats,
  type AnalyzePollInput,
  type VoteStats,
} from './poll-decision';
