# Steamboat Rust Infrastructure Implementation Plan

## Overview

This plan defines test-driven stories for implementing the complete Rust/WASM infrastructure for the Steamboat event management platform across 4 phases:

| Phase | Component | Size | Priority | Loading |
|-------|-----------|------|----------|---------|
| 1 | Debt Simplification Engine | ~50KB | P0 | Eager |
| 2 | Financial Core Module | ~30KB | P0 | Eager |
| 3 | Media Processing Pipeline | ~300KB | P1 | Lazy |
| 4 | MCP Servers (WASM Components) | ~100KB | P2 | Server-side |

---

## Progress Summary

| Metric | Status |
|--------|--------|
| **Stories Completed** | **20/20** |
| Phase 1: Debt Simplification Engine | 5/5 ✅ COMPLETE |
| Phase 2: Financial Core Module | 5/5 ✅ COMPLETE |
| Phase 3: Media Processing Pipeline | 6/6 ✅ COMPLETE |
| Phase 4: MCP Servers | 4/4 ✅ COMPLETE |

### Test Coverage

| Crate/Module | Tests Passing |
|--------------|---------------|
| expense-optimizer | 14 |
| expense-optimizer-mcp | 9 |
| finance-core | 8 |
| media-processor | 57 |
| payment-links-mcp | 11 |
| integration | 7 |
| doctests | 6 |
| **Rust Total** | **112** |
| TypeScript (apps/web) | 47 |
| **Grand Total** | **159** |

---

## Implementation Order & Parallelization

