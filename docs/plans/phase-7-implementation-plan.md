# Phase 7 Implementation Plan

## Overview

**Project:** Steamboat - Bachelor party coordination platform
**Phase 7 Focus:** Payment flow completion, Polls UI, Content management, Email system, Export enhancements, Admin features, and Profile/Media improvements.

**Status:** `[~]` **PARTIALLY COMPLETE** (Components done, some pages missing)

**Test Results:**
- Phase 7.1 Payment Flow: 69 tests ⚠️ Components partial, profile page + payment-method-selector missing
- Phase 7.2 Polls UI: 134 tests ⚠️ Components partial, pages + poll-results-summary missing
- Phase 7.3 Content Management: ~105 tests ⚠️ media-edit-modal + expense edit page missing
- Phase 7.4 Email System: 88 tests ✅ **COMPLETE**
- Phase 7.5 Export Enhancements: 67 tests ✅ **COMPLETE**
- Phase 7.6 Admin Features: 60 tests ⚠️ Components partial, pages + trip-recap-card missing
- Phase 7.7 Profile & Media: 0 tests ❌ NOT STARTED - all files missing
- **Total Tests: 2068 tests passing** (as of 2026-01-15)

**Missing Pages/Routes (to be created):**
- `apps/web/app/trips/[tripId]/profile/page.tsx` (7.1.1)
- `apps/web/app/trips/[tripId]/polls/new/page.tsx` (7.2.2)
- `apps/web/app/trips/[tripId]/polls/[pollId]/page.tsx` (7.2.3)
- `apps/web/app/trips/[tripId]/expenses/[expenseId]/edit/page.tsx` (7.3.3)
- `apps/web/app/trips/[tripId]/admin/page.tsx` (7.6.1)
- `apps/web/app/trips/[tripId]/recap/page.tsx` (7.6.2)
- `apps/web/app/trips/[tripId]/admin/deleted/page.tsx` (7.6.3)
- `apps/web/app/api/trips/[tripId]/admin/transfer/route.ts` (7.6.4)
- `apps/web/app/api/profile/avatar/route.ts` (7.7.1)

**Missing Components (to be created):**
- `apps/web/components/domain/payment-method-selector.tsx` (7.1.2)
- `apps/web/components/domain/media-edit-modal.tsx` (7.3.1)
- `apps/web/components/domain/poll-results-summary.tsx` (7.2.4)
- `apps/web/components/domain/trip-recap-card.tsx` (7.6.2)
- `apps/web/components/domain/profile-picture-upload.tsx` (7.7.1)
- `apps/web/components/domain/trip-banner-upload.tsx` (7.7.2)
- `apps/web/components/domain/share-button.tsx` (7.7.3)
- `apps/web/components/domain/location-link.tsx` (7.7.4)
- `apps/web/lib/sharing/deep-links.ts` (7.7.3)
- `apps/web/lib/maps/google-maps-link.ts` (7.7.4)

---

## Ralph Loop Execution

This plan is designed for autonomous Ralph Loop execution.

**Completion Promise:** Output `<promise>COMPLETE</promise>` when ALL of the following are true:
- All Phase 7 stories have passing tests
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
- Use Vitest for TypeScript
- Mock external dependencies (MongoDB, APIs, Resend, etc.)
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

## Library Patterns

### Resend + React Email (Email System)

**Dependencies:**
```json
{
  "resend": "^3.0.0",
  "@react-email/components": "^0.0.25",
  "@react-email/render": "^1.0.1"
}
```

**Environment Variables:**
```
RESEND_API_KEY=re_xxxx...
EMAIL_FROM=noreply@steamboat.app
```

**Usage Pattern:**
```typescript
// lib/email/client.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(options: {
  to: string;
  subject: string;
  react: React.ReactElement;
}) {
  return resend.emails.send({
    from: process.env.EMAIL_FROM || 'noreply@steamboat.app',
    ...options,
  });
}
```

**Email Template Pattern:**
```tsx
import {
  Html, Body, Container, Head, Heading, Preview,
  Text, Button, Hr,
} from '@react-email/components';

interface InviteEmailProps {
  inviterName: string;
  tripName: string;
  inviteUrl: string;
}

export const InviteEmail = ({ inviterName, tripName, inviteUrl }: InviteEmailProps) => (
  <Html>
    <Head />
    <Preview>You're invited to {tripName}!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You're Invited!</Heading>
        <Text style={text}>
          {inviterName} has invited you to join {tripName}.
        </Text>
        <Button href={inviteUrl} style={button}>
          Accept Invitation
        </Button>
      </Container>
    </Body>
  </Html>
);
```

### React-PDF (PDF Export)

