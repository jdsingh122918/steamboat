# Phase 8 Implementation Plan - Completion & CI/CD

## Overview

**Project:** Steamboat - Bachelor party coordination platform
**Phase 8 Focus:** Complete remaining Phase 7 items (Admin Dashboard, Trip Recap, Profile/Media components) and establish CI/CD pipeline.

**Status:** `[ ]` **IN PROGRESS**

**Current Test Baseline:** 2166 tests passing (as of Phase 7 completion)

**Scope:**
- 2 missing pages (Admin Dashboard, Trip Recap)
- 4 missing components (Profile & Media improvements)
- CI/CD pipeline infrastructure

---

## Ralph Loop Execution

This plan is designed for autonomous Ralph Loop execution.

**Completion Promise:** Output `<promise>COMPLETE</promise>` when ALL of the following are true:
- All Phase 8 stories have passing tests
- `npm run typecheck` passes with no errors
- `npm run test` shows all tests passing
- Each component follows TDD (tests written before implementation)
- CI pipeline runs successfully on push

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
- Mock external dependencies (MongoDB, APIs, Web Share API, etc.)
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

## Phase 8.1: API Routes (Admin Features)

**Purpose:** Backend APIs for admin dashboard functionality.

| Story | Task | Status | Tests |
|-------|------|--------|-------|
| 8.1.1 | Trip Stats API | [ ] | ~12 tests |
| 8.1.2 | Deleted Items API | [ ] | ~15 tests |
| 8.1.3 | Admin Transfer API | [ ] | ~10 tests |

### Story 8.1.1: Trip Stats API

**File:** `apps/web/app/api/trips/[tripId]/stats/route.ts`

**Test File:** `apps/web/app/api/trips/[tripId]/stats/__tests__/route.test.ts`

**Endpoint:** `GET /api/trips/[tripId]/stats`

**Response Schema:**
```typescript
interface TripStatsResponse {
  totalExpenses: number;
  expenseCount: number;
  totalAttendees: number;
  confirmedAttendees: number;
  totalPhotos: number;
  totalActivities: number;
  completedActivities: number;
  totalPolls: number;
  openPolls: number;
  closedPolls: number;
  expenseBreakdown: Array<{ category: string; total: number; count: number }>;
  settlementStatus: { pending: number; completed: number; total: number };
}
```

**Test Cases:**
- Should return 401 if not authenticated
- Should return 403 if not trip member
- Should return aggregated statistics for trip
- Should calculate expense breakdown by category
- Should count attendees by status
- Should track settlement progress

### Story 8.1.2: Deleted Items API

**Files:**
- `apps/web/app/api/trips/[tripId]/deleted/route.ts` - GET (list)
- `apps/web/app/api/trips/[tripId]/deleted/[itemId]/restore/route.ts` - POST
- `apps/web/app/api/trips/[tripId]/deleted/[itemId]/route.ts` - DELETE (permanent)

**Test File:** `apps/web/app/api/trips/[tripId]/deleted/__tests__/route.test.ts`

**Response Schema:**
```typescript
interface DeletedItem {
  id: string;
  type: 'expense' | 'media' | 'activity';
  title: string;
  deletedAt: string;
  deletedBy: { id: string; name: string };
  autoDeleteAt: string; // 30 days from deletion
  metadata?: {
    amount_cents?: number;
    thumbnailUrl?: string;
    scheduledAt?: string;
  };
}
```

**Test Cases:**
- Should return 403 if not admin
- Should list all soft-deleted items
- Should filter by type query param
- Should restore deleted item
- Should permanently delete item
- Should prevent restore after auto-delete date

### Story 8.1.3: Admin Transfer API

**File:** `apps/web/app/api/trips/[tripId]/admin/transfer/route.ts`

**Test File:** `apps/web/app/api/trips/[tripId]/admin/transfer/__tests__/route.test.ts`

**Request/Response:**
```typescript
// POST body
interface AdminTransferRequest {
  newAdminId: string;
}

// Response
interface AdminTransferResponse {
  success: boolean;
  previousAdmin: { id: string; name: string };
  newAdmin: { id: string; name: string };
}
```