```
WEEK 1: Foundation
┌─────────────────────────────────────────────────────────────┐
│ RUST-001: Workspace Setup (MUST COMPLETE FIRST)            │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
WEEK 2: Core Types (PARALLEL)
┌─────────────────────────┐   ┌─────────────────────────┐
│ RUST-002: Phase 1 Types │   │ RUST-006: Phase 2 Types │
└─────────────────────────┘   └─────────────────────────┘
              │                               │
              ▼                               ▼
WEEK 3: Algorithms (PARALLEL)
┌─────────────────────────┐   ┌─────────────────────────┐
│ RUST-003: Balance Calc  │   │ RUST-007: Expense Split │
└─────────────────────────┘   └─────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│ RUST-004: Greedy Algo   │   │ RUST-008: Balance Calc  │
└─────────────────────────┘   └─────────────────────────┘
              │                               │
              ▼                               ▼
WEEK 4: WASM Bindings (PARALLEL)
┌─────────────────────────┐   ┌─────────────────────────┐
│ RUST-005: P1 WASM       │   │ RUST-009: P2 WASM       │
└─────────────────────────┘   └─────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ RUST-010: Integration Tests                                 │
└─────────────────────────────────────────────────────────────┘

WEEK 5-6: Media Processing (PARALLEL with above after RUST-001)
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ MEDIA-001  │ │ MEDIA-003  │ │ MEDIA-004  │ │ MEDIA-005  │
│ Resize     │ │ EXIF       │ │ Thumbnail  │ │ Duplicate  │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
       │              │              │              │
       └──────────────┴──────────────┴──────────────┘
                              │
                              ▼
                    ┌────────────────┐
                    │ MEDIA-006 WASM │
                    └────────────────┘

WEEK 7: MCP Servers (After Phase 1-2 complete)
┌─────────────────────────────────────────────────────────────┐
│ MCP-001: WIT Interface Foundation                           │
└─────────────────────────────────────────────────────────────┘
              │
              ├───────────────┬───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ MCP-002         │ │ MCP-003         │ │ MCP-004         │
│ Expense Opt MCP │ │ Payment Links   │ │ Edge Deploy     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Phase 1: Debt Simplification Engine ✅ COMPLETE

### RUST-001: Workspace Setup and Build Infrastructure ✅ COMPLETE

**User Story:** As a developer, I want a properly configured Rust workspace with build tooling, so that I can develop, test, and compile WASM modules efficiently.

**Test Cases:**
```
Test 1: cargo check --workspace completes without errors
Test 2: cargo build --release produces native binaries
Test 3: wasm-pack build --target web produces ~50KB WASM for expense-optimizer
Test 4: wasm-pack build --target web produces ~30KB WASM for finance-core
Test 5: cargo test --workspace passes all unit tests
```

**Files to Create:**
- `crates/Cargo.toml` - Workspace configuration
- `crates/expense-optimizer/Cargo.toml`
- `crates/finance-core/Cargo.toml`
- `scripts/build-wasm.sh`

---

### RUST-002: Debt Simplification Core Types ✅ COMPLETE

**User Story:** As a financial calculation engine, I want well-defined data types for debts, payments, and results, so that I can model debt relationships accurately.

**Test Cases:**
```
Test 1: Debt serializes to JSON with all fields present
Test 2: Debt deserializes from JSON without data loss
Test 3: Payment struct contains from, to, amount_cents, reason
Test 4: SimplificationResult calculates savings_percent correctly
Test 5: Negative amounts are handled (refunds/corrections)
Test 6: Empty expense_ids vector is preserved
```

**File:** `crates/expense-optimizer/src/lib.rs`

---

### RUST-003: Net Balance Calculation ✅ COMPLETE

**User Story:** As a debt simplification algorithm, I want to calculate net balances for each participant, so that I can determine who ultimately owes whom.

**Test Cases:**
```
Test 1: Single debt: A owes B $100 → A=-100, B=+100
Test 2: Circular: A→B→C→A $100 each → all balances = 0
Test 3: Partial circular: A→B $100, B→C $50, C→A $25 → A=-75, B=+50, C=+25
Test 4: Chain: A→B $100, B→C $100 → A=-100, B=0, C=+100
Test 5: Multiple same pair: A→B $50+$30+$20 → A=-100, B=+100
Test 6: 15 participants, $5000 total → balances sum to 0, <10ms
Test 7: Empty debts list → empty HashMap
```

**File:** `crates/expense-optimizer/src/balance.rs`

---

### RUST-004: Greedy Debt Simplification Algorithm ✅ COMPLETE

**User Story:** As a trip organizer, I want to minimize payment transactions needed to settle all debts, so that settle-up is simple.

**Test Cases:**
```
Test 1: Circular debt (A→B→C→A $100) → 0 payments, 100% savings
Test 2: Chain debt (A→B→C $100) → 1 payment (A→C), B eliminated
Test 3: Multiple debtors to single creditor → no further simplification
Test 4: Complex 5-person network → payments ≤ 4, all settled
Test 5: 15 people, 25 expenses, $5000 → payments < 25, <50ms
Test 6: Greedy matches largest debtor to largest creditor first
Test 7: Applying all payments results in zero balance for everyone
Test 8: Each payment has human-readable reason string
```

**File:** `crates/expense-optimizer/src/simplify.rs`

---

### RUST-005: Expense Optimizer WASM Bindings ✅ COMPLETE

**User Story:** As a Next.js frontend, I want JavaScript-callable WASM bindings for debt simplification, so that I can perform calculations client-side.

**Test Cases:**
```
Test 1: init() sets console_error_panic_hook
Test 2: optimize_settlements(debts_json) returns valid JSON
Test 3: Invalid JSON returns JsValue error with "Parse error"
Test 4: validate_debts() returns true for valid debts
Test 5: Browser wasm-bindgen-test passes all tests
Test 6: 100 debts processed in <10ms
Test 7: TypeScript declarations match expected interfaces
```

**File:** `crates/expense-optimizer/src/wasm.rs`

---

## Phase 2: Financial Core Module ✅ COMPLETE

### RUST-006: Financial Core Types with Decimal Precision ✅ COMPLETE

**User Story:** As a financial calculation engine, I want precise decimal arithmetic types, so that I never have floating-point rounding errors.

**Test Cases:**
```
Test 1: Cents (i64) prevents floating-point conversions
Test 2: Expense struct serializes all fields correctly
Test 3: ShareResult sum of share_cents equals original amount
Test 4: PersonShare extra_cent flag indicates +1 cent
Test 5: BalanceSummary net = paid - owed exactly
Test 6: $100,000.00 (10_000_000 cents) doesn't overflow i64
```

**File:** `crates/finance-core/src/lib.rs`

---

### RUST-007: Expense Splitting Logic ✅ COMPLETE

**User Story:** As a trip expense tracker, I want to split expenses fairly among participants, so that everyone pays their exact fair share.

**Test Cases:**
```
Test 1: $100.00 / 4 = 2500 cents each, remainder = 0
Test 2: $100.01 / 3 = 3333 base, 2 get extra cent (3334)
Test 3: Sum of all shares = original amount (property test)
Test 4: 1 participant gets full amount
Test 5: 0 participants → empty shares, no error
Test 6: $1234.56 / 20 = 6172 base, 16 get extra cent
Test 7: Same input always produces same remainder distribution
```

**File:** `crates/finance-core/src/split.rs`

---

### RUST-008: Balance Calculation Engine ✅ COMPLETE

**User Story:** As a trip attendee, I want to see my accurate balance across all expenses, so that I know exactly how much I owe or am owed.

**Test Cases:**
```
Test 1: A pays $100 split 4 ways → A net +$75
Test 2: Payer's net = paid - owed
Test 3: Multiple expenses aggregate correctly
Test 4: Sum of all net_balance_cents = 0 (conservation)
Test 5: Single attendee calculation is efficient
Test 6: 50 expenses, 15 attendees calculates correctly
Test 7: Attendee not in any expense → all zeros
Test 8: Opt-out recalculates remaining participants
```

**File:** `crates/finance-core/src/balance.rs`

---

### RUST-009: Finance Core WASM Bindings ✅ COMPLETE

**User Story:** As a Next.js frontend, I want JavaScript-callable WASM bindings for financial calculations, so that balance updates happen instantly.

**Test Cases:**
```
Test 1: split_expense_wasm returns ShareResult JSON
Test 2: calculate_all_balances_wasm returns BalanceSummary array
Test 3: calculate_balance_wasm returns single BalanceSummary
Test 4: Invalid JSON returns descriptive JsValue error
Test 5: Browser wasm-bindgen-test passes
Test 6: 100 expenses, 20 participants in <20ms
```

**File:** `crates/finance-core/src/wasm.rs`

---

### RUST-010: Cross-Module Integration Tests ✅ COMPLETE

**User Story:** As a system integrator, I want integration tests verifying both modules work together, so that the expense-to-settlement pipeline works correctly.

**Test Cases:**
```
Test 1: End-to-end: split → balance → debts → simplify → settled
Test 2: WASM interoperability: JS calls both modules correctly
Test 3: Real trip: 15 attendees, $5100 total, <15 payments, <100ms
Test 4: Opt-in/opt-out scenario recalculates correctly
Test 5: Type conversion between modules preserves data
Test 6: Performance benchmarks (small/medium/large)
```

**File:** `crates/tests/integration/`

---

## Phase 3: Media Processing Pipeline (In Progress)

### MEDIA-001: Image Resizing with Aspect Ratio Preservation ✅ COMPLETE

**User Story:** As a gallery uploader, I want my high-resolution photos automatically resized before upload, so that upload times are faster.

**Test Cases:**
```
Test 1: 4000x3000 → max 2048 → 2048x1536 (aspect preserved)
Test 2: 3000x4000 portrait → 1536x2048
Test 3: 1920x1080 within bounds → no resize
Test 4: 5000x5000 square → 2048x2048
Test 5: 4K to 2K resize in ~200ms
Test 6: quality=95 larger than quality=70
```

**File:** `crates/media-processor/src/resize.rs`

---

### MEDIA-002: Format Conversion ✅ COMPLETE

**User Story:** As a gallery uploader, I want my images converted to optimal web formats, so that the gallery loads faster.

**Test Cases:**
```
Test 1: JPEG → WebP produces smaller file
Test 2: PNG without alpha → JPEG composites to white
Test 3: PNG with alpha → WebP preserves transparency
Test 4: Unsupported format returns descriptive error
Test 5: Format detected from magic bytes (FFD8FF, 89504E47, RIFF)
Test 6: Round-trip encoding maintains SSIM > 0.95
```

**File:** `crates/media-processor/src/resize.rs`

---

### MEDIA-003: EXIF Extraction ✅ COMPLETE

**User Story:** As a gallery user, I want photo metadata automatically extracted, so that photos can be auto-tagged with date/time and location.

**Test Cases:**
```
Test 1: DateTimeOriginal extracted as parseable string
Test 2: Camera make/model extracted (e.g., "Apple", "iPhone 15 Pro")
Test 3: GPS coordinates as decimal (-90 to 90, -180 to 180)
Test 4: GPS South/West are negative values
Test 5: Orientation tag extracted (1-8)
Test 6: Missing EXIF returns None fields, no error
Test 7: EXIF extraction in ~10ms
Test 8: Corrupted EXIF returns partial data, no crash
```

**File:** `crates/media-processor/src/exif.rs`

---

### MEDIA-004: Thumbnail Generation ✅ COMPLETE

**User Story:** As a gallery viewer, I want fast-loading thumbnails for the gallery grid, so that I can quickly browse hundreds of photos.

**Test Cases:**
```
Test 1: 150x150 thumbnail preserves aspect ratio
Test 2: 300x300 thumbnail preserves aspect ratio
Test 3: 600x600 thumbnail preserves aspect ratio
Test 4: crop_to_square=true produces exact square, centered
Test 5: Portrait square crop centers vertically
Test 6: Thumbnail generation in ~50ms
Test 7: Batch (150, 300, 600) in <150ms total
Test 8: Output uses quality=80 JPEG
```

**File:** `crates/media-processor/src/thumbnail.rs`

---

### MEDIA-005: Duplicate Detection ✅ COMPLETE

**User Story:** As a gallery uploader, I want duplicate photos detected before upload, so that the gallery doesn't get cluttered.

**Test Cases:**
```
Test 1: Identical files have identical SHA2 hash
Test 2: Different images have different SHA2 hash
Test 3: Hash is stable across sessions
Test 4: Perceptual hash: compressed version distance < 5
Test 5: Perceptual hash: different images distance > 10
Test 6: Rotated image still similar (distance < 10)
Test 7: SHA2 + perceptual hash in <100ms
Test 8: Re-encoded JPEG detected as near-duplicate
```

**File:** `crates/media-processor/src/hash.rs`

---

### MEDIA-006: WASM Module Integration with Lazy Loading

**User Story:** As a web application, I want the media processor loaded only when needed, so that initial page load is fast.

**Test Cases:**
```
Test 1: Module NOT loaded on initial page load
Test 2: Module loads on Gallery upload trigger
Test 3: Module preloads on Gallery tab hover
Test 4: Second load returns same instance (no duplicate request)
Test 5: processImage() returns valid ProcessResult
Test 6: extractExif() returns valid ExifData
Test 7: generateThumbnail() returns Uint8Array
Test 8: WASM unavailable → graceful error handling
Test 9: Bundle size ~300KB or less
```

**File:** `apps/web/lib/wasm/media-processor.ts`

---

## Phase 4: MCP Servers as WASM Components

### MCP-001: WIT Interface Foundation ✅ COMPLETE

**User Story:** As a developer integrating MCP servers, I want standardized WIT interfaces, so that all WASM MCP servers have consistent patterns.

**Test Cases:**
```
Test 1: mcp-request record has method and params strings
Test 2: mcp-response has success, result (option), error (option)
Test 3: debt record has from, to, amount-cents (s64)
Test 4: payment record has from, to, amount-cents (s64)
Test 5: platform variant includes venmo, paypal, cashapp, zelle
Test 6: wasm-tools component wit validates without errors
```

**Files:**
- `crates/mcp-servers/wit/mcp-server.wit`
- `crates/mcp-servers/wit/expense-optimizer.wit`
- `crates/mcp-servers/wit/payment-links.wit`

---

### MCP-002: Expense Optimizer MCP Server ✅ COMPLETE

**User Story:** As an MCP client calling the expense optimizer, I want to send a list of debts and receive optimized payments.

**Test Cases:**
```
Test 1: Empty debts → empty payments
Test 2: Single debt → single payment
Test 3: Circular debts → empty payments
Test 4: Chain debts → consolidated payment
Test 5: 20 people, 50 debts → payments ≤ 19
Test 6: MCP request "optimize_settlements" returns JSON payments
Test 7: Unknown method returns error
Test 8: Malformed JSON returns parse error
Test 9: Component size < 100KB
```

**File:** `crates/mcp-servers/expense-optimizer-mcp/src/lib.rs`

---

### MCP-003: Payment Links MCP Server ✅ COMPLETE

**User Story:** As the payment links MCP server, I want to generate deep links for payment apps, so that users can settle with one tap.

**Test Cases:**
```
Venmo:
Test 1: venmo://paycharge?txn=pay&recipients=@mike_j&amount=150.00&note=Trip%20expenses
Test 2: Handle with/without @ sign works
Test 3: Special characters URL encoded

