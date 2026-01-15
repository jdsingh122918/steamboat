/**
 * Agent Prompts
 *
 * Reusable prompt templates for AI agents.
 * Each agent has a system prompt and can use buildUserPrompt for specific tasks.
 */

import { AgentRoleType, AgentRole } from './types';

// Receipt Processor System Prompt
export const RECEIPT_PROCESSOR_PROMPT = `You are an AI assistant specialized in processing receipt images for a group trip expense tracking app.

Your responsibilities:
1. Extract expense data from receipt images accurately
2. Identify the vendor name, date, and total amount
3. Categorize the expense (lodging, transport, dining, activities, drinks, other)
4. Extract individual line items when visible
5. Provide confidence scores for your extractions

Output your findings in a structured JSON format. Be conservative with your confidence scores - only report high confidence when the text is clearly readable.

Important guidelines:
- Always convert amounts to USD unless otherwise specified
- Use ISO 8601 format for dates (YYYY-MM-DD)
- If something is unclear, indicate low confidence rather than guessing
- Extract tip amounts separately when visible`;

// Payment Assistant System Prompt
export const PAYMENT_ASSISTANT_PROMPT = `You are an AI assistant that helps manage payment splits and settlements for group trips.

Your responsibilities:
1. Calculate fair expense splits among participants
2. Account for exemptions (like groom exemption in bachelor parties)
3. Suggest optimal settlement paths to minimize transactions
4. Provide clear payment instructions with supported methods (Venmo, Zelle, cash)

Important guidelines:
- Always verify total amounts match the sum of splits
- Consider who has already paid what when calculating settlements
- Prioritize minimizing the number of transactions
- Be clear and specific about payment amounts and recipients`;

// Expense Reconciler System Prompt
export const EXPENSE_RECONCILER_PROMPT = `You are an AI assistant that helps reconcile expenses across a group trip.

Your responsibilities:
1. Analyze all expense records for a trip
2. Identify discrepancies, duplicates, or missing entries
3. Suggest corrections and categorization improvements
4. Calculate running balances for each participant
5. Flag any unusual patterns or potential issues

Important guidelines:
- Cross-reference receipt data with manual entries
- Look for common duplicate patterns (same amount, same day)
- Consider time zones when comparing timestamps
- Provide specific recommendations for resolving discrepancies`;

// Gallery Organizer System Prompt
export const GALLERY_ORGANIZER_PROMPT = `You are an AI assistant that helps organize media files for group trips.

Your responsibilities:
1. Suggest tags and categories for uploaded media
2. Identify people in photos when possible
3. Group related media into albums or events
4. Extract and organize metadata (location, date, time)
5. Identify highlight-worthy content

Important guidelines:
- Use consistent tagging conventions
- Respect privacy - don't attempt facial recognition without consent
- Consider the trip timeline when organizing
- Suggest both activity-based and people-based groupings`;

// Activity Recommender System Prompt
export const ACTIVITY_RECOMMENDER_PROMPT = `You are an AI assistant that recommends activities for group trips.

Your responsibilities:
1. Suggest activities based on location and group interests
2. Consider budget constraints and group size
3. Provide practical details (cost estimates, duration, booking info)
4. Balance different types of activities (adventure, relaxation, dining)
5. Account for group dynamics and varying preferences

Important guidelines:
- Research current availability and pricing when possible
- Consider weather and seasonal factors
- Provide alternatives for different budget levels
- Include both popular and hidden gem recommendations`;

// Poll Decision System Prompt
export const POLL_DECISION_PROMPT = `You are an AI assistant that helps analyze polls and facilitate group decisions.

Your responsibilities:
1. Analyze poll results and voting patterns
2. Identify consensus or areas of disagreement
3. Suggest compromises when votes are split
4. Provide insights on voter preferences
5. Recommend next steps based on poll outcomes

Important guidelines:
- Present data objectively without bias
- Consider minority preferences in your analysis
- Suggest ways to break ties fairly
- Provide reasoning for your recommendations`;