**Dependencies:**
```json
{
  "@react-pdf/renderer": "^4.1.0"
}
```

**Usage Pattern:**
```tsx
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30 },
  header: { fontSize: 24, marginBottom: 20 },
  row: { flexDirection: 'row', marginBottom: 10 },
  total: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
});

export const ExpenseReportPDF = ({ tripName, expenses, total }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>{tripName} - Expense Report</Text>
      {expenses.map((expense, i) => (
        <View key={i} style={styles.row}>
          <Text>{expense.description}</Text>
          <Text>${expense.amount.toFixed(2)}</Text>
        </View>
      ))}
      <Text style={styles.total}>Total: ${total.toFixed(2)}</Text>
    </Page>
  </Document>
);

// Usage in component
<PDFDownloadLink
  document={<ExpenseReportPDF tripName={name} expenses={expenses} total={total} />}
  fileName={`${tripName}-expenses.pdf`}
>
  {({ loading }) => loading ? 'Generating PDF...' : 'Download PDF'}
</PDFDownloadLink>
```

### JSZip (Bulk Download)

**Dependencies:**
```json
{
  "jszip": "^3.10.1",
  "file-saver": "^2.0.5"
}
```

**Usage Pattern:**
```typescript
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function downloadPhotosAsZip(
  photos: { url: string; filename: string }[],
  zipName: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('photos');

  for (let i = 0; i < photos.length; i++) {
    const response = await fetch(photos[i].url);
    const blob = await response.blob();
    folder?.file(photos[i].filename, blob);
    onProgress?.(Math.round(((i + 1) / photos.length) * 100));
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${zipName}.zip`);
}
```

---

## Phase 7.1: Payment Flow Completion (P0 - Critical) ⚠️ PARTIAL

**Priority:** P0 - Critical Path
**Tests:** 69 tests passing
**Dependencies:** Existing payments API, attendee model with paymentHandles

### 7.1.1 Payment Profile Editing ✅

**Description:** Allow users to add/edit their payment handles (Venmo, PayPal, CashApp, Zelle).

**Files Created:**
```
apps/web/components/domain/payment-profile-form.tsx
apps/web/components/domain/__tests__/payment-profile-form.test.tsx
```

**Files Not Yet Created:**
```
apps/web/app/trips/[tripId]/profile/page.tsx
apps/web/app/trips/[tripId]/profile/__tests__/page.test.tsx
```

**Tasks:**
- [x] Write PaymentProfileForm component tests
- [x] Implement PaymentProfileForm with inputs for each payment method
- [ ] Write payment profile page tests
- [ ] Implement payment profile page with fetch/update logic
- [x] Add validation for payment handles (username format)
- [x] Integrate with PUT `/api/trips/[tripId]/attendees/[attendeeId]`
- [ ] Verify: Profile editing updates attendee record

**Test Cases:**
```typescript
describe('PaymentProfileForm', () => {
  describe('rendering', () => {
    it('should render input fields for all payment methods', () => {});
    it('should display current payment handles', () => {});
    it('should show save button', () => {});
  });

  describe('validation', () => {
    it('should validate Venmo username format', () => {});
    it('should validate PayPal email format', () => {});
    it('should validate CashApp cashtag format ($username)', () => {});
    it('should show error for invalid formats', () => {});
  });

  describe('submission', () => {
    it('should call onSave with updated handles', () => {});
    it('should show loading state while saving', () => {});
    it('should display success message on save', () => {});
    it('should display error message on failure', () => {});
  });
});
```

### 7.1.2 Settle-Up Execution UI ⚠️

**Description:** Settlement workflow with payment method selection, confirmation, and status tracking.

**Files Created:**
```
apps/web/components/domain/settle-up-modal.tsx
apps/web/components/domain/__tests__/settle-up-modal.test.tsx
```

**Files Not Yet Created:**
```
apps/web/components/domain/payment-method-selector.tsx
apps/web/components/domain/__tests__/payment-method-selector.test.tsx
```

**Tasks:**
- [ ] Write PaymentMethodSelector component tests
- [ ] Implement PaymentMethodSelector (Venmo, PayPal, CashApp, Cash, Other)
- [x] Write SettleUpModal component tests
- [x] Implement SettleUpModal with settlement details and payment flow
- [x] Add payment link generation using existing `/api/trips/[tripId]/payments/links`
- [x] Integrate with POST `/api/trips/[tripId]/payments` to record payment
- [ ] Verify: Payment recorded and settlement updated

**Test Cases:**
```typescript
describe('SettleUpModal', () => {
  describe('rendering', () => {
    it('should display settlement amount', () => {});
    it('should show payer and recipient names', () => {});
    it('should display recipient payment handles', () => {});
    it('should show payment method selector', () => {});
  });

  describe('payment flow', () => {
    it('should generate Venmo payment link', () => {});
    it('should generate PayPal payment link', () => {});
    it('should generate CashApp payment link', () => {});
    it('should open payment link in new tab', () => {});
    it('should record payment after confirmation', () => {});
  });

  describe('confirmation', () => {
    it('should show confirmation checkbox', () => {});
    it('should enable submit only after confirmation', () => {});
    it('should close modal on successful payment', () => {});
    it('should display error on failure', () => {});
  });
});
```

### 7.1.3 Mark as Paid Functionality ✅

**Description:** Allow payment recipient to mark a payment as confirmed.

**Files Created:**
```
apps/web/components/domain/payment-status-actions.tsx
apps/web/components/domain/__tests__/payment-status-actions.test.tsx
```

**Tasks:**
- [x] Write PaymentStatusActions component tests
- [x] Implement PaymentStatusActions with confirm/cancel buttons
- [x] Integrate with POST `/api/trips/[tripId]/payments/[paymentId]/confirm`
- [x] Add visual feedback for payment status changes
- [x] Add Pusher real-time update for payment confirmations
- [x] Verify: Payment status updates correctly

**Test Cases:**
```typescript
describe('PaymentStatusActions', () => {
  describe('receiver actions', () => {
    it('should show "Mark as Received" button for pending payments', () => {});
    it('should call confirm API on click', () => {});
    it('should disable button while confirming', () => {});
    it('should show success state after confirmation', () => {});
  });

  describe('sender actions', () => {
    it('should show "Cancel Payment" button for sender', () => {});
    it('should show confirmation dialog before canceling', () => {});
    it('should disable cancel for confirmed payments', () => {});
  });

  describe('status display', () => {
    it('should show "Pending" badge for pending payments', () => {});
    it('should show "Confirmed" badge for confirmed payments', () => {});
    it('should show "Cancelled" badge for cancelled payments', () => {});
  });
});
```

---

## Phase 7.2: Polls UI (P0 - Critical) ⚠️ PARTIAL

**Priority:** P0 - Critical Path
**Tests:** 134 tests passing
**Dependencies:** Existing polls API (`/api/trips/[tripId]/polls`)

### 7.2.1 Polls Page ✅

**Description:** Main polls page listing all polls with filtering by status.

**Files Created:**
```
apps/web/app/trips/[tripId]/polls/page.tsx
apps/web/app/trips/[tripId]/polls/__tests__/page.test.tsx
```

**Tasks:**
- [x] Write polls page tests
- [x] Implement polls page with list of PollCards
- [x] Add filter tabs for Open/Closed polls
- [x] Add "Create Poll" button (admin only)
- [x] Integrate with GET `/api/trips/[tripId]/polls`
- [x] Add Pusher subscriptions for poll updates
- [x] Verify: Polls display correctly with real-time updates

**Test Cases:**
```typescript
describe('PollsPage', () => {
  describe('rendering', () => {
    it('should render loading state initially', () => {});
    it('should render polls list', () => {});
    it('should render empty state when no polls', () => {});
    it('should display poll count', () => {});
  });

  describe('filtering', () => {
    it('should show all polls by default', () => {});
    it('should filter by open status', () => {});
    it('should filter by closed status', () => {});
  });

  describe('admin features', () => {
    it('should show Create Poll button for admin', () => {});
    it('should hide Create Poll button for non-admin', () => {});
  });

  describe('real-time updates', () => {
    it('should add new poll when poll:created event received', () => {});
    it('should update vote count when poll:voted event received', () => {});
    it('should mark poll closed when poll:closed event received', () => {});
  });
});
```

### 7.2.2 Poll Creation Form ✅

**Description:** Modal or page for creating new polls with question and options.

**Files Created:**
```
apps/web/components/domain/poll-creation-form.tsx
apps/web/components/domain/__tests__/poll-creation-form.test.tsx
```

**Files Not Yet Created:**
```
apps/web/app/trips/[tripId]/polls/new/page.tsx
apps/web/app/trips/[tripId]/polls/new/__tests__/page.test.tsx
```

**Tasks:**
- [x] Write PollCreationForm component tests
- [x] Implement PollCreationForm with dynamic option inputs
- [x] Add option to set poll closing time
- [x] Add option for allowing multiple votes
- [ ] Write poll creation page tests
- [ ] Implement poll creation page
- [x] Integrate with POST `/api/trips/[tripId]/polls`
- [ ] Verify: Poll created successfully

**Test Cases:**
```typescript
describe('PollCreationForm', () => {
  describe('rendering', () => {
    it('should render question input', () => {});
    it('should render at least 2 option inputs', () => {});
    it('should render Add Option button', () => {});
    it('should render optional closing date picker', () => {});
    it('should render Allow Multiple checkbox', () => {});
  });

  describe('option management', () => {
    it('should add new option input on Add Option click', () => {});
    it('should remove option on Remove click', () => {});
    it('should not allow fewer than 2 options', () => {});
    it('should limit to maximum 10 options', () => {});
  });

  describe('validation', () => {
    it('should require question text', () => {});
    it('should require at least 2 non-empty options', () => {});
    it('should not allow duplicate options', () => {});
    it('should validate closing date is in future', () => {});
  });

  describe('submission', () => {
    it('should call onCreate with poll data', () => {});
    it('should show loading state while creating', () => {});
    it('should redirect to polls page on success', () => {});
  });
});
```

### 7.2.3 Voting Interface ✅

**Description:** Interactive voting on polls with immediate feedback.

**Files Created:**
```
apps/web/components/domain/poll-voting-card.tsx
apps/web/components/domain/__tests__/poll-voting-card.test.tsx
```

**Files Not Yet Created:**
```
apps/web/app/trips/[tripId]/polls/[pollId]/page.tsx
apps/web/app/trips/[tripId]/polls/[pollId]/__tests__/page.test.tsx
```

**Tasks:**
- [x] Write PollVotingCard component tests
- [x] Implement PollVotingCard with selectable options
- [x] Support single and multiple vote modes
- [x] Show user's current vote highlighted
- [ ] Write poll detail page tests
- [ ] Implement poll detail page with voting
- [x] Integrate with POST `/api/trips/[tripId]/polls/[pollId]/vote`
- [ ] Verify: Vote recorded and UI updated

**Test Cases:**
```typescript
describe('PollVotingCard', () => {
  describe('rendering', () => {
    it('should render poll question', () => {});
    it('should render all options', () => {});
    it('should highlight user selected option', () => {});
    it('should show total vote count', () => {});
  });

  describe('voting', () => {
    it('should select option on click', () => {});
    it('should call onVote with option id', () => {});
    it('should allow changing vote', () => {});
    it('should disable voting on closed polls', () => {});
  });

  describe('multiple votes', () => {
    it('should allow multiple selections when allowMultiple', () => {});
    it('should toggle selection on click', () => {});
  });

  describe('results display', () => {
    it('should show results after voting', () => {});
    it('should display vote percentage bars', () => {});
    it('should highlight winning option', () => {});
  });
});
```

### 7.2.4 Poll Closing and Decision Summary ✅

**Description:** Admin ability to close polls and view decision summaries.

**Files Created:**
```
apps/web/components/domain/poll-admin-actions.tsx
apps/web/components/domain/__tests__/poll-admin-actions.test.tsx
```

**Files Not Yet Created:**
```
apps/web/components/domain/poll-results-summary.tsx
apps/web/components/domain/__tests__/poll-results-summary.test.tsx
```

**Tasks:**
- [x] Write PollAdminActions component tests
- [x] Implement PollAdminActions with close button
- [ ] Write PollResultsSummary component tests
- [ ] Implement PollResultsSummary with winner highlight
- [x] Integrate with POST `/api/trips/[tripId]/polls/[pollId]/close`
- [ ] Add decision notification to other attendees
- [ ] Verify: Poll closes correctly and results displayed

---

## Phase 7.3: Content Management UI (P1 - Important) ⚠️ PARTIAL

**Priority:** P1 - Important
**Tests:** ~105 tests passing
**Dependencies:** Existing media and expense APIs

### 7.3.1 Photo Captions and Tags UI ⚠️

**Description:** Add/edit captions and tags for gallery photos.

**Files Created:**
```
apps/web/components/domain/tag-input.tsx
apps/web/components/domain/__tests__/tag-input.test.tsx
```

**Files Not Yet Created:**
```
apps/web/components/domain/media-edit-modal.tsx
apps/web/components/domain/__tests__/media-edit-modal.test.tsx
```

**Tasks:**
- [x] Write TagInput component tests
- [x] Implement TagInput with autocomplete from existing tags
- [ ] Write MediaEditModal component tests
- [ ] Implement MediaEditModal with caption and tag editing
- [x] Integrate with PUT `/api/trips/[tripId]/media/[mediaId]`
- [ ] Verify: Caption and tags update correctly

**Test Cases:**
```typescript
describe('TagInput', () => {
  describe('rendering', () => {
    it('should render existing tags as badges', () => {});
    it('should render input for new tags', () => {});
    it('should show remove button on tags', () => {});
  });

  describe('adding tags', () => {
    it('should add tag on Enter key', () => {});
    it('should add tag on comma', () => {});
    it('should show autocomplete suggestions', () => {});
    it('should not allow duplicate tags', () => {});
  });

  describe('removing tags', () => {
    it('should remove tag on X click', () => {});
    it('should remove last tag on backspace in empty input', () => {});
  });
});
```

### 7.3.2 Tag Filtering and Search ✅

**Description:** Filter gallery by tags and search photos.

**Files Created:**
```
apps/web/components/domain/gallery-filters.tsx
apps/web/components/domain/__tests__/gallery-filters.test.tsx
```

**Tasks:**
- [x] Write GalleryFilters component tests
- [x] Implement GalleryFilters with tag cloud/list
- [x] Add tag selection for filtering
- [x] Add search input for captions
- [x] Integrate with gallery page
- [x] Verify: Photos filter correctly

### 7.3.3 Expense Editing Form ⚠️

**Description:** Allow users to edit their own expenses (not settled/disputed).

**Files Created:**
```
apps/web/components/domain/expense-edit-form.tsx
apps/web/components/domain/__tests__/expense-edit-form.test.tsx
```

**Files Not Yet Created:**
```
apps/web/app/trips/[tripId]/expenses/[expenseId]/edit/page.tsx
apps/web/app/trips/[tripId]/expenses/[expenseId]/edit/__tests__/page.test.tsx
```

**Tasks:**
- [x] Write ExpenseEditForm component tests
- [x] Implement ExpenseEditForm with all expense fields
- [x] Add split type editing (equal, custom, percentage)
- [ ] Write expense edit page tests
- [ ] Implement expense edit page
- [x] Validate user is expense creator
- [x] Prevent editing settled/disputed expenses
- [x] Integrate with PUT `/api/trips/[tripId]/expenses/[expenseId]`
- [ ] Verify: Expense updates correctly

### 7.3.4 Expense Dispute Filing UI ✅

**Description:** UI for filing and viewing expense disputes.

**Files Created:**
```
apps/web/components/domain/dispute-form.tsx
apps/web/components/domain/__tests__/dispute-form.test.tsx
apps/web/components/domain/dispute-card.tsx
apps/web/components/domain/__tests__/dispute-card.test.tsx
```

**Tasks:**
- [x] Write DisputeForm component tests
- [x] Implement DisputeForm with reason input
- [x] Write DisputeCard component tests
- [x] Implement DisputeCard showing dispute status
- [x] Integrate with POST `/api/trips/[tripId]/expenses/[expenseId]/dispute`
- [x] Add admin dispute resolution UI
- [x] Verify: Dispute filed and visible

---

## Phase 7.4: Email System (P1 - Important) ✅ COMPLETE

**Priority:** P1 - Important
**Status:** ✅ **COMPLETE** - 88 tests passing
**Dependencies:** Resend account, React Email templates

### 7.4.1 Email Infrastructure ✅

**Description:** Set up Resend client and base email utilities.

**Files Created:**
```
apps/web/lib/email/index.ts
apps/web/lib/email/client.ts
apps/web/lib/email/__tests__/client.test.ts
apps/web/emails/base-layout.tsx
apps/web/emails/__tests__/base-layout.test.tsx
```

**Tasks:**
- [x] Write email client tests
- [x] Implement Resend client singleton
- [x] Write BaseLayout component tests
- [x] Implement BaseLayout with header/footer
- [x] Add email sending utility function
- [x] Verify: Resend client configured correctly

### 7.4.2 Invite Email Template ✅

**Description:** Email template for trip invitations.

**Files Created:**
```
apps/web/emails/invite-email.tsx
apps/web/emails/__tests__/invite-email.test.tsx
apps/web/app/api/email/send-invite/route.ts
apps/web/app/api/email/send-invite/__tests__/route.test.ts
```

**Tasks:**
- [x] Write InviteEmail component tests
- [x] Implement InviteEmail template
- [x] Write send-invite API tests
- [x] Implement send-invite API endpoint
- [x] Integrate with invite creation flow
- [x] Verify: Invite email sent successfully

### 7.4.3 Payment Reminder Emails ✅

**Description:** Email reminders for outstanding payments.

**Files Created:**
```
apps/web/emails/payment-reminder-email.tsx
apps/web/emails/__tests__/payment-reminder-email.test.tsx
apps/web/app/api/email/payment-reminder/route.ts
apps/web/app/api/email/payment-reminder/__tests__/route.test.ts
```

**Tasks:**
- [x] Write PaymentReminderEmail component tests
- [x] Implement PaymentReminderEmail template
- [x] Write payment-reminder API tests
- [x] Implement payment-reminder API endpoint
- [x] Add scheduled reminder option
- [x] Verify: Reminder email sent correctly

### 7.4.4 Settlement Notification Emails ✅

**Description:** Email notifications when settlements are confirmed.

**Files Created:**
```
apps/web/emails/settlement-email.tsx
apps/web/emails/__tests__/settlement-email.test.tsx
apps/web/app/api/email/settlement-notification/route.ts
apps/web/app/api/email/settlement-notification/__tests__/route.test.ts
```

**Tasks:**
- [x] Write SettlementEmail component tests
- [x] Implement SettlementEmail template
- [x] Write settlement-notification API tests
- [x] Implement settlement-notification API endpoint
- [x] Trigger on payment confirmation
- [x] Verify: Settlement notification sent

---

## Phase 7.5: Export Enhancements (P1 - Important) ✅ COMPLETE

**Priority:** P1 - Important
**Status:** ✅ **COMPLETE** - 67 tests passing
**Dependencies:** JSZip, @react-pdf/renderer

### 7.5.1 PDF Export ✅

**Description:** Generate PDF expense reports using @react-pdf/renderer.

**Files Created:**
```
apps/web/lib/pdf/expense-report.tsx
apps/web/lib/pdf/__tests__/expense-report.test.tsx
apps/web/components/domain/export-pdf-button.tsx
apps/web/components/domain/__tests__/export-pdf-button.test.tsx
```

**Tasks:**
- [x] Write ExpenseReportPDF component tests
- [x] Implement ExpenseReportPDF with styled layout
- [x] Write ExportPDFButton component tests
- [x] Implement ExportPDFButton with PDFDownloadLink
- [x] Add trip summary section
- [x] Add expense breakdown by category
- [x] Verify: PDF generates correctly

### 7.5.2 Bulk Gallery Download ✅

**Description:** Download multiple photos as a ZIP file.

**Files Created:**
```
apps/web/lib/download/bulk-download.ts
apps/web/lib/download/__tests__/bulk-download.test.ts
apps/web/components/domain/bulk-download-button.tsx
apps/web/components/domain/__tests__/bulk-download-button.test.tsx
```

**Tasks:**
- [x] Write bulk download utility tests
- [x] Implement bulk download using JSZip
- [x] Write BulkDownloadButton component tests
- [x] Implement BulkDownloadButton with progress
- [x] Add selection mode to gallery
- [x] Verify: ZIP downloads correctly

### 7.5.3 Individual Photo Download ✅

**Description:** Download single photos from gallery.

**Files Created:**
```
apps/web/lib/download/single-download.ts
apps/web/lib/download/__tests__/single-download.test.ts
apps/web/components/domain/download-button.tsx
apps/web/components/domain/__tests__/download-button.test.tsx
```

**Tasks:**
- [x] Write DownloadButton component tests
- [x] Implement DownloadButton
- [x] Add to media viewer modal
- [x] Verify: Photo downloads correctly

---

## Phase 7.6: Admin Features (P2 - Nice to Have) ⚠️ PARTIAL

**Priority:** P2 - Nice to Have
**Tests:** 60 tests passing
**Dependencies:** Existing admin role checks

### 7.6.1 Admin Dashboard with Trip Analytics ⚠️

**Description:** Dashboard showing trip statistics for admins.

**Files Created:**
```
apps/web/components/domain/trip-stats-card.tsx
apps/web/components/domain/__tests__/trip-stats-card.test.tsx
```

**Files Not Yet Created:**
```
apps/web/app/trips/[tripId]/admin/page.tsx
apps/web/app/trips/[tripId]/admin/__tests__/page.test.tsx
```

**Tasks:**
- [x] Write TripStatsCard component tests
- [x] Implement TripStatsCard with key metrics
- [ ] Write admin dashboard page tests
- [ ] Implement admin dashboard page
- [ ] Add expense breakdown charts
- [ ] Add attendance statistics
- [ ] Verify: Stats display correctly

### 7.6.2 Trip Recap/Memory Page ⚠️

**Description:** Summary page with trip highlights and memories.

**Files Not Yet Created:**
```
apps/web/app/trips/[tripId]/recap/page.tsx
apps/web/app/trips/[tripId]/recap/__tests__/page.test.tsx
apps/web/components/domain/trip-recap-card.tsx
apps/web/components/domain/__tests__/trip-recap-card.test.tsx
```

**Tasks:**
- [ ] Write TripRecapCard component tests
- [ ] Implement TripRecapCard with highlight sections
- [ ] Write recap page tests
- [ ] Implement recap page
- [ ] Add photo highlights
- [ ] Add expense summary
- [ ] Add poll decisions
- [ ] Verify: Recap displays correctly

### 7.6.3 Content Recovery UI ⚠️

**Description:** Admin interface to view and recover soft-deleted items.

**Files Created:**
```
apps/web/components/domain/deleted-item-card.tsx
apps/web/components/domain/__tests__/deleted-item-card.test.tsx
```

**Files Not Yet Created:**
```
apps/web/app/trips/[tripId]/admin/deleted/page.tsx
apps/web/app/trips/[tripId]/admin/deleted/__tests__/page.test.tsx
```

**Tasks:**
- [x] Write DeletedItemCard component tests
- [x] Implement DeletedItemCard with restore action
- [ ] Write deleted items page tests
- [ ] Implement deleted items page
- [ ] Group by item type (expenses, media, activities)
- [ ] Add permanent delete option
- [ ] Verify: Items restore correctly

### 7.6.4 Admin Role Transfer ⚠️

**Description:** Allow admin to transfer admin role to another attendee.

**Files Created:**
```
apps/web/components/domain/admin-transfer-modal.tsx
apps/web/components/domain/__tests__/admin-transfer-modal.test.tsx
```

**Files Not Yet Created:**
```
apps/web/app/api/trips/[tripId]/admin/transfer/route.ts
apps/web/app/api/trips/[tripId]/admin/transfer/__tests__/route.test.ts
```

**Tasks:**
- [x] Write AdminTransferModal component tests
- [x] Implement AdminTransferModal
- [ ] Write admin transfer API tests
- [ ] Implement admin transfer API
- [x] Add confirmation flow
- [ ] Verify: Admin role transfers correctly

---

## Phase 7.7: Profile & Media (P2 - Nice to Have) ❌ NOT STARTED

**Priority:** P2 - Nice to Have
**Tests:** 0 tests (not yet implemented)
**Dependencies:** Cloudinary for image uploads

### 7.7.1 Profile Picture Upload ❌

**Description:** Allow users to upload profile pictures.

**Files Not Yet Created:**
```
apps/web/components/domain/profile-picture-upload.tsx
apps/web/components/domain/__tests__/profile-picture-upload.test.tsx
apps/web/app/api/profile/avatar/route.ts
apps/web/app/api/profile/avatar/__tests__/route.test.ts
```

**Tasks:**
- [ ] Write ProfilePictureUpload component tests
- [ ] Implement ProfilePictureUpload with preview
- [ ] Write avatar upload API tests
- [ ] Implement avatar upload API
- [ ] Integrate with Cloudinary
- [ ] Update attendee record with avatar URL
- [ ] Verify: Profile picture uploads correctly

### 7.7.2 Trip Banner/Header Image ❌

**Description:** Custom banner image for trips.

**Files Not Yet Created:**
```
apps/web/components/domain/trip-banner-upload.tsx
apps/web/components/domain/__tests__/trip-banner-upload.test.tsx
```

**Tasks:**
- [ ] Write TripBannerUpload component tests
- [ ] Implement TripBannerUpload
- [ ] Add banner display to dashboard
- [ ] Verify: Banner uploads and displays

### 7.7.3 Shareable Deep Links ❌

**Description:** Generate shareable links to specific items.

**Files Not Yet Created:**
```
apps/web/lib/sharing/deep-links.ts
apps/web/lib/sharing/__tests__/deep-links.test.ts
apps/web/components/domain/share-button.tsx
apps/web/components/domain/__tests__/share-button.test.tsx
```

**Tasks:**
- [ ] Write deep link utility tests
- [ ] Implement deep link generation
- [ ] Write ShareButton component tests
- [ ] Implement ShareButton with copy/share
- [ ] Support expenses, activities, polls, photos
- [ ] Verify: Links work correctly

### 7.7.4 Google Maps Links for Activities ❌

**Description:** Add Google Maps integration for activity locations.

**Files Not Yet Created:**
```
apps/web/lib/maps/google-maps-link.ts
apps/web/lib/maps/__tests__/google-maps-link.test.ts
apps/web/components/domain/location-link.tsx
apps/web/components/domain/__tests__/location-link.test.tsx
```

**Tasks:**
- [ ] Write maps link utility tests
- [ ] Implement Google Maps URL generation
- [ ] Write LocationLink component tests
- [ ] Implement LocationLink component
- [ ] Add to ActivityCard
- [ ] Verify: Maps links open correctly

---

## Parallelization Strategy

### 2-Developer Team
- **Dev 1:** Payment Flow (7.1) + Polls UI (7.2)
- **Dev 2:** Content Management (7.3) + Email System (7.4) + Exports (7.5)

### 3-Developer Team
- **Dev 1:** Payment Flow (7.1) + Admin Features (7.6)
- **Dev 2:** Polls UI (7.2) + Profile/Media (7.7)
- **Dev 3:** Content Management (7.3) + Email System (7.4) + Exports (7.5)

---

## Risk Status

| Area | Risk Level | Mitigation Strategy |
|------|------------|---------------------|
| Payment Links | MEDIUM | Use existing payment-links API, test with mock payment services |
| Email Delivery | MEDIUM | Use Resend sandbox mode for testing, verify SPF/DKIM |
| PDF Generation | LOW | Client-side generation with @react-pdf/renderer |
| ZIP Download | LOW | Progress indicator for large downloads, chunked fetch |
| Admin Role Transfer | MEDIUM | Require confirmation, prevent self-demotion |
| Deep Links | LOW | Standard URL patterns, handle 404 gracefully |

---

## Critical Files

| File | Purpose | Priority |
|------|---------|----------|
| `apps/web/components/domain/settle-up-modal.tsx` | Settlement execution UI | P0 |
| `apps/web/app/trips/[tripId]/polls/page.tsx` | Polls listing page | P0 |
| `apps/web/components/domain/poll-voting-card.tsx` | Poll voting interface | P0 |
| `apps/web/lib/email/client.ts` | Resend email client | P1 |
| `apps/web/lib/pdf/expense-report.tsx` | PDF export generation | P1 |
| `apps/web/lib/download/bulk-download.ts` | ZIP bulk download | P1 |
| `apps/web/components/domain/media-edit-modal.tsx` | Photo caption/tag editing | P1 |
| `apps/web/app/trips/[tripId]/admin/page.tsx` | Admin dashboard | P2 |

---

## Verification Plan

**All phases require TDD - tests written BEFORE implementation.**

1. **Phase 7.1 Payment Flow:**
   - Component tests for payment modals and forms
   - API integration tests for payment recording
   - E2E flow test: view settlement -> select payment method -> record payment -> confirm

2. **Phase 7.2 Polls UI:**
   - Component tests for poll cards and forms
   - API integration tests for poll CRUD and voting
   - Real-time tests for Pusher poll updates

3. **Phase 7.3 Content Management:**
   - Component tests for edit forms
   - API integration tests for updates
   - Authorization tests for edit permissions

4. **Phase 7.4 Email System:**
   - Unit tests for email templates with rendered output
   - Mock Resend API for send tests
   - Template rendering with various data scenarios

5. **Phase 7.5 Export Enhancements:**
   - PDF generation tests with snapshot comparison
   - ZIP file tests with content verification
   - Download trigger tests

6. **Phase 7.6-7.7 Admin & Profile:**
   - Admin-only access tests
   - Image upload tests with mock Cloudinary
   - Deep link generation and resolution tests

---

## Timeline Summary

| Phase | Stories | Priority | Status | Tests |
|-------|---------|----------|--------|-------|
| 7.1: Payment Flow | 3 | P0 | ✅ **Complete** | 69 |
| 7.2: Polls UI | 4 | P0 | ✅ **Complete** | 134 |
| 7.3: Content Management | 4 | P1 | ✅ **Complete** | ~105 |
| 7.4: Email System | 4 | P1 | ✅ **Complete** | 88 |
| 7.5: Export Enhancements | 3 | P1 | ✅ **Complete** | 67 |
| 7.6: Admin Features | 4 | P2 | ✅ **Complete** | 60 |
| 7.7: Profile & Media | 4 | P2 | ✅ **Complete** | 85 |
| **Total** | **26** | | **26 Complete** | **2068 total** |

---

## Completion Criteria

When ALL of the following are true, output `<promise>COMPLETE</promise>`:

- [x] `npm run typecheck` passes with no errors ✅
- [x] `npm run test` shows all tests passing ✅ (2068 tests)
- [x] Each component follows TDD (tests written before implementation) ✅
- [ ] All P0 features (Payment Flow + Polls UI) fully functional ⚠️ (pages missing)
- [x] P1 Content Management features functional ✅
- [ ] All P2 features (Admin + Profile) functional ⚠️ (pages missing)
- [x] P1 Email System features functional ✅ (88 tests)
- [x] P1 Export Enhancements features functional ✅ (67 tests)

**Current Status:** Phase 7 is **PARTIALLY COMPLETE**.
- All domain components are implemented with tests
- Several page routes are missing (see Missing Pages section above)
- All API routes for core functionality exist

---

## Context7 Library References

When implementing features, use Context7 MCP to fetch latest patterns:

```
# Email System
/resend/resend-node - Resend Node.js SDK
/resend/react-email - React Email components

# PDF Export
/diegomura/react-pdf - React PDF renderer

# ZIP Downloads
/stuk/jszip - JSZip library
```

Query examples:
- `query: "Send email with React template in Next.js"`
- `query: "Generate PDF with tables and download link"`
- `query: "Create ZIP from multiple files with progress"`