**Test Cases:**
- Should return 403 if not current admin
- Should return 400 if newAdminId is current admin
- Should return 404 if newAdminId not trip member
- Should transfer admin role successfully
- Should update both attendee records atomically

---

## Phase 8.2: Admin Dashboard Page

**Purpose:** Admin-only page for trip management.

| Story | Task | Status | Tests |
|-------|------|--------|-------|
| 8.2.1 | Admin Dashboard Page | [ ] | ~25 tests |

### Story 8.2.1: Admin Dashboard Page

**File:** `apps/web/app/trips/[tripId]/admin/page.tsx`

**Test File:** `apps/web/app/trips/[tripId]/admin/__tests__/page.test.tsx`

**Pattern Reference:** `apps/web/app/trips/[tripId]/finances/page.tsx`

**Component Structure:**
```tsx
'use client';

export default function AdminPage() {
  // State: trip, stats, deletedItems, attendees, loading, error
  // State: activeTab, showTransferModal, deletedTypeFilter

  return (
    <div>
      <PageHeader title="Admin Dashboard" />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="deleted">Deleted Items</TabsTrigger>
          <TabsTrigger value="transfer">Admin Transfer</TabsTrigger>
        </TabsList>

        <TabsContent value="statistics">
          <TripStatsCard stats={stats} loading={loading} />
        </TabsContent>

        <TabsContent value="deleted">
          <Select value={deletedTypeFilter} onValueChange={setDeletedTypeFilter}>
            {/* Filter options */}
          </Select>
          {filteredDeletedItems.map(item => (
            <DeletedItemCard
              key={item.id}
              item={item}
              onRestore={handleRestore}
              onPermanentDelete={handlePermanentDelete}
            />
          ))}
        </TabsContent>

        <TabsContent value="transfer">
          <Button onClick={() => setShowTransferModal(true)}>
            Transfer Admin Role
          </Button>
          <AdminTransferModal
            isOpen={showTransferModal}
            tripName={trip?.name}
            currentAdminId={currentUser?.id}
            attendees={attendees}
            onTransfer={handleAdminTransfer}
            onClose={() => setShowTransferModal(false)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Test Cases:**
- Should render loading state initially
- Should redirect non-admin users to trip dashboard
- Should render statistics tab by default
- Should display TripStatsCard with fetched data
- Should switch between tabs
- Should filter deleted items by type
- Should call restore API and refresh list
- Should show confirmation before permanent delete
- Should open admin transfer modal
- Should redirect after successful admin transfer
- Should handle fetch errors with retry option

---

## Phase 8.3: Trip Recap Page

**Purpose:** Post-trip summary with export functionality.

| Story | Task | Status | Tests |
|-------|------|--------|-------|
| 8.3.1 | Trip Recap Page | [ ] | ~20 tests |

### Story 8.3.1: Trip Recap Page

**File:** `apps/web/app/trips/[tripId]/recap/page.tsx`

**Test File:** `apps/web/app/trips/[tripId]/recap/__tests__/page.test.tsx`

**Pattern Reference:** `apps/web/app/trips/[tripId]/finances/page.tsx`

**Component Structure:**
```tsx
'use client';