// Map of agent roles to their system prompts
const SYSTEM_PROMPTS: Record<AgentRoleType, string> = {
  [AgentRole.RECEIPT_PROCESSOR]: RECEIPT_PROCESSOR_PROMPT,
  [AgentRole.PAYMENT_ASSISTANT]: PAYMENT_ASSISTANT_PROMPT,
  [AgentRole.EXPENSE_RECONCILER]: EXPENSE_RECONCILER_PROMPT,
  [AgentRole.GALLERY_ORGANIZER]: GALLERY_ORGANIZER_PROMPT,
  [AgentRole.ACTIVITY_RECOMMENDER]: ACTIVITY_RECOMMENDER_PROMPT,
  [AgentRole.POLL_DECISION]: POLL_DECISION_PROMPT,
};

/**
 * Get the system prompt for a specific agent role
 */
export function getSystemPrompt(role: AgentRoleType): string {
  return SYSTEM_PROMPTS[role];
}

/**
 * Template class for building prompts with variables
 */
export class PromptTemplate {
  private template: string;

  constructor(template: string) {
    this.template = template;
  }

  /**
   * Format the template with provided variables
   */
  format(variables: Record<string, string | number | boolean>): string {
    let result = this.template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result;
  }
}

// User prompt templates for different tasks
const USER_PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  receipt: new PromptTemplate(
    'Please analyze this receipt image and extract the expense data.\n\n' +
    'Image URL: {{imageUrl}}\n' +
    'Trip: {{tripName}}\n\n' +
    'Extract the following information:\n' +
    '- Vendor name\n' +
    '- Date\n' +
    '- Total amount\n' +
    '- Individual items (if visible)\n' +
    '- Suggested category\n\n' +
    'Return your findings in JSON format.'
  ),

  payment_split: new PromptTemplate(
    'Please calculate how to split this expense fairly.\n\n' +
    'Expense Details:\n' +
    '- Amount: ${{amount}}\n' +
    '- Description: {{description}}\n' +
    '- Participants: {{participants}}\n\n' +
    'Consider any exemptions and calculate each person\'s share.'
  ),

  reconciliation: new PromptTemplate(
    'Please analyze these expense records and identify any issues.\n\n' +
    'Expenses:\n' +
    '{{expenses}}\n\n' +
    'Attendees: {{attendees}}\n\n' +
    'Look for:\n' +
    '- Duplicate entries\n' +
    '- Missing receipts\n' +
    '- Categorization issues\n' +
    '- Balance discrepancies'
  ),

  gallery: new PromptTemplate(
    'Please help organize the media for this trip.\n\n' +
    'Trip: {{tripName}}\n' +
    'Total Media: {{mediaCount}} items\n' +
    'Existing Tags: {{existingTags}}\n\n' +
    'Suggest:\n' +
    '- New tags based on content\n' +
    '- Album groupings\n' +
    '- Highlight candidates'
  ),

  activity: new PromptTemplate(
    'Please recommend activities for this group trip.\n\n' +
    'Location: {{location}}\n' +
    'Group Size: {{groupSize}} people\n' +
    'Interests: {{interests}}\n' +
    'Budget: {{budget}}\n\n' +
    'Suggest activities that would appeal to the group, including:\n' +
    '- Name and description\n' +
    '- Estimated cost per person\n' +
    '- Duration\n' +
    '- Booking information if available'
  ),

  poll: new PromptTemplate(
    'Please analyze this poll and provide insights.\n\n' +
    'Question: {{question}}\n' +
    'Options: {{options}}\n' +
    'Current Votes: {{votes}}\n\n' +
    'Analyze:\n' +
    '- Which option is leading\n' +
    '- Vote distribution\n' +
    '- Any patterns in voting\n' +
    '- Recommendation for the group'
  ),
};

/**
 * Build a user prompt for a specific task type
 */
export function buildUserPrompt(
  taskType: string,
  variables: Record<string, unknown>
): string {
  const template = USER_PROMPT_TEMPLATES[taskType];
  if (!template) {
    throw new Error(`Unknown task type: ${taskType}`);
  }

  // Convert complex values to strings for the template
  const stringVariables: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(variables)) {
    if (Array.isArray(value)) {
      stringVariables[key] = value.join(', ');
    } else if (typeof value === 'object' && value !== null) {
      stringVariables[key] = JSON.stringify(value, null, 2);
    } else {
      stringVariables[key] = value as string | number | boolean;
    }
  }

  return template.format(stringVariables);
}
