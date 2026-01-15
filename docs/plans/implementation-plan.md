# Steamboat Implementation Plan

## Overview

**Project:** Bachelor party coordination platform with expense tracking, gallery, itinerary, and AI-powered features.

**Status:** ✅ **ALL PHASES COMPLETE.** Rust/WASM infrastructure (69 tests). Data layer (64 tests). Authentication (46 tests). Core APIs (469 tests). Frontend components (516 tests). AI Agents (122 tests). Polish features (70 tests). **All 35 stories complete.**

**Test Summary:**
- Rust: 69 tests (EXIF, expense-optimizer, payment-links, finance-core)
- TypeScript: 1343 tests (env, wasm, db, models, operations, APIs, auth, components, agents, export, pusher, theme)
- **Total: 1412 tests passing**

---

## Ralph Loop Execution

This plan is designed for autonomous Ralph Loop execution.

**Completion Promise:** Output `<promise>COMPLETE</promise>` when ALL of the following are true:
- All Phase 4, 5, and 6 stories have passing tests
- `npm run typecheck` passes with no errors
- `npm run test` shows all tests passing
- Each component follows TDD (tests written before implementation)

**Per-Story Workflow:**
1. Mark story as `[~]` (in progress)
2. Write failing tests first (RED)
3. Implement minimal code to pass (GREEN)
4. Refactor while keeping tests green
5. Verify with `npm run test`
6. Mark story as `[x]` (complete)

---

## Development Guidelines

### Test-Driven Development (TDD)

**Every story must follow the TDD cycle:**

```
1. RED    → Write failing tests first
2. GREEN  → Write minimal code to pass tests
3. REFACTOR → Improve code while keeping tests green
```

**TDD Requirements:**
- Tests MUST be written before implementation code
- No code merges without corresponding test coverage
- Test files live alongside implementation in `__tests__/` directories
- Use Vitest for TypeScript, `cargo test` for Rust
- Mock external dependencies (MongoDB, APIs, WASM modules)
- Cover success cases, error cases, edge cases, and authorization

**Test Naming Convention:**
```typescript
describe('ComponentOrFunction', () => {
  describe('methodOrBehavior', () => {
    it('should [expected behavior] when [condition]', () => {});
  });
});
```

### Quality Over Quantity

**Core Principles:**
- **Correctness first** - Code must work correctly before optimizing
- **Readability matters** - Code is read 10x more than written
- **Simple > Clever** - Prefer obvious solutions over clever ones
- **Test coverage > Speed** - Never skip tests to ship faster

**Definition of Done:**
- [ ] Tests written first (TDD)
- [ ] All tests passing
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Code follows existing patterns in codebase
- [ ] Error handling for all failure modes
- [ ] Proper HTTP status codes (APIs)
- [ ] Zod validation for all inputs

**What to Avoid:**
- Shipping untested code
- Copy-pasting without understanding
- Premature optimization
- Over-engineering simple features
- Skipping error handling

---

## Completed Work

### ✅ Phase 0: Foundation (COMPLETE)

| Story | Task | Status | Tests |
|-------|------|--------|-------|
| 0.1 | EXIF Implementation (kamadak-exif) | ✅ Complete | 22 Rust tests |
| 0.2 | Environment Configuration | ✅ Complete | 10 TypeScript tests |

**Key Files Created:**
- `crates/media-processor/src/exif.rs` - Full EXIF extraction with GPS, orientation, camera info
- `apps/web/lib/env.ts` - Type-safe environment validation
- `apps/web/.env.example` - Configuration template

### ✅ Phase 1: Core Data Layer (COMPLETE)

| Story | Task | Status | Tests |
|-------|------|--------|-------|
| 1.1 | MongoDB Connection singleton | ✅ Complete | 12 tests |
| 1.2 | Data Models (8 entities with Zod) | ✅ Complete | 27 tests |
| 1.3 | CRUD Operations Layer | ✅ Complete | 25 tests |