export default function RecapPage() {
  // State: trip, expenses, media, polls, balances, attendees, loading, error

  // Computed: summary stats, featured photos, closed polls
  const summary = useMemo(() => ({
    totalExpenses: expenses.reduce((sum, e) => sum + e.amount_cents, 0),
    expenseCount: expenses.length,
    attendeeCount: attendees.length,
    photoCount: media.filter(m => m.type === 'image').length,
    closedPollCount: polls.filter(p => p.status === 'closed').length,
    perPersonAverage: totalExpenses / Math.max(attendees.length, 1),
  }), [expenses, attendees, media, polls]);

  const featuredPhotos = media
    .filter(m => m.type === 'image')
    .slice(0, 12);

  const closedPolls = polls
    .filter(p => p.status === 'closed')
    .map(p => ({
      question: p.question,
      winningOption: getWinningOption(p),
      totalVotes: getTotalVotes(p),
    }));

  return (
    <div>
      <PageHeader
        title="Trip Recap"
        actions={
          <>
            <ExportPDFButton {...pdfProps} />
            <BulkDownloadButton photos={allPhotos} zipName={`${trip.name}-photos`} />
          </>
        }
      />

      {/* Trip Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>{trip.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{formatDateRange(trip.startDate, trip.endDate)}</p>
          <p>{trip.location}</p>
          <p>{summary.attendeeCount} attendees</p>
        </CardContent>
      </Card>

      {/* Financial Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Total: {formatCurrency(summary.totalExpenses)}</p>
          <p>Per person: {formatCurrency(summary.perPersonAverage)}</p>
          <p>{summary.expenseCount} expenses tracked</p>
        </CardContent>
      </Card>

      {/* Photo Highlights */}
      <section>
        <h2>Photo Highlights</h2>
        <div className="grid grid-cols-3 gap-4">
          {featuredPhotos.map(photo => (
            <img key={photo.id} src={photo.thumbnailUrl} alt="" />
          ))}
        </div>
      </section>

      {/* Poll Decisions */}
      <section>
        <h2>Decisions Made</h2>
        {closedPolls.map((poll, i) => (
          <div key={i}>
            <p>{poll.question}</p>
            <p>Decided: {poll.winningOption} ({poll.totalVotes} votes)</p>
          </div>
        ))}
      </section>
    </div>
  );
}
```

**Test Cases:**
- Should render loading state initially
- Should display trip summary card
- Should display financial summary
- Should calculate per-person average correctly
- Should display photo highlights grid
- Should display closed poll decisions
- Should pass correct props to ExportPDFButton
- Should pass correct photos to BulkDownloadButton
- Should show empty states when no data
- Should handle fetch errors

---

## Phase 8.4: Profile & Media Components

**Purpose:** Remaining UI components for profile and media management.

| Story | Task | Status | Tests |
|-------|------|--------|-------|
| 8.4.1 | Location Link Component | [ ] | ~15 tests |
| 8.4.2 | Share Button Component | [ ] | ~15 tests |
| 8.4.3 | Profile Picture Upload Component | [ ] | ~18 tests |
| 8.4.4 | Trip Banner Upload Component | [ ] | ~18 tests |

### Story 8.4.1: Location Link Component

**File:** `apps/web/components/domain/location-link.tsx`

**Test File:** `apps/web/components/domain/__tests__/location-link.test.tsx`

**Pattern Reference:** `apps/web/components/domain/download-button.tsx`

**Props Interface:**
```typescript
export interface LocationLinkProps {
  /** Location address or place name */
  location: string;
  /** Optional coordinates for precise location */
  coordinates?: { lat: number; lng: number };
  /** Maps provider preference */
  provider?: 'google' | 'apple' | 'auto';
  /** Display text (defaults to location) */
  displayText?: string;
  /** Show location pin icon */
  showIcon?: boolean;
  /** Open in new tab */
  openInNewTab?: boolean;
  /** Truncate display text */
  truncate?: boolean;
  /** Max characters before truncation */
  maxLength?: number;
  /** Additional className */
  className?: string;
}
```

**Implementation:**
```typescript
function getMapsUrl(location: string, coordinates?: Coords, provider: Provider): string {
  const encoded = encodeURIComponent(location);

  if (provider === 'apple' || (provider === 'auto' && isAppleDevice())) {
    return coordinates
      ? `https://maps.apple.com/?ll=${coordinates.lat},${coordinates.lng}&q=${encoded}`
      : `https://maps.apple.com/?q=${encoded}`;
  }

  // Google Maps (default)
  return coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}
