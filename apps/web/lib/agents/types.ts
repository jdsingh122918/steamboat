/**
 * Agent Types
 *
 * Shared types and utilities for AI agents.
 * Provides type-safe structures for agent communication and results.
 */

import { v4 as uuidv4 } from 'uuid';

// Agent roles for different AI assistants
export const AgentRole = {
  RECEIPT_PROCESSOR: 'receipt_processor',
  PAYMENT_ASSISTANT: 'payment_assistant',
  EXPENSE_RECONCILER: 'expense_reconciler',
  GALLERY_ORGANIZER: 'gallery_organizer',
  ACTIVITY_RECOMMENDER: 'activity_recommender',
  POLL_DECISION: 'poll_decision',
} as const;

export type AgentRoleType = (typeof AgentRole)[keyof typeof AgentRole];

// Agent processing status
export const AgentStatus = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type AgentStatusType = (typeof AgentStatus)[keyof typeof AgentStatus];

// Context provided to agents for processing
export interface AgentContext {
  tripId: string;
  userId: string;
  role: AgentRoleType;
  requestId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CreateAgentContextInput {
  tripId: string;
  userId: string;
  role: AgentRoleType;
  metadata?: Record<string, unknown>;
}

/**
 * Create an agent context with required fields
 */
export function createAgentContext(input: CreateAgentContextInput): AgentContext {
  return {
    tripId: input.tripId,
    userId: input.userId,
    role: input.role,
    requestId: uuidv4(),
    timestamp: new Date().toISOString(),
    metadata: input.metadata,
  };
}

// Tool call structure for function calling
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// Tool result structure
export interface ToolResult {
  toolCallId: string;
  result?: unknown;
  error?: string;
}

// Token usage tracking
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

// Agent response structure
export interface AgentResponse {
  id: string;
  role: AgentRoleType;
  content: string | null;
  status: AgentStatusType;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
}

// Generic result type for agent operations
export type AgentResult<T> =
  | {
      success: true;
      data: T;
      metadata?: Record<string, unknown>;
    }
  | {
      success: false;
      error: string;
      code?: string;
    };

/**
 * Type guard for success results
 */
export function isSuccessResult<T>(result: AgentResult<T>): result is { success: true; data: T; metadata?: Record<string, unknown> } {
  return result.success === true;
}

/**
 * Type guard for error results
 */
export function isErrorResult<T>(result: AgentResult<T>): result is { success: false; error: string; code?: string } {
  return result.success === false;
}

/**
 * Create a success result
 */
export function createSuccessResult<T>(data: T, metadata?: Record<string, unknown>): AgentResult<T> {
  return {
    success: true,
    data,
    ...(metadata && { metadata }),
  };
}

/**
 * Create an error result
 */
export function createErrorResult<T>(error: string, code?: string): AgentResult<T> {
  return {
    success: false,
    error,
    ...(code && { code }),
  };
}

// Expense data extracted from receipts
export interface ExtractedExpenseData {
  amount: number;
  currency: string;
  vendor: string;
  date: string;
  category?: string;
  description?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  confidence: number;
}

// Payment split calculation
export interface PaymentSplit {
  participantId: string;
  amount: number;
  isPaid: boolean;
}

// Settlement suggestion
export interface SettlementSuggestion {
  fromUserId: string;
  toUserId: string;
  amount: number;
  method: 'venmo' | 'zelle' | 'cash' | 'other';
  reason: string;
}

// Activity recommendation
export interface ActivityRecommendation {
  name: string;
  description: string;
  estimatedCost: number;
  duration: string;
  category: string;
  rating?: number;
  source?: string;
}

// Poll analysis result
export interface PollAnalysis {
  pollId: string;
  totalVotes: number;
  leadingOption: string;
  voteCounts: Record<string, number>;
  recommendation: string;
  confidence: number;
}

// Media organization suggestion
export interface MediaOrganization {
  mediaId: string;
  suggestedTags: string[];
  suggestedAlbum?: string;
  detectedPeople?: string[];
  location?: string;
  timestamp?: string;
}