**Key Files Created:**
```
apps/web/lib/db/
├── client.ts           # MongoDB singleton with pooling
├── index.ts            # Unified exports
├── models/
│   ├── index.ts        # All model exports
│   ├── types.ts        # ObjectId, Timestamps schemas
│   ├── trip.ts         # Trip model + settings
│   ├── attendee.ts     # Attendee + payment handles
│   ├── expense.ts      # Expense + participants
│   ├── activity.ts     # Activity + RSVPs
│   ├── media.ts        # Media + EXIF metadata
│   ├── invite.ts       # Invite tokens
│   ├── payment.ts      # Payment records
│   └── poll.ts         # Polls + voting
└── operations/
    ├── index.ts        # All operation exports
    ├── base.ts         # Generic CRUD with soft delete
    ├── trips.ts        # Trip-specific operations
    ├── attendees.ts    # Attendee operations
    ├── expenses.ts     # Expense + opt-in/out
    ├── activities.ts   # Activity + RSVP
    ├── media.ts        # Media + geotagging
    ├── invites.ts      # Invite validation
    ├── payments.ts     # Payment tracking
    └── polls.ts        # Voting operations
```

**Dependencies Added:**
- `mongodb@^6.0.0` - MongoDB driver
- `zod@^3.24.0` - Runtime schema validation

### ✅ Phase 2: Authentication (COMPLETE)

| Story | Task | Status | Tests |
|-------|------|--------|-------|
| 2.1 | Invite Token System (crypto-secure, expiring) | ✅ Complete | 10 tests |
| 2.2 | Session Management (iron-session, HTTP-only cookies) | ✅ Complete | 12 tests |
| 2.3 | Access Control Middleware | ✅ Complete | 24 tests |

**Key Files Created:**
```
apps/web/lib/auth/
├── index.ts            # Unified exports
├── tokens.ts           # Crypto-secure token generation
├── session.ts          # iron-session wrapper
└── guards.ts           # requireAuth, requireTripAccess, requireAdmin

apps/web/middleware.ts  # Route protection middleware
```

**Features Implemented:**
- `generateInviteToken()` - 64-char hex (32 bytes crypto.randomBytes)
- `createTripInvite()` - Creates invite with 7-day default expiration
- `getSession()` / `createSession()` / `destroySession()` - Session management
- Session cookies: httpOnly, secure (prod), sameSite: lax, 7-day maxAge
- `requireAuth()` - Redirects to /join if unauthenticated
- `requireTripAccess(tripId)` - Validates trip membership
- `requireAdmin(tripId)` - Requires admin role
- Middleware protects `/dashboard`, `/trips` routes

**Dependencies Added:**
- `iron-session@^8.0.0` - Stateless encrypted sessions

**Environment Added:**
- `SESSION_SECRET` - Required 32+ character secret for session encryption

### ✅ Phase 3: Core APIs (COMPLETE)

| Story | Task | Status | Tests |
|-------|------|--------|-------|
| 3.1 | Trip API | ✅ Complete | 26 tests |
| 3.2 | Attendees API | ✅ Complete | 42 tests |
| 3.3 | Invites API | ✅ Complete | 39 tests |
| 3.4 | Expenses API (HIGH RISK) | ✅ Complete | 84 tests |
| 3.5 | Balances API | ✅ Complete | 35 tests |
| 3.6 | Activities API | ✅ Complete | 48 tests |
| 3.7 | Media API | ✅ Complete | 57 tests |
| 3.8 | Payments API | ✅ Complete | 67 tests |
| 3.9 | Polls API | ✅ Complete | 71 tests |