```

**Test Cases:**
- Should render location text
- Should render as anchor link
- Should show location icon when showIcon is true
- Should truncate long locations
- Should generate Google Maps URL by default
- Should generate Apple Maps URL when specified
- Should auto-detect Apple device
- Should include coordinates in URL when provided
- Should properly encode location string
- Should open in new tab by default
- Should have proper rel attributes for external link

### Story 8.4.2: Share Button Component

**File:** `apps/web/components/domain/share-button.tsx`

**Test File:** `apps/web/components/domain/__tests__/share-button.test.tsx`

**Pattern Reference:** `apps/web/components/domain/download-button.tsx`

**Props Interface:**
```typescript
export interface ShareButtonProps {
  /** Content to share */
  content: {
    title: string;
    text?: string;
    url: string;
  };
  /** Button label */
  buttonText?: string;
  /** Render as icon-only */
  iconOnly?: boolean;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Callback on successful share */
  onShare?: () => void;
  /** Callback on copy to clipboard fallback */
  onCopyFallback?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}
```

**Implementation:**
```typescript
const handleShare = async () => {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share(content);
      onShare?.();
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(content.url);
      onCopyFallback?.();
    }
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      onError?.(error);
    }
  }
};
```

**Test Cases:**
- Should render share button
- Should display default text "Share"
- Should display custom button text
- Should render as icon-only when specified
- Should call navigator.share when available
- Should pass correct content to navigator.share
- Should call onShare callback on success
- Should not call onError when user cancels (AbortError)
- Should fall back to clipboard when Web Share unavailable
- Should call onCopyFallback on clipboard copy
- Should call onError on share failure
- Should be keyboard accessible

### Story 8.4.3: Profile Picture Upload Component

**File:** `apps/web/components/domain/profile-picture-upload.tsx`

**Test File:** `apps/web/components/domain/__tests__/profile-picture-upload.test.tsx`

**Pattern Reference:** `apps/web/components/domain/profile-editor.tsx`

**Props Interface:**
```typescript
export interface ProfilePictureUploadProps {
  /** Current profile picture URL */
  currentImageUrl?: string;
  /** User name for fallback initials */
  name: string;
  /** Callback when upload completes */
  onUpload: (file: File) => Promise<{ url: string }>;
  /** Callback when image is removed */
  onRemove?: () => Promise<void>;
  /** Avatar size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether upload is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
  /** Max file size in bytes (default: 5MB) */
  maxSizeBytes?: number;
  /** Allowed image types */
  allowedTypes?: string[];
}
```

**Implementation:**
- Wraps existing `Avatar` component with upload overlay
- Hidden file input triggered by click
- Shows preview before upload confirmation
- Uses `validateUploadFile()` from `cloudinary-upload.ts`
- Manages `isUploading`, `previewUrl`, `error` states

**Test Cases:**
- Should render current avatar when URL provided
- Should render fallback initials when no URL
- Should show upload overlay on hover/focus
- Should open file picker on click
- Should accept only image files
- Should validate file size
- Should validate file type
- Should show error for invalid files
- Should show preview before upload
- Should call onUpload with selected file
- Should show loading state during upload
- Should update avatar on successful upload
- Should show error on upload failure
- Should show remove button when image exists
- Should call onRemove when remove clicked
- Should be keyboard navigable

### Story 8.4.4: Trip Banner Upload Component

**File:** `apps/web/components/domain/trip-banner-upload.tsx`

**Test File:** `apps/web/components/domain/__tests__/trip-banner-upload.test.tsx`

**Pattern Reference:** `apps/web/components/domain/media-upload/useFileUpload.ts`

**Props Interface:**
```typescript
export interface TripBannerUploadProps {
  /** Trip ID for upload context */
  tripId: string;
  /** Current banner image URL */
  currentBannerUrl?: string;
  /** Callback when upload completes */
  onUpload: (result: { url: string; thumbnailUrl: string }) => Promise<void>;
  /** Callback when banner is removed */
  onRemove?: () => Promise<void>;
  /** Banner aspect ratio (default: 16:9) */
  aspectRatio?: '16:9' | '3:1' | '4:3';
  /** Whether user can edit */
  canEdit?: boolean;
  /** Additional className */
  className?: string;
}
```

**Implementation:**
- Full-width container with aspect ratio CSS
- Drag-and-drop support following `UploadDropzone` pattern
- Uses `uploadToCloudinary()` with progress tracking
- Applies Cloudinary transformations for aspect ratio

**Test Cases:**
- Should render placeholder when no banner
- Should render current banner image
- Should show edit button when canEdit is true
- Should hide edit button when canEdit is false
- Should open file picker on click
- Should support drag and drop
- Should validate image files only
- Should validate file size
- Should show upload progress
- Should call onUpload with result URLs
- Should handle upload errors
- Should enforce aspect ratio via CSS
- Should show remove option when banner exists
- Should call onRemove when banner deleted

---

## Phase 8.5: CI/CD Pipeline

**Purpose:** Automated testing and deployment infrastructure.

| Story | Task | Status | Tests |
|-------|------|--------|-------|
| 8.5.1 | CI Workflow (GitHub Actions) | [ ] | N/A |
| 8.5.2 | CD Workflow (Vercel Deployment) | [ ] | N/A |

### Story 8.5.1: CI Workflow

**File:** `.github/workflows/ci.yml`

**Triggers:** Pull requests and pushes to `main`

**Jobs (parallel where possible):**

```yaml
jobs:
  lint-typecheck:
    # ESLint + TypeScript type checking
    steps:
      - pnpm install
      - pnpm run lint
      - pnpm run typecheck

  rust-lint:
    # Clippy + rustfmt
    steps:
      - cargo fmt --check
      - cargo clippy -- -D warnings

  test-js:
    # Vitest unit tests
    steps:
      - pnpm install
      - pnpm run test:run

  test-rust:
    # Cargo tests
    steps:
      - cargo test --workspace

  build-wasm:
    # WASM package builds
    steps:
      - ./scripts/build-wasm.sh --all
      - Upload artifacts

  build-nextjs:
    needs: [build-wasm]
    # Next.js production build
    steps:
      - Download WASM artifacts
      - pnpm install
      - pnpm run build
