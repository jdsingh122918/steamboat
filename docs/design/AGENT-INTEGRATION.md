# Steamboat Platform - Agent Integration Approach

## Overview

This document outlines the recommended approach for integrating Claude Agent SDK capabilities into the Steamboat Bachelor Party platform. These agents will transform the platform from a static tracking tool into an intelligent assistant that reduces manual work, optimizes finances, and creates lasting memories.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Agent Architecture](#agent-architecture)
3. [Recommended Agents](#recommended-agents)
   - [1. Smart Expense Reconciliation Agent](#1-smart-expense-reconciliation-agent)
   - [2. Receipt Processing Agent](#2-receipt-processing-agent)
   - [3. Activity Recommendation Agent](#3-activity-recommendation-agent)
   - [4. Gallery Organizer Agent](#4-gallery-organizer-agent)
   - [5. Payment Assistant Agent](#5-payment-assistant-agent)
   - [6. Poll & Decision Agent](#6-poll--decision-agent)
4. [Technical Implementation](#technical-implementation)
5. [Integration Points](#integration-points)
6. [Security & Permissions](#security--permissions)
7. [Deployment Strategy](#deployment-strategy)
8. [Cost Considerations](#cost-considerations)

---

## Executive Summary

The Claude Agent SDK provides infrastructure for building AI agents that work autonomously, with capabilities including file operations, web search, and tool orchestration. By integrating specialized agents into the Steamboat platform, we can:

- **Reduce friction** in expense entry through receipt scanning
- **Optimize finances** with intelligent debt settlement algorithms
- **Enhance planning** with activity research and scheduling
- **Automate organization** of photos and trip memories
- **Streamline payments** with guided settlement workflows

### Priority Matrix

| Agent | Impact | Complexity | Priority |
|-------|--------|------------|----------|
| Expense Reconciliation | High | Medium | P0 |
| Receipt Processing | High | Low | P0 |
| Payment Assistant | High | Low | P0 |
| Activity Recommendation | Medium | High | P1 |
| Gallery Organizer | Medium | Medium | P1 |
| Poll & Decision | Low | Low | P2 |

---

## Agent Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Steamboat Web App (Next.js)               │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Dashboard│  │ Finances │  │ Itinerary│  │ Gallery  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼──────────────┼─────────────┼─────────┘
        │             │              │             │
        ▼             ▼              ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│              API Routes / Backend (Vercel)                  │
│                                                             │
│  Triggers Agent SDK via HTTP endpoints when:                │
│  - Expense uploaded (Receipt Agent)                         │
│  - Settle-up requested (Payment Agent)                      │
│  - Admin creates activity (Recommendation Agent)            │
│  - Photos uploaded (Gallery Organizer Agent)                │
│  - Trip ends (Memory Generator Agent)                       │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│           Sandboxed Container (Modal/E2B/Vercel)            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Claude Agent SDK                        │   │
│  │                                                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │   │
│  │  │  Receipt   │  │  Expense   │  │  Activity  │    │   │
│  │  │  Agent     │  │Reconciler  │  │ Recommender│    │   │
│  │  └────────────┘  └────────────┘  └────────────┘    │   │
│  │                                                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │   │
│  │  │  Gallery   │  │  Payment   │  │   Poll     │    │   │
│  │  │ Organizer  │  │ Assistant  │  │  Analyst   │    │   │
│  │  └────────────┘  └────────────┘  └────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  MCP Servers:                                               │
│  - Cloudinary (media processing)                            │
│  - MongoDB (data access)                                    │
│  - Payment link generator                                   │
│  - Expense optimizer                                        │
└─────────────────────────────────────────────────────────────┘
```

### Agent Types Used

| Type | Description | Use Case |
|------|-------------|----------|
| **Standalone** | Single agent handling complete task | Receipt processing, payment assistant |
| **Multi-Agent** | Parent with specialized subagents | Activity recommendation (venue + scheduler) |
| **Background** | Triggered async processing | Gallery organization, trip recap |

---

## Recommended Agents

### 1. Smart Expense Reconciliation Agent

#### Problem Statement
The platform requires "balance optimization" that minimizes the number of transactions to settle up, supporting per-item opt-in expense splitting across 10-20 attendees.

#### Solution
An agent that calculates optimal payment paths using debt simplification algorithms.

#### Agent Definition

```typescript
const expenseReconcilerAgent: AgentDefinition = {
  name: "expense-reconciler",
  description: "Calculate optimal settlement paths for group expenses",
  prompt: `You are a financial reconciliation agent for a group expense tracking app.

Given expense records with opt-in participants, calculate the minimal set of
payments needed to settle all debts.

Rules:
- Each expense has a payer and list of participants who opted in
- Split amounts equally among opted-in participants
- Optimize to minimize total number of transactions
- Consider payment method preferences when suggesting payer pairs
- Provide clear explanations for each recommended payment

Output format:
- List of payments: {from, to, amount, reason}
- Total transactions reduced from X to Y
- Explanation of optimization applied`,
  tools: ["Read", "mcp__expense_optimizer"],
  model: "claude-sonnet-4-20250514"
};
```

#### Workflow

```
User views "Settle Up" → API triggers agent → Agent reads expenses
         ↓
    Calculates debts per person
         ↓
    Applies debt simplification algorithm
         ↓
    Returns optimized payment list with explanations
         ↓
    UI displays "Mike pays Sarah $150 instead of 3 separate payments"
```

#### Example Output

```json
{
  "originalTransactions": 8,
  "optimizedTransactions": 3,
  "payments": [
    {
      "from": "Mike",
      "to": "Sarah",
      "amount": 150.00,
      "reason": "Consolidates: Ski Rentals ($70), Dinner ($50), Groceries ($30)"
    },
    {
      "from": "Tom",
      "to": "John",
      "amount": 85.50,
      "reason": "Consolidates: Lodging ($60), Shuttle ($25.50)"
    }
  ]
}
```

---

### 2. Receipt Processing Agent

#### Problem Statement
The platform requires receipts for all expenses. Manual entry is tedious and error-prone.

#### Solution
An agent using Claude's vision capabilities to extract data from uploaded receipt images.

#### Agent Definition

```typescript
const receiptProcessorAgent: AgentDefinition = {
  name: "receipt-processor",
  description: "Extract expense data from receipt images",
  prompt: `You are a receipt processing agent. When given a receipt image:

1. Extract the following fields:
   - Vendor/merchant name
   - Total amount (including tax and tip if applicable)
   - Date of transaction
   - Individual line items (if visible)
   - Payment method used (if shown)

2. Suggest a category based on vendor type:
   - Restaurants, bars → "Food & Drinks"
   - Ski shops, rental places → "Activities"
   - Gas stations, Uber/Lyft → "Transportation"
   - Hotels, Airbnb → "Lodging"
   - Grocery stores → "Food & Drinks"
   - Other → "Other"

3. Flag any issues:
   - Blurry/unreadable sections
   - Missing total
   - Suspicious discrepancies

Output as structured JSON for form auto-fill.`,
  tools: ["Read"],
  model: "claude-sonnet-4-20250514"
};
```

#### Trigger Points

- User uploads image in "Add Expense" form
- User takes photo via camera capture on mobile

#### Response Format

```json
{
  "extracted": {
    "vendor": "The Steamboat Smokehouse",
    "total": 420.00,
    "date": "2025-02-15",
    "lineItems": [
      {"item": "Appetizers", "amount": 65.00},
      {"item": "Entrees (8)", "amount": 280.00},
      {"item": "Drinks", "amount": 45.00},
      {"item": "Tax", "amount": 30.00}
    ]
  },
  "suggested": {
    "name": "Welcome Dinner - Steamboat Smokehouse",
    "category": "Food & Drinks",
    "linkedActivity": "Welcome Dinner (Feb 15, 8:00 PM)"
  },
  "confidence": 0.95,
  "flags": []
}
```

---

### 3. Activity Recommendation Agent

#### Problem Statement
Admins need help finding and scheduling activities that fit the group's preferences, budget, and availability.

#### Solution
A multi-agent system with specialized subagents for venue discovery and schedule optimization.

#### Agent Definitions

```typescript
const activityRecommenderAgents = {
  // Parent orchestrator
  "activity-planner": {
    description: "Plan and schedule group activities",
    prompt: `You are an activity planning coordinator for a bachelor party in Steamboat, Colorado.

When asked to find activities:
1. Use the venue-discovery subagent to research options
2. Use the schedule-optimizer subagent to find best time slots
3. Compile recommendations with costs, times, and logistics

Consider:
- Group size (typically 10-20 people)
- Budget constraints
- Weather and seasonal factors
- Travel time between venues
- Existing RSVP patterns`,
    tools: ["Task", "Read", "WebSearch"],
    agents: ["venue-discovery", "schedule-optimizer"]
  },

  // Subagent: Venue Discovery
  "venue-discovery": {
    description: "Research and evaluate venues and activities in Steamboat",
    prompt: `You research activities and venues in Steamboat, Colorado.

For each option provide:
- Name and location
- Price per person (estimated)
- Group size limits
- Booking requirements
- Google Maps link
- Notable reviews or ratings

Focus on bachelor party appropriate activities:
- Skiing/snowboarding
- Snowmobile tours
- Hot springs
- Bars and nightlife
- Restaurants for groups
- Adventure activities`,
    tools: ["WebSearch", "WebFetch"],
    model: "claude-sonnet-4-20250514"
  },

  // Subagent: Schedule Optimizer
  "schedule-optimizer": {
    description: "Optimize activity scheduling based on group availability",
    prompt: `You optimize activity schedules for group trips.

Given existing itinerary and RSVP data:
1. Identify available time slots
2. Consider travel time between locations
3. Avoid conflicts with confirmed activities
4. Maximize potential attendance based on RSVP patterns
5. Balance activity types throughout the trip`,
    tools: ["Read", "Grep"],
    model: "claude-haiku-3-5-20241022"
  }
};
```

#### Workflow

```
Admin: "Find skiing activities for Day 2, budget $100/person"
                    ↓
        activity-planner (orchestrator)
                    ↓
    ┌───────────────┴───────────────┐
    ↓                               ↓
venue-discovery              schedule-optimizer
(WebSearch Steamboat ski)    (Read existing RSVPs)
    ↓                               ↓
Returns: 5 ski options       Returns: Best time slots
    └───────────────┬───────────────┘
                    ↓
        Compiled recommendations with
        times, costs, and booking links
```

---

### 4. Gallery Organizer Agent

#### Problem Statement
The platform expects 100-500 photos/videos with organization by day AND by person, plus auto-generated trip recap.

#### Solution
A background processing agent that auto-tags photos and generates trip memories.

#### Agent Definition

```typescript
const galleryOrganizerAgent: AgentDefinition = {
  name: "gallery-organizer",
  description: "Organize photos and generate trip memories",
  prompt: `You are a photo organization and memory creation agent.

DURING TRIP (Photo Processing):
When new photos are uploaded:
1. Analyze image content using vision
2. Identify people (match against profile pictures if available)
3. Detect activities (skiing, dining, group shots, scenic)
4. Suggest relevant tags and captions
5. Flag potential duplicates or similar shots

AFTER TRIP (Memory Generation):
When trip ends, create a recap including:
1. Photo highlights (best group shots, scenic views)
2. Statistics:
   - Total photos/videos uploaded
   - Photos per person
   - Most photographed activities
3. Timeline of key moments
4. Personalized sections per attendee

Output formats:
- JSON tags for database storage
- Markdown recap for display
- Suggested photos for sharing`,
  tools: ["Read", "Write", "Glob"],
  model: "claude-sonnet-4-20250514"
};
```

#### Processing Triggers

| Event | Action |
|-------|--------|
| Photo uploaded | Queue for tagging (batch process) |
| 10+ photos queued | Process batch |
| Trip end date reached | Generate full recap |
| Admin requests recap | Generate on-demand |

#### Memory Recap Structure

```markdown
# Steamboat 2025 - Trip Memories

## By the Numbers
- 📸 256 photos uploaded
- 🎥 12 videos captured
- 👥 16 attendees documented
- ⛷️ 4 days of adventure

## Highlights
[Grid of top 6 photos]

## Day by Day
### Day 1: Arrival
- 45 photos
- Top moments: Airport pickup, first group dinner
[Photo collage]

### Day 2: Ski Day
- 89 photos
- Top moments: Summit views, wipeout compilation
[Photo collage]

## Most Photographed
1. John (Groom) - 67 photos
2. Mike - 45 photos
3. Sarah - 42 photos

## Activity Breakdown
- Skiing: 40%
- Dining: 25%
- Nightlife: 20%
- Other: 15%
```

---

### 5. Payment Assistant Agent

#### Problem Statement
The platform uses deep links to payment apps (Venmo, PayPal, CashApp, Zelle) with manual "mark as paid" tracking.

#### Solution
An interactive agent that guides users through the settlement process.

#### Agent Definition

```typescript
const paymentAssistantAgent: AgentDefinition = {
  name: "payment-assistant",
  description: "Guide users through payment settlement",
  prompt: `You are a payment settlement assistant.

When a user wants to settle up with someone:

1. ANALYZE the debt:
   - Total amount owed
   - Breakdown of expenses included
   - Any partial payments already made

2. IDENTIFY payment options:
   - Check both parties' registered payment handles
   - Prioritize matching platforms (both have Venmo)
   - Fall back to most common platform

3. GUIDE the payment:
   - Use AskUserQuestion to confirm amount and method
   - Generate appropriate deep link
   - Provide clear instructions

4. CONFIRM completion:
   - Ask if payment was successful
   - Handle retries if needed
   - Update payment status

Deep link formats:
- Venmo: venmo://paycharge?txn=pay&recipients={handle}&amount={amount}&note={memo}
- PayPal: https://paypal.me/{handle}/{amount}
- CashApp: https://cash.app/${handle}/{amount}
- Zelle: No deep link - provide copy button for phone/email`,
  tools: ["Read", "AskUserQuestion", "mcp__payment_links"],
  model: "claude-sonnet-4-20250514"
};
```

#### Interaction Flow

```
User clicks "Settle Up" with Mike
              ↓
Agent: "You owe Mike $150.00 for:"
       - Ski Rentals: $70
       - Dinner: $50
       - Groceries: $30
              ↓
Agent uses AskUserQuestion:
"How would you like to pay?"
[Venmo @mike_j] [PayPal mike@email.com] [Other]
              ↓
User selects Venmo
              ↓
Agent: "Opening Venmo with $150 to @mike_j..."
[Deep link opens Venmo app]
              ↓
Agent uses AskUserQuestion:
"Did the payment complete?"
[Yes, mark as paid] [No, try again] [Pay later]
              ↓
User confirms → Balance updated
```

---

### 6. Poll & Decision Agent

#### Problem Statement
The platform includes voting/polls for group decisions, but creating good options requires research.

#### Solution
An agent that researches options and analyzes voting results.

#### Agent Definition

```typescript
const pollDecisionAgent: AgentDefinition = {
  name: "poll-analyst",
  description: "Create informed polls and analyze voting results",
  prompt: `You are a group decision facilitator.

POLL CREATION:
When admin describes a decision needed:
1. Research relevant options (venues, activities, times)
2. Generate 3-4 concrete choices with details
3. Include practical info (cost, capacity, logistics)

RESULT ANALYSIS:
When voting closes:
1. Summarize results with percentages
2. Identify clear winner or close races
3. Provide actionable recommendation
4. Suggest next steps (booking, reservations)

Consider:
- Group size compatibility
- Budget constraints
- Location/travel time
- Previous group preferences`,
  tools: ["WebSearch", "WebFetch", "Read"],
  model: "claude-haiku-3-5-20241022"
};
```

---

## Technical Implementation

### SDK Setup

```typescript
// agents/config.ts
import { ClaudeAgentOptions, AgentDefinition } from '@anthropic-ai/claude-code';

export const steamboatAgentConfig: ClaudeAgentOptions = {
  model: "claude-sonnet-4-20250514",
  permissionMode: "default",
  allowedTools: [
    "Read",
    "Write",
    "WebSearch",
    "WebFetch",
    "AskUserQuestion",
    "Task"
  ],
  mcpServers: {
    "expense-optimizer": {
      command: "node",
      args: ["./mcp-servers/expense-optimizer.js"]
    },
    "payment-links": {
      command: "node",
      args: ["./mcp-servers/payment-links.js"]
    },
    "mongodb": {
      type: "sse",
      url: "${MONGODB_MCP_URL}"
    }
  },
  agents: {
    "expense-reconciler": expenseReconcilerAgent,
    "receipt-processor": receiptProcessorAgent,
    "activity-planner": activityPlannerAgents["activity-planner"],
    "venue-discovery": activityPlannerAgents["venue-discovery"],
    "schedule-optimizer": activityPlannerAgents["schedule-optimizer"],
    "gallery-organizer": galleryOrganizerAgent,
    "payment-assistant": paymentAssistantAgent,
    "poll-analyst": pollDecisionAgent
  }
};
```

### API Routes

```typescript
// app/api/agents/[agent]/route.ts
import { query } from '@anthropic-ai/claude-code';
import { steamboatAgentConfig } from '@/agents/config';

export async function POST(
  request: Request,
  { params }: { params: { agent: string } }
) {
  const { prompt, context } = await request.json();

  const messages = [];

  for await (const message of query({
    prompt: `${prompt}\n\nContext: ${JSON.stringify(context)}`,
    options: {
      ...steamboatAgentConfig,
      // Use specific agent if requested
      systemPrompt: steamboatAgentConfig.agents[params.agent]?.prompt
    }
  })) {
    messages.push(message);
  }

  return Response.json({ messages });
}
```

---

## Integration Points

### Frontend Triggers

| Component | Trigger | Agent |
|-----------|---------|-------|
| Add Expense Form | Image upload | receipt-processor |
| Settle Up Tab | Page load | expense-reconciler |
| Settle Up Card | "Pay Now" click | payment-assistant |
| Itinerary | "Suggest Activity" | activity-planner |
| Gallery | Photo upload (batched) | gallery-organizer |
| Gallery | "Generate Recap" | gallery-organizer |
| Polls | "Create Poll" | poll-analyst |
| Polls | Poll closes | poll-analyst |

### Database Interactions

```typescript
// MCP Server: MongoDB Operations
const mongodbTools = {
  "read_expenses": {
    description: "Read expense records with opt-in data",
    inputSchema: {
      type: "object",
      properties: {
        tripId: { type: "string" },
        filters: { type: "object" }
      }
    }
  },
  "read_attendees": {
    description: "Read attendee profiles and payment handles",
    inputSchema: {
      type: "object",
      properties: {
        tripId: { type: "string" }
      }
    }
  },
  "update_payment_status": {
    description: "Mark payment as completed",
    inputSchema: {
      type: "object",
      properties: {
        paymentId: { type: "string" },
        status: { enum: ["pending", "paid"] }
      }
    }
  }
};
```

---

## Security & Permissions

### Permission Configuration

```typescript
const permissionRules = {
  // Receipt processor: read-only access to uploaded images
  "receipt-processor": {
    allowedTools: ["Read"],
    permissions: [
      { tool: "Read", permission: "allow", paths: ["/uploads/*"] }
    ]
  },

  // Expense reconciler: read-only database access
  "expense-reconciler": {
    allowedTools: ["Read", "mcp__mongodb"],
    permissions: [
      { tool: "mcp__mongodb", permission: "allow", operations: ["read"] }
    ]
  },

  // Payment assistant: interactive only
  "payment-assistant": {
    allowedTools: ["Read", "AskUserQuestion", "mcp__payment_links"],
    permissions: []
  }
};
```

### Hooks for Validation

```typescript
// hooks/expense-validation.ts
export async function preToolUse(input: HookInput): Promise<HookOutput> {
  // Prevent agents from modifying expenses without user confirmation
  if (input.tool === "mcp__mongodb" &&
      input.toolInput.operation === "write") {
    return {
      permissionDecision: "deny",
      permissionDecisionReason: "Write operations require explicit user action"
    };
  }
  return {};
}
```

---

## Deployment Strategy

### Recommended: Ephemeral Sessions

For the Steamboat platform, ephemeral sessions are ideal because:
- One-off tasks (receipt processing, settlement calculation)
- No persistent state needed between agent calls
- Cost-effective (~5 cents/hour when active)

### Container Configuration

```yaml
# modal-config.yaml
app:
  name: steamboat-agents

container:
  image: python:3.11-slim
  memory: 1024  # 1GiB
  cpu: 1
  timeout: 300  # 5 minutes max

environment:
  ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
  MONGODB_URI: ${MONGODB_URI}

secrets:
  - ANTHROPIC_API_KEY
  - MONGODB_URI
```

### Vercel Integration

```typescript
// vercel.json
{
  "functions": {
    "app/api/agents/**": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

---

## Cost Considerations

### Estimated Costs per Agent Call

| Agent | Avg Tokens | Est. Cost | Frequency |
|-------|------------|-----------|-----------|
| Receipt Processor | ~2,000 | $0.006 | Per expense (~50/trip) |
| Expense Reconciler | ~5,000 | $0.015 | Per settle-up view (~20/trip) |
| Payment Assistant | ~1,500 | $0.005 | Per payment (~30/trip) |
| Activity Planner | ~10,000 | $0.030 | Per search (~10/trip) |
| Gallery Organizer | ~3,000 | $0.009 | Per batch (~20 batches) |
| Poll Analyst | ~2,000 | $0.006 | Per poll (~5/trip) |

### Estimated Total per Trip

```
Receipt Processing:  50 × $0.006 = $0.30
Expense Reconciler:  20 × $0.015 = $0.30
Payment Assistant:   30 × $0.005 = $0.15
Activity Planner:    10 × $0.030 = $0.30
Gallery Organizer:   20 × $0.009 = $0.18
Poll Analyst:         5 × $0.006 = $0.03
─────────────────────────────────────────
Total API Costs:              ~$1.26/trip
Container Costs:              ~$0.50/trip
─────────────────────────────────────────
Grand Total:                  ~$1.76/trip
```

### Cost Optimization Strategies

1. **Use Haiku for simple tasks** (schedule-optimizer, poll-analyst)
2. **Batch photo processing** instead of per-image
3. **Cache reconciliation results** until expenses change
4. **Limit web searches** with caching

---

## Next Steps

### Phase 1: Foundation (P0)
1. [ ] Set up Claude Agent SDK infrastructure
2. [ ] Implement Receipt Processing Agent
3. [ ] Implement Expense Reconciliation Agent
4. [ ] Implement Payment Assistant Agent

### Phase 2: Enhancement (P1)
5. [ ] Implement Activity Recommendation Agent
6. [ ] Implement Gallery Organizer Agent
7. [ ] Build MCP servers for database access

### Phase 3: Polish (P2)
8. [ ] Implement Poll & Decision Agent
9. [ ] Add trip recap generation
10. [ ] Performance optimization and caching

---

## Appendix: MCP Server Implementations

### Expense Optimizer MCP

```typescript
// mcp-servers/expense-optimizer.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const server = new Server({
  name: "expense-optimizer",
  version: "1.0.0"
});

server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "optimize_settlements") {
    const { debts } = request.params.arguments;

    // Debt simplification algorithm
    const optimized = simplifyDebts(debts);

    return {
      content: [{
        type: "text",
        text: JSON.stringify(optimized)
      }]
    };
  }
});

function simplifyDebts(debts: Debt[]): Payment[] {
  // Implementation of debt simplification
  // Minimizes total number of transactions
  // Returns optimal payment list
}
```

### Payment Links MCP

```typescript
// mcp-servers/payment-links.ts
const DEEP_LINK_TEMPLATES = {
  venmo: (handle: string, amount: number, memo: string) =>
    `venmo://paycharge?txn=pay&recipients=${handle}&amount=${amount}&note=${encodeURIComponent(memo)}`,

  paypal: (handle: string, amount: number) =>
    `https://paypal.me/${handle}/${amount}`,

  cashapp: (handle: string, amount: number) =>
    `https://cash.app/$${handle}/${amount}`,

  zelle: () => null // No deep link available
};

server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "generate_payment_link") {
    const { platform, handle, amount, memo } = request.params.arguments;

    const link = DEEP_LINK_TEMPLATES[platform]?.(handle, amount, memo);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          link,
          fallback: link ? null : `Copy ${handle} and pay ${amount} in ${platform}`
        })
      }]
    };
  }
});
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-13 | Initial agent integration approach |