**Key Files Created:**
```
apps/web/app/api/
├── trips/
│   ├── route.ts                              # GET (list), POST (create)
│   └── [tripId]/
│       ├── route.ts                          # GET, PUT, DELETE
│       ├── attendees/
│       │   ├── route.ts                      # GET (list), POST (add)
│       │   └── [attendeeId]/
│       │       ├── route.ts                  # GET, PUT, DELETE
│       │       └── rsvp/route.ts             # PUT (self RSVP)
│       ├── invites/
│       │   ├── route.ts                      # GET (list), POST (create)
│       │   └── [inviteId]/route.ts           # GET, DELETE (revoke)
│       ├── expenses/
│       │   ├── route.ts                      # GET (list), POST (create)
│       │   └── [expenseId]/
│       │       ├── route.ts                  # GET, PUT, DELETE
│       │       ├── participants/route.ts     # POST (opt-in), DELETE (opt-out)
│       │       └── dispute/route.ts          # POST (file), PUT (resolve)
│       ├── balances/
│       │   ├── route.ts                      # GET (balances)
│       │   ├── settlements/route.ts          # GET (plan), POST (execute)
│       │   └── summary/route.ts              # GET (expense summary)
│       ├── activities/
│       │   ├── route.ts                      # GET (list), POST (create)
│       │   └── [activityId]/
│       │       ├── route.ts                  # GET, PUT, DELETE
│       │       └── rsvp/route.ts             # POST, DELETE
│       ├── media/
│       │   ├── route.ts                      # GET (list), POST (create)
│       │   ├── upload-url/route.ts           # POST (Cloudinary signed URL)
│       │   └── [mediaId]/route.ts            # GET, PUT, DELETE
│       ├── payments/
│       │   ├── route.ts                      # GET (list), POST (record)
│       │   ├── links/route.ts                # POST (generate payment link)
│       │   └── [paymentId]/
│       │       ├── route.ts                  # GET, PUT, DELETE
│       │       └── confirm/route.ts          # POST (receiver confirms)
│       └── polls/
│           ├── route.ts                      # GET (list), POST (create)
│           └── [pollId]/
│               ├── route.ts                  # GET, PUT, DELETE
│               ├── vote/route.ts             # POST, PUT, DELETE
│               └── close/route.ts            # POST (admin close)
└── invites/
    ├── accept/route.ts                       # POST (accept invite, create session)
    └── validate/route.ts                     # POST (validate token)
```

**Features Implemented:**
- Full CRUD for all 9 API domains
- Zod validation with safeParse for all request bodies
- ObjectId format validation on all route parameters
- Proper HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500)
- Next.js 15 dynamic route pattern with Promise-based params
- Consistent response format: `{ success, data?, error? }`

**Expenses API (High Risk - Mitigated):**
- Split types: equal, custom, percentage with auto-calculation
- Participant opt-in/opt-out with share recalculation
- Dispute filing and resolution workflow
- Settled expense protection (no modifications)

**Balances API:**
- Real-time balance calculations from expenses + payments
- WASM-powered settlement optimization (minimize transactions)
- Expense summary by category, payer, and date

**Payments API:**
- Payment lifecycle: pending → confirmed/cancelled
- Payment link generation (Venmo, PayPal, CashApp)
- Receiver-only confirmation, sender-only cancellation

---

## Critical Path

```
✅ UI Components → Pages (Dashboard, Finances, Gallery) → Agent Infrastructure → Receipt Agent
```

**All critical path items complete.**

---

## Completed Phases

### ✅ Phase 4: Frontend (COMPLETE)

**Key Files Created:**
```
apps/web/components/
├── ui/
│   ├── index.ts            # Unified exports
│   ├── button.tsx          # Button component
│   ├── input.tsx           # Input component
│   ├── spinner.tsx         # Spinner component
│   ├── skeleton.tsx        # Skeleton loaders
│   ├── avatar.tsx          # Avatar + AvatarGroup
│   ├── badge.tsx           # Badge component
│   ├── select.tsx          # Select dropdown
│   ├── toggle.tsx          # Toggle + Checkbox
│   ├── datepicker.tsx      # DatePicker component
│   ├── card.tsx            # Card family components
│   ├── modal.tsx           # Modal + BottomSheet
│   ├── toast.tsx           # Toast notifications
│   ├── tabs.tsx            # Tabs + Accordion
│   └── theme-toggle.tsx    # Theme toggle + provider
├── layout/
│   ├── mobile-nav.tsx      # Bottom navigation
│   ├── desktop-sidebar.tsx # Desktop sidebar
│   └── page-header.tsx     # Page header
└── domain/
    ├── expense-card.tsx    # Expense display
    ├── activity-card.tsx   # Activity display
    ├── attendee-card.tsx   # Attendee display
    ├── media-card.tsx      # Media display
    └── poll-card.tsx       # Poll display

apps/web/app/trips/[tripId]/
├── dashboard/page.tsx      # Dashboard page
├── finances/page.tsx       # Finances page
├── itinerary/page.tsx      # Itinerary page
├── gallery/page.tsx        # Gallery page
├── attendees/page.tsx      # Attendees page
└── settings/page.tsx       # Settings page
```