PayPal:
Test 4: https://paypal.me/mike@email.com/150.00
Test 5: Memo in fallback, not URL

CashApp:
Test 6: https://cash.app/$TomB/85.50
Test 7: $ prefix added if missing

Zelle:
Test 8: link = none, fallback = "Pay 555-123-4567 $65.00 via Zelle"

MCP:
Test 9: generate_payment_link returns valid link
Test 10: Invalid platform returns error
Test 11: Component size < 50KB
```

**File:** `crates/mcp-servers/payment-links-mcp/src/lib.rs`

---

### MCP-004: Edge Deployment Configuration

**User Story:** As a platform deployer, I want to run MCP WASM components on Vercel Edge, so that I get sub-millisecond cold starts.

**Test Cases:**
```
Test 1: expense-optimizer.wasm < 100KB, gzip < 50KB
Test 2: WasmEdge init < 1ms, execute < 5ms for 50 debts
Test 3: API route responds in < 50ms
Test 4: vercel.json specifies runtime=edge, maxDuration=5
Test 5: Cold start < 1ms on Vercel Edge
Test 6: Cold start < 1ms on Cloudflare Workers
```

**Files:**
- `vercel.json`
- `apps/web/app/api/mcp/expense-optimizer/route.ts`
- `apps/web/app/api/mcp/payment-links/route.ts`

---

## Verification Strategy

### Unit Tests
```bash
cargo test --workspace
```

### WASM Tests (Browser)
```bash
wasm-pack test --headless --chrome crates/expense-optimizer
wasm-pack test --headless --chrome crates/finance-core
wasm-pack test --headless --chrome crates/media-processor
```

### Integration Tests
```bash
cargo test --test integration
```

### Performance Benchmarks
```bash
cargo bench --workspace
```

### Build Verification
```bash
./scripts/build-wasm.sh
# Verify bundle sizes:
# expense-optimizer: ~50KB
# finance-core: ~30KB
# media-processor: ~300KB
```

### End-to-End Test
1. Run Next.js dev server
2. Navigate to Finances page
3. Create expenses, verify split calculations
4. Trigger settle-up, verify debt optimization
5. Upload photos to Gallery, verify processing
6. Verify MCP endpoints respond correctly

---

## Critical Files Summary

| File | Purpose |
|------|---------|
| `crates/Cargo.toml` | Workspace root configuration |
| `crates/expense-optimizer/src/simplify.rs` | Debt simplification algorithm |
| `crates/finance-core/src/split.rs` | Expense splitting with remainder |
| `crates/finance-core/src/balance.rs` | Balance calculation engine |
| `crates/media-processor/src/lib.rs` | Media processing WASM entry |
| `crates/mcp-servers/wit/*.wit` | WIT interface definitions |
| `apps/web/lib/wasm/*.ts` | TypeScript WASM wrappers |
| `scripts/build-wasm.sh` | Build automation |

---

## Story Count Summary

| Phase | Stories | Completed | Status |
|-------|---------|-----------|--------|
| Phase 1: Debt Simplification | 5 | 5 | ✅ COMPLETE |
| Phase 2: Financial Core | 5 | 5 | ✅ COMPLETE |
| Phase 3: Media Processing | 6 | 6 | ✅ COMPLETE |
| Phase 4: MCP Servers | 4 | 4 | ✅ COMPLETE |
| **Total** | **20** | **20** | **100%** |

All stories are independently testable with Given/When/Then test cases.

### Next.js Integration (apps/web/)

The following TypeScript files were created to complete MEDIA-006 and MCP-004:

| File | Purpose |
|------|---------|
| `apps/web/lib/wasm/types.ts` | TypeScript interfaces for all WASM types |
| `apps/web/lib/wasm/media-processor.ts` | Lazy loading wrapper for media-processor |
| `apps/web/lib/wasm/expense-optimizer.ts` | Wrapper for expense-optimizer |
| `apps/web/lib/wasm/finance-core.ts` | Wrapper for finance-core |
| `apps/web/app/api/mcp/expense-optimizer/route.ts` | Edge API route for debt optimization |
| `apps/web/app/api/mcp/payment-links/route.ts` | Edge API route for payment links |
| `vercel.json` | Vercel deployment configuration |