```

**Caching Strategy:**
- pnpm cache via `actions/setup-node` with `cache: 'pnpm'`
- Cargo cache: `~/.cargo/registry`, `~/.cargo/git`, `crates/target`
- WASM artifacts passed via `actions/upload-artifact`

### Story 8.5.2: CD Workflow

**File:** `.github/workflows/cd.yml`

**Triggers:** Push to `main`, manual dispatch

**Jobs:**
```yaml
jobs:
  build:
    # Full production build
    outputs:
      build-id: ${{ steps.build-id.outputs.id }}
    steps:
      - Build WASM
      - Build Next.js

  deploy-vercel:
    needs: [build]
    # Deploy to Vercel
    steps:
      - vercel pull
      - vercel build --prod
      - vercel deploy --prebuilt --prod
```

**Required GitHub Secrets:**
| Secret | Purpose |
|--------|---------|
| `MONGODB_URI` | Database connection |
| `SESSION_SECRET` | Session encryption |
| `ANTHROPIC_API_KEY` | Claude API |
| `CLOUDINARY_CLOUD_NAME` | Media storage |
| `CLOUDINARY_API_KEY` | Media storage |
| `CLOUDINARY_API_SECRET` | Media storage |
| `PUSHER_APP_ID` | Real-time updates |
| `NEXT_PUBLIC_PUSHER_KEY` | Real-time updates |
| `PUSHER_SECRET` | Real-time updates |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Real-time updates |
| `VERCEL_TOKEN` | Deployment |
| `VERCEL_ORG_ID` | Deployment |
| `VERCEL_PROJECT_ID` | Deployment |

**Branch Protection Rules:**
```
Required checks:
- Lint & Type Check
- Rust Lint
- JavaScript Tests (Vitest)
- Rust Tests
- Build Next.js
```

---

## Implementation Order

**Recommended sequence:**

1. **Phase 8.1: API Routes** (foundation for admin page)
   - 8.1.1 Trip Stats API
   - 8.1.2 Deleted Items API
   - 8.1.3 Admin Transfer API

2. **Phase 8.4: Components** (simplest first, no API deps)
   - 8.4.1 Location Link
   - 8.4.2 Share Button
   - 8.4.3 Profile Picture Upload
   - 8.4.4 Trip Banner Upload

3. **Phase 8.2: Admin Dashboard Page**
   - 8.2.1 Admin Page (uses APIs from 8.1)

4. **Phase 8.3: Trip Recap Page**
   - 8.3.1 Recap Page (uses existing APIs)

5. **Phase 8.5: CI/CD Pipeline**
   - 8.5.1 CI Workflow
   - 8.5.2 CD Workflow

---

## Key Files Reference

**Pattern Files (read before implementing):**
- `apps/web/app/trips/[tripId]/finances/page.tsx` - Page structure, data fetching, tabs
- `apps/web/app/trips/[tripId]/polls/__tests__/page.test.tsx` - Page test patterns
- `apps/web/components/domain/profile-editor.tsx` - Avatar upload pattern
- `apps/web/components/domain/download-button.tsx` - Button component pattern
- `apps/web/lib/utils/cloudinary-upload.ts` - Cloudinary utilities

**Existing Components to Integrate:**
- `apps/web/components/domain/trip-stats-card.tsx`
- `apps/web/components/domain/deleted-item-card.tsx`
- `apps/web/components/domain/admin-transfer-modal.tsx`
- `apps/web/components/domain/export-pdf-button.tsx`
- `apps/web/components/domain/bulk-download-button.tsx`

**Files to Create:**
```
apps/web/app/api/trips/[tripId]/stats/route.ts
apps/web/app/api/trips/[tripId]/stats/__tests__/route.test.ts
apps/web/app/api/trips/[tripId]/deleted/route.ts
apps/web/app/api/trips/[tripId]/deleted/__tests__/route.test.ts
apps/web/app/api/trips/[tripId]/deleted/[itemId]/restore/route.ts
apps/web/app/api/trips/[tripId]/deleted/[itemId]/route.ts
apps/web/app/api/trips/[tripId]/admin/transfer/route.ts
apps/web/app/api/trips/[tripId]/admin/transfer/__tests__/route.test.ts
apps/web/app/trips/[tripId]/admin/page.tsx
apps/web/app/trips/[tripId]/admin/__tests__/page.test.tsx
apps/web/app/trips/[tripId]/recap/page.tsx
apps/web/app/trips/[tripId]/recap/__tests__/page.test.tsx
apps/web/components/domain/location-link.tsx
apps/web/components/domain/__tests__/location-link.test.tsx
apps/web/components/domain/share-button.tsx
apps/web/components/domain/__tests__/share-button.test.tsx
apps/web/components/domain/profile-picture-upload.tsx
apps/web/components/domain/__tests__/profile-picture-upload.test.tsx
apps/web/components/domain/trip-banner-upload.tsx
apps/web/components/domain/__tests__/trip-banner-upload.test.tsx
.github/workflows/ci.yml
.github/workflows/cd.yml
```

---

## Verification

**After each story:**
```bash
cd apps/web && npm run test:run
cd apps/web && npm run typecheck
```

**After all stories complete:**
```bash
# Full test suite
cd apps/web && npm run test:run

# Type check
cd apps/web && npm run typecheck

# Production build
cd apps/web && npm run build

# Rust tests
cd crates && cargo test --workspace
```

**Manual verification:**
1. Navigate to `/trips/[tripId]/admin` as admin user
2. Verify statistics display correctly
3. Test deleted items filtering and restore/delete
4. Test admin transfer flow
5. Navigate to `/trips/[tripId]/recap`
6. Verify summary statistics
7. Test PDF export and bulk download
8. Test new components in isolation
9. Create test PR to verify CI pipeline

---

## Documentation Updates

**After implementation complete, update:**
- `docs/plans/phase-7-implementation-plan.md` - Note Phase 8 completion
- `docs/README.md` - Update overall project status