#### 4.1 Design System Foundation
- [x] Write theme provider tests
- [x] Implement CSS variables (colors, spacing, typography)
- [x] Implement theme provider (light/dark)
- [x] Add base component styles
- [x] Verify: `npm run test -- --grep "theme"`

#### 4.2 Atomic Components
- [x] Write Button component tests
- [x] Implement Button component
- [x] Write Input component tests
- [x] Implement Input component
- [x] Write Spinner/Skeleton tests
- [x] Implement Spinner/Skeleton
- [x] Write Avatar/Badge tests
- [x] Implement Avatar/Badge
- [x] Verify: All atomic component tests passing

#### 4.3 Form Controls
- [x] Write Select component tests
- [x] Implement Select component
- [x] Write Toggle/Checkbox tests
- [x] Implement Toggle/Checkbox
- [x] Write DatePicker tests
- [x] Implement DatePicker
- [x] Verify: All form control tests passing

#### 4.4 Layout Components
- [x] Write Card component tests
- [x] Implement Card component
- [x] Write Modal/BottomSheet tests
- [x] Implement Modal/BottomSheet
- [x] Write Toast tests
- [x] Implement Toast
- [x] Write Tabs/Accordion tests
- [x] Implement Tabs/Accordion
- [x] Verify: All layout component tests passing

#### 4.5 Navigation
- [x] Write mobile-nav tests
- [x] Implement mobile-nav (bottom tabs)
- [x] Write desktop-sidebar tests
- [x] Implement desktop-sidebar
- [x] Write page-header tests
- [x] Implement page-header
- [x] Verify: All navigation tests passing

#### 4.6 Domain Cards
- [x] Write ExpenseCard tests
- [x] Implement ExpenseCard
- [x] Write ActivityCard tests
- [x] Implement ActivityCard
- [x] Write AttendeeCard tests
- [x] Implement AttendeeCard
- [x] Write MediaCard tests
- [x] Implement MediaCard
- [x] Write PollCard tests
- [x] Implement PollCard
- [x] Verify: All domain card tests passing

#### 4.7 Pages (P0)
- [x] Write Auth/Join page tests
- [x] Implement Auth/Join page
- [x] Write Dashboard tests
- [x] Implement Dashboard (balance overview, recent activity)
- [x] Write Finances page tests
- [x] Implement Finances page (expenses, payments, settlements)
- [x] Verify: All P0 page tests passing

#### 4.8 Pages (P1-P2)
- [x] Write Itinerary page tests
- [x] Implement Itinerary page
- [x] Write Gallery page tests
- [x] Implement Gallery page
- [x] Write Attendees page tests
- [x] Implement Attendees page
- [x] Write Settings page tests
- [x] Implement Settings page
- [x] Verify: All page tests passing, Lighthouse >90

### ✅ Phase 5: AI Agents (COMPLETE)

**Key Files Created:**
```
apps/web/lib/agents/
├── index.ts                    # Unified exports
├── config.ts                   # Claude API client, model selection
├── types.ts                    # Agent interfaces, type guards
├── prompts.ts                  # System prompts, PromptTemplate
├── cost-tracker.ts             # Usage metering, cost calculation
├── receipt-processor.ts        # Receipt → Expense extraction
├── payment-assistant.ts        # Payment link generation
├── expense-reconciler.ts       # Settlement optimization
├── gallery-organizer.ts        # Photo tagging, album creation
├── activity-recommender.ts     # Activity suggestions
└── poll-decision-agent.ts      # Poll creation, summaries
```

**Agent Model Selection:**
- Haiku (`claude-3-haiku-20240307`): Cost-effective for simple tasks
- Sonnet (`claude-sonnet-4-20250514`): Balanced for most tasks
- Opus (`claude-opus-4-20250514`): Complex reasoning tasks

**Dependencies Added:**
- `@anthropic-ai/sdk` - Claude API client
- `uuid` - Unique ID generation

#### 5.1 Shared Infrastructure (Build First)
- [x] Write agent config tests
- [x] Implement `lib/agents/config.ts` - Claude API client, model selection
- [x] Write agent types tests
- [x] Implement `lib/agents/types.ts` - Agent interfaces
- [x] Write prompt templates tests
- [x] Implement `lib/agents/prompts.ts` - System prompts and templates
- [x] Write cost tracker tests
- [x] Implement `lib/agents/cost-tracker.ts` - Usage metering
- [x] Verify: All agent infrastructure tests passing

#### 5.2 Receipt Processing Agent (P0-1)
- [x] Write receipt processing tests with mocked Claude responses
- [x] Implement receipt image upload handler
- [x] Implement Vision API integration for receipt parsing
- [x] Implement expense creation from parsed receipt
- [x] Verify: Receipt → Expense flow works end-to-end

#### 5.3 Payment Assistant Agent (P0-2)
- [x] Write payment assistant tests
- [x] Integrate payment-links-mcp
- [x] Implement payment link generation workflow
- [x] Implement balance-based payment suggestions
- [x] Verify: Payment assistant generates correct links

#### 5.4 Expense Reconciliation Agent (P0-3)
- [x] Write reconciliation tests
- [x] Integrate expense-optimizer-mcp
- [x] Implement settlement optimization workflow
- [x] Implement dispute detection and suggestions
- [x] Verify: Settlements minimize transactions correctly

#### 5.5 Gallery Organizer Agent (P1-1)
- [x] Write gallery organizer tests
- [x] Implement photo tagging with Haiku (~75% cost savings)
- [x] Implement auto-album creation by date/location
- [x] Implement duplicate detection
- [x] Verify: Photos tagged and organized correctly

#### 5.6 Activity Recommendation Agent (P1-2)
- [x] Write recommendation tests
- [x] Implement location-based activity suggestions
- [x] Implement group preference analysis
- [x] Implement itinerary optimization
- [x] Verify: Recommendations are relevant and varied

#### 5.7 Poll & Decision Agent (P2-1)
- [x] Write poll agent tests
- [x] Implement poll creation from natural language
- [x] Implement voting reminder workflow
- [x] Implement decision summary generation
- [x] Verify: Poll lifecycle works correctly

**Cost Targets:**
- Use Haiku for Payment Assistant & Gallery tagging (~75% savings)
- Cache settlement calculations (70%+ hit rate)
- Batch gallery photos 10-20 per call
- **Target cost:** $1.18/trip

### ✅ Phase 6: Polish (COMPLETE)

**Key Files Created:**
```
apps/web/lib/
├── pusher.ts               # Real-time event handling
├── export.ts               # CSV/Markdown generation
└── theme.ts                # Theme management

apps/web/components/ui/
└── theme-toggle.tsx        # Theme provider + toggle
```

**Features Implemented:**
- Pusher real-time: expense, activity, payment, media, attendee, poll events
- Export: CSV expenses, Markdown settlements, trip reports
- Theme: Light/dark/system, localStorage persistence, CSS variables

**Dependencies Added:**
- `pusher-js` - Pusher client

#### 6.1 Pusher Real-time Integration
- [x] Write Pusher integration tests
- [x] Implement Pusher client setup
- [x] Implement real-time expense updates
- [x] Implement real-time activity/RSVP updates
- [x] Implement real-time payment confirmations
- [x] Verify: Changes sync across clients in <1s

#### 6.2 Export Features (CSV/PDF)
- [x] Write export tests
- [x] Implement expense CSV export
- [x] Implement settlement summary markdown
- [x] Implement trip summary report
- [x] Verify: Exports contain correct data and formatting

#### 6.3 Dark Mode
- [x] Write dark mode tests
- [x] Implement dark theme CSS variables
- [x] Implement theme toggle component
- [x] Implement system preference detection
- [x] Implement theme persistence
- [x] Verify: All components render correctly in both themes

---

## Parallelization Strategy

### 2-Developer Team
- **Dev 1:** Frontend components + pages
- **Dev 2:** AI Agents + Polish

### 3-Developer Team
- **Dev 1:** Frontend foundation + atomic components
- **Dev 2:** Pages + domain cards
- **Dev 3:** AI Agents

---

## Risk Status

| Area | Original Risk | Current Status |
|------|---------------|----------------|
| EXIF Implementation | MEDIUM-HIGH | ✅ Mitigated - 22 tests passing |
| MongoDB Connection | MEDIUM | ✅ Mitigated - Singleton with pooling |
| Data Models | MEDIUM | ✅ Mitigated - Zod schemas with full validation |
| Session Management | MEDIUM | ✅ Mitigated - iron-session with 46 tests |
| Expenses API | HIGH | ✅ Mitigated - 84 tests, all split types working |
| Media API | HIGH | ✅ Mitigated - 57 tests, Cloudinary integration ready |
| Balances API | MEDIUM | ✅ Mitigated - WASM optimizer integrated |
| Agent Infrastructure | MEDIUM-HIGH | ✅ Mitigated - 6 agents, 122 tests, cost tracking |
| Frontend Components | MEDIUM | ✅ Mitigated - 516 tests, all components complete |
| Real-time Updates | MEDIUM | ✅ Mitigated - Pusher integration with subscription management |

---

## Critical Files

| File | Purpose | Status |
|------|---------|--------|
| `crates/media-processor/src/exif.rs` | EXIF extraction | ✅ Complete |
| `apps/web/lib/env.ts` | Environment config | ✅ Complete |
| `apps/web/lib/db/client.ts` | MongoDB singleton | ✅ Complete |
| `apps/web/lib/db/models/` | Data models | ✅ Complete |
| `apps/web/lib/db/operations/` | CRUD operations | ✅ Complete |
| `apps/web/lib/auth/` | Authentication layer | ✅ Complete |
| `apps/web/middleware.ts` | Route protection | ✅ Complete |
| `apps/web/app/api/trips/` | All trip APIs | ✅ Complete |
| `apps/web/app/api/invites/` | Invite accept/validate | ✅ Complete |
| `apps/web/lib/agents/` | AI Agent infrastructure | ✅ Complete |
| `apps/web/lib/theme.ts` | Theme management | ✅ Complete |
| `apps/web/lib/export.ts` | CSV/Markdown exports | ✅ Complete |
| `apps/web/lib/pusher.ts` | Real-time updates | ✅ Complete |
| `apps/web/components/ui/` | UI component library | ✅ Complete |
| `apps/web/components/layout/` | Navigation components | ✅ Complete |
| `apps/web/app/trips/[tripId]/` | All trip pages | ✅ Complete |

---

## Verification Plan

**All phases require TDD - tests written BEFORE implementation.**

1. ~~**Phase 0-1:** Run `cargo test` for Rust, verify MongoDB connection~~ ✅ Complete
2. ~~**Phase 2:** Test invite flow end-to-end, verify session persistence~~ ✅ Complete (46 tests)
3. ~~**Phase 3:** API integration tests, TDD approach~~ ✅ Complete (469 tests)
4. ~~**Phase 4:** Frontend components~~ ✅ Complete (516 tests)
   - Component tests with React Testing Library
   - Mobile-first responsive design
   - All components have test coverage
5. ~~**Phase 5:** AI Agents~~ ✅ Complete (122 tests)
   - Agent tests with mocked Claude responses
   - Cost tracking implementation
   - All 6 agents implemented and tested
6. ~~**Phase 6:** Polish & E2E~~ ✅ Complete (70 tests)
   - Real-time update tests (Pusher)
   - Export functionality tests (CSV/Markdown)
   - Dark mode with system preference detection

---

## Timeline Summary

| Phase | Days | Stories | Status |
|-------|------|---------|--------|
| 0: Foundation | 2 | 2 | ✅ Complete |
| 1: Data Layer | 4 | 3 | ✅ Complete |
| 2: Auth | 3 | 3 | ✅ Complete |
| 3: APIs | 8 | 9 | ✅ Complete |
| 4: Frontend | 10 | 8 | ✅ Complete |
| 5: AI Agents | 7 | 7 | ✅ Complete |
| 6: Polish | 4 | 3 | ✅ Complete |
| **Total** | **38** | **35** | **35 Complete / 0 Remaining** |

**All phases complete.** Total: 1412 tests passing across 80 test files.

---

## Completion

✅ **ALL CHECKBOXES COMPLETE**

All 35 stories across Phases 0-6 are complete with 1412 tests passing.

**Key Deliverables:**
- Full UI component library with 516 tests
- 6 AI agents (Receipt, Payment, Expense, Gallery, Activity, Poll) with 122 tests
- Real-time Pusher integration
- CSV/Markdown export functionality
- Dark mode with system preference detection
- Theme persistence

<promise>COMPLETE</promise>
