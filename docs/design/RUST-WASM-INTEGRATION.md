# Steamboat Platform - Rust & WASM Integration Plan

## Overview

This document outlines a comprehensive strategy for integrating Rust and WebAssembly (WASM) into the Steamboat bachelor party platform. The goal is to leverage Rust's performance, memory safety, and portability to enhance critical components while maintaining the existing Next.js architecture.

**Last Updated:** January 13, 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: Debt Simplification Engine](#phase-1-debt-simplification-engine)
4. [Phase 2: Financial Core Module](#phase-2-financial-core-module)
5. [Phase 3: Media Processing Pipeline](#phase-3-media-processing-pipeline)
6. [Phase 4: MCP Servers as WASM Components](#phase-4-mcp-servers-as-wasm-components)
7. [Hybrid Bundle Loading Strategy](#hybrid-bundle-loading-strategy)
8. [Build Pipeline & Tooling](#build-pipeline--tooling)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Considerations](#deployment-considerations)
11. [Cost-Benefit Analysis](#cost-benefit-analysis)

---

## Executive Summary

### Why Rust + WASM for Steamboat?

| Motivation | Benefit |
|------------|---------|
| **Performance** | 10-100x faster than JS for compute-heavy operations (debt optimization, image processing) |
| **Code Reuse** | Single Rust codebase runs client-side (WASM) and server-side (native) |
| **Safety** | Memory-safe financial calculations with no floating-point bugs |
| **Future-Proofing** | Ready for edge computing (WASI 0.3), Component Model, and containerless deployment |

### Priority Matrix

| Phase | Component | Priority | Bundle Size | Loading |
|-------|-----------|----------|-------------|---------|
| 1 | Debt Simplification | P0 | ~50KB | **Eager** |
| 2 | Financial Core | P0 | ~30KB | **Eager** |
| 3 | Media Processing | P1 | ~300KB | **Lazy** |
| 4 | MCP WASM Components | P2 | ~100KB | Server-side |

### Key Technology Choices (2026)

- **WASI 0.3** - Stable async support (released Nov 2025)
- **Component Model** - Language-agnostic module composition
- **wasm-bindgen** - Rust↔JavaScript interop
- **cargo-component** - Build WASM components
- **WasmEdge/SpinKube** - Edge/serverless deployment

---

## Architecture Overview

### Project Structure

```
steamboat/
├── apps/
│   └── web/                          # Next.js app
│       ├── app/
│       │   ├── api/
│       │   │   └── agents/           # Agent API routes
│       │   └── ...
│       ├── lib/
│       │   ├── wasm/                 # WASM loaders & bindings
│       │   │   ├── expense-optimizer.ts
│       │   │   ├── finance-core.ts
│       │   │   └── media-processor.ts
│       │   └── ...
│       └── public/
│           └── wasm/                 # WASM binaries (copied at build)
│               ├── expense_optimizer_bg.wasm
│               ├── finance_core_bg.wasm
│               └── media_processor_bg.wasm
├── crates/                           # Rust workspace
│   ├── Cargo.toml                    # Workspace root
│   ├── expense-optimizer/            # Phase 1: Debt simplification
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── debt_graph.rs
│   │   │   └── simplify.rs
│   │   └── tests/
│   ├── finance-core/                 # Phase 2: Decimal arithmetic
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── decimal.rs
│   │       ├── split.rs
│   │       └── balance.rs
│   ├── media-processor/              # Phase 3: Image processing
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── resize.rs
│   │       ├── exif.rs
│   │       └── thumbnail.rs
│   └── mcp-servers/                  # Phase 4: WASM Components
│       ├── expense-optimizer-mcp/
│       └── payment-links-mcp/
├── packages/
│   └── wasm-types/                   # Shared TypeScript types
│       └── src/
│           └── index.ts
├── scripts/
│   └── build-wasm.sh                 # WASM build script
└── turbo.json                        # Turborepo config
```

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                                  │
│                                                                         │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │   React/Next.js  │    │   WASM Modules   │    │   Service Worker │  │
│  │   UI Components  │◄──►│  (Eager + Lazy)  │    │   (Cache WASM)   │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘  │
│           │                       │                                     │
│           │    ┌──────────────────┴──────────────────┐                 │
│           │    │         WASM Module Registry        │                 │
│           │    │                                     │                 │
│           │    │  ┌─────────────┐ ┌─────────────┐   │                 │
│           │    │  │  expense-   │ │  finance-   │   │  ← Eager Load   │
│           │    │  │  optimizer  │ │   core      │   │                 │
│           │    │  │   (~50KB)   │ │  (~30KB)    │   │                 │
│           │    │  └─────────────┘ └─────────────┘   │                 │
│           │    │                                     │                 │
│           │    │  ┌─────────────┐                   │                 │
│           │    │  │   media-    │                   │  ← Lazy Load    │
│           │    │  │  processor  │                   │    on Gallery   │
│           │    │  │  (~300KB)   │                   │                 │
│           │    │  └─────────────┘                   │                 │
│           │    └─────────────────────────────────────┘                 │
└───────────┼─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Server (Vercel)                                   │
│                                                                         │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │   Next.js API    │    │  Native Rust     │    │   Claude Agent   │  │
│  │   Routes         │◄──►│  (Validation)    │◄──►│   SDK            │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘  │
│           │                                               │             │
│           ▼                                               ▼             │
│  ┌──────────────────┐                        ┌──────────────────────┐  │
│  │   MongoDB        │                        │   MCP WASM Servers   │  │
│  │   (Tenant Data)  │                        │   (Edge Runtime)     │  │
│  └──────────────────┘                        └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Debt Simplification Engine

### Problem Statement

The expense reconciliation feature requires minimizing the number of transactions to settle debts among 10-20 attendees. This is an NP-complete problem (similar to the Subset Sum Problem) requiring optimization algorithms.

### Current Implementation

Currently planned as a JavaScript MCP server calling Claude for calculations. This has:
- Network latency for each calculation
- AI token costs (~$0.015 per settle-up view)
- Non-deterministic results

### Rust/WASM Solution

A deterministic, client-side debt simplification algorithm with server-side validation.

### Detailed Implementation

#### 1.1 Rust Crate Structure

```rust
// crates/expense-optimizer/Cargo.toml
[package]
name = "expense-optimizer"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[features]
default = ["wasm"]
wasm = ["wasm-bindgen", "console_error_panic_hook"]

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
wasm-bindgen = { version = "0.2", optional = true }
console_error_panic_hook = { version = "0.1", optional = true }

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
strip = true
```

#### 1.2 Data Types

```rust
// crates/expense-optimizer/src/lib.rs
use serde::{Deserialize, Serialize};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/// Represents a debt relationship: `debtor` owes `creditor` the `amount` (in cents)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Debt {
    pub debtor: String,      // Attendee ID who owes money
    pub creditor: String,    // Attendee ID who is owed
    pub amount_cents: i64,   // Amount in cents (avoid floating point)
    pub expense_ids: Vec<String>, // Contributing expense IDs
}

/// Represents a payment instruction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub from: String,        // Who pays
    pub to: String,          // Who receives
    pub amount_cents: i64,   // Amount in cents
    pub reason: String,      // Human-readable explanation
}

/// Result of debt simplification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimplificationResult {
    pub original_count: usize,
    pub optimized_count: usize,
    pub payments: Vec<Payment>,
    pub savings_percent: f64,
}
```

#### 1.3 Core Algorithm

```rust
// crates/expense-optimizer/src/simplify.rs
use crate::{Debt, Payment, SimplificationResult};
use std::collections::HashMap;

/// Simplifies a list of debts into minimal payments using a greedy network flow approach.
///
/// Algorithm:
/// 1. Calculate net balance for each person (positive = owed money, negative = owes money)
/// 2. Separate into creditors (positive balance) and debtors (negative balance)
/// 3. Greedily match largest creditor with largest debtor
/// 4. Repeat until all balances are zero
pub fn simplify_debts(debts: &[Debt]) -> SimplificationResult {
    let original_count = debts.len();

    // Step 1: Calculate net balances
    let mut balances: HashMap<String, i64> = HashMap::new();
    let mut debt_sources: HashMap<(String, String), Vec<String>> = HashMap::new();

    for debt in debts {
        *balances.entry(debt.creditor.clone()).or_insert(0) += debt.amount_cents;
        *balances.entry(debt.debtor.clone()).or_insert(0) -= debt.amount_cents;

        debt_sources
            .entry((debt.debtor.clone(), debt.creditor.clone()))
            .or_insert_with(Vec::new)
            .extend(debt.expense_ids.clone());
    }

    // Step 2: Separate into creditors and debtors
    let mut creditors: Vec<(String, i64)> = balances
        .iter()
        .filter(|(_, &b)| b > 0)
        .map(|(k, &v)| (k.clone(), v))
        .collect();

    let mut debtors: Vec<(String, i64)> = balances
        .iter()
        .filter(|(_, &b)| b < 0)
        .map(|(k, &v)| (k.clone(), -v)) // Make positive for easier math
        .collect();

    // Sort by amount (descending) for greedy matching
    creditors.sort_by(|a, b| b.1.cmp(&a.1));
    debtors.sort_by(|a, b| b.1.cmp(&a.1));

    // Step 3: Greedy matching
    let mut payments: Vec<Payment> = Vec::new();
    let mut cred_idx = 0;
    let mut debt_idx = 0;

    while cred_idx < creditors.len() && debt_idx < debtors.len() {
        let (cred_id, cred_amt) = &mut creditors[cred_idx];
        let (debt_id, debt_amt) = &mut debtors[debt_idx];

        let transfer = (*cred_amt).min(*debt_amt);

        if transfer > 0 {
            // Build reason string from contributing expenses
            let reason = build_reason(&debt_sources, debt_id, cred_id, transfer);

            payments.push(Payment {
                from: debt_id.clone(),
                to: cred_id.clone(),
                amount_cents: transfer,
                reason,
            });

            *cred_amt -= transfer;
            *debt_amt -= transfer;
        }

        if *cred_amt == 0 {
            cred_idx += 1;
        }
        if *debt_amt == 0 {
            debt_idx += 1;
        }
    }

    let optimized_count = payments.len();
    let savings_percent = if original_count > 0 {
        ((original_count - optimized_count) as f64 / original_count as f64) * 100.0
    } else {
        0.0
    };

    SimplificationResult {
        original_count,
        optimized_count,
        payments,
        savings_percent,
    }
}

fn build_reason(
    debt_sources: &HashMap<(String, String), Vec<String>>,
    debtor: &str,
    creditor: &str,
    _amount: i64,
) -> String {
    if let Some(expense_ids) = debt_sources.get(&(debtor.to_string(), creditor.to_string())) {
        format!("Consolidates {} expense(s)", expense_ids.len())
    } else {
        "Optimized settlement".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_circular_debt() {
        // A owes B $100, B owes C $100, C owes A $100 → No payments needed!
        let debts = vec![
            Debt { debtor: "A".into(), creditor: "B".into(), amount_cents: 10000, expense_ids: vec![] },
            Debt { debtor: "B".into(), creditor: "C".into(), amount_cents: 10000, expense_ids: vec![] },
            Debt { debtor: "C".into(), creditor: "A".into(), amount_cents: 10000, expense_ids: vec![] },
        ];

        let result = simplify_debts(&debts);
        assert_eq!(result.optimized_count, 0);
        assert_eq!(result.savings_percent, 100.0);
    }

    #[test]
    fn test_multiple_to_one() {
        // A owes C $50, B owes C $50 → Two payments, cannot simplify
        let debts = vec![
            Debt { debtor: "A".into(), creditor: "C".into(), amount_cents: 5000, expense_ids: vec![] },
            Debt { debtor: "B".into(), creditor: "C".into(), amount_cents: 5000, expense_ids: vec![] },
        ];

        let result = simplify_debts(&debts);
        assert_eq!(result.optimized_count, 2);
    }

    #[test]
    fn test_chain_simplification() {
        // A owes B $100, B owes C $100 → A pays C $100 directly
        let debts = vec![
            Debt { debtor: "A".into(), creditor: "B".into(), amount_cents: 10000, expense_ids: vec![] },
            Debt { debtor: "B".into(), creditor: "C".into(), amount_cents: 10000, expense_ids: vec![] },
        ];

        let result = simplify_debts(&debts);
        assert_eq!(result.optimized_count, 1);
        assert_eq!(result.payments[0].from, "A");
        assert_eq!(result.payments[0].to, "C");
        assert_eq!(result.payments[0].amount_cents, 10000);
    }
}
```

#### 1.4 WASM Bindings

```rust
// crates/expense-optimizer/src/wasm.rs
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

use crate::{simplify::simplify_debts, Debt, SimplificationResult};

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Optimizes debt settlements from JSON input.
///
/// # Arguments
/// * `debts_json` - JSON array of Debt objects
///
/// # Returns
/// JSON string of SimplificationResult
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn optimize_settlements(debts_json: &str) -> Result<String, JsValue> {
    let debts: Vec<Debt> = serde_json::from_str(debts_json)
        .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;

    let result = simplify_debts(&debts);

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialize error: {}", e)))
}

/// Validates that debts balance to zero (for integrity check)
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn validate_debts(debts_json: &str) -> Result<bool, JsValue> {
    let debts: Vec<Debt> = serde_json::from_str(debts_json)
        .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;

    let mut sum: i64 = 0;
    for debt in &debts {
        sum += debt.amount_cents; // Creditor gains
        sum -= debt.amount_cents; // Debtor loses (cancels out)
    }

    Ok(sum == 0)
}
```

#### 1.5 Next.js Integration

```typescript
// apps/web/lib/wasm/expense-optimizer.ts
import type { Debt, SimplificationResult } from '@steamboat/wasm-types';

let wasmModule: typeof import('expense-optimizer') | null = null;
let loadPromise: Promise<void> | null = null;

/**
 * Load the expense optimizer WASM module.
 * This is called eagerly on app init for critical modules.
 */
export async function loadExpenseOptimizer(): Promise<void> {
  if (wasmModule) return;

  if (!loadPromise) {
    loadPromise = (async () => {
      const wasm = await import('expense-optimizer');
      await wasm.default(); // Initialize WASM
      wasmModule = wasm;
    })();
  }

  await loadPromise;
}

/**
 * Optimize settlements using the WASM module.
 * Falls back to server-side calculation if WASM fails.
 */
export async function optimizeSettlements(
  debts: Debt[]
): Promise<SimplificationResult> {
  try {
    await loadExpenseOptimizer();

    if (!wasmModule) {
      throw new Error('WASM module not loaded');
    }

    const result = wasmModule.optimize_settlements(JSON.stringify(debts));
    return JSON.parse(result);
  } catch (error) {
    console.warn('WASM optimization failed, falling back to server:', error);
    return serverSideFallback(debts);
  }
}

/**
 * Validate that debts balance correctly.
 */
export async function validateDebts(debts: Debt[]): Promise<boolean> {
  await loadExpenseOptimizer();

  if (!wasmModule) {
    return true; // Skip validation if WASM unavailable
  }

  return wasmModule.validate_debts(JSON.stringify(debts));
}

// Server-side fallback (same Rust code compiled to native)
async function serverSideFallback(debts: Debt[]): Promise<SimplificationResult> {
  const response = await fetch('/api/agents/expense-reconciler', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ debts }),
  });

  return response.json();
}
```

#### 1.6 React Hook

```typescript
// apps/web/hooks/useExpenseOptimizer.ts
import { useQuery } from '@tanstack/react-query';
import { optimizeSettlements, loadExpenseOptimizer } from '@/lib/wasm/expense-optimizer';
import type { Debt, SimplificationResult } from '@steamboat/wasm-types';

// Preload WASM on app initialization
if (typeof window !== 'undefined') {
  loadExpenseOptimizer();
}

export function useExpenseOptimizer(debts: Debt[] | undefined) {
  return useQuery<SimplificationResult>({
    queryKey: ['expense-optimization', debts],
    queryFn: () => optimizeSettlements(debts!),
    enabled: !!debts && debts.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
  });
}
```

---

## Phase 2: Financial Core Module

### Problem Statement

Financial calculations require:
- Exact decimal arithmetic (no floating-point rounding errors)
- Fair expense splitting (handling remainders)
- Deterministic balance calculations
- Currency conversion support

### Detailed Implementation

#### 2.1 Rust Crate Structure

```rust
// crates/finance-core/Cargo.toml
[package]
name = "finance-core"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[features]
default = ["wasm"]
wasm = ["wasm-bindgen", "console_error_panic_hook"]

[dependencies]
rust_decimal = "1.33"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
wasm-bindgen = { version = "0.2", optional = true }
console_error_panic_hook = { version = "0.1", optional = true }

[profile.release]
opt-level = "z"
lto = true
```

#### 2.2 Core Types

```rust
// crates/finance-core/src/lib.rs
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

/// Monetary amount in cents (integer to avoid floating point)
pub type Cents = i64;

/// Represents an expense with opt-in participants
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Expense {
    pub id: String,
    pub payer_id: String,
    pub amount_cents: Cents,
    pub participants: Vec<String>, // Attendee IDs who opted in
    pub category: String,
    pub description: String,
}

/// Per-person share calculation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareResult {
    pub per_person_cents: Cents,
    pub shares: Vec<PersonShare>,
    pub remainder_cents: Cents,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonShare {
    pub attendee_id: String,
    pub share_cents: Cents,
    pub extra_cent: bool, // True if this person gets +1 cent for remainder
}

/// Balance summary for an attendee
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceSummary {
    pub attendee_id: String,
    pub total_paid_cents: Cents,
    pub total_owed_cents: Cents,
    pub net_balance_cents: Cents, // Positive = owed money, Negative = owes money
}
```

#### 2.3 Expense Splitting Logic

```rust
// crates/finance-core/src/split.rs
use crate::{Cents, Expense, PersonShare, ShareResult};

/// Splits an expense among participants with fair remainder distribution.
///
/// Algorithm:
/// 1. Calculate base share (total / num_participants)
/// 2. Calculate remainder (total % num_participants)
/// 3. Distribute remainder cents to first N participants
///
/// This ensures total always equals sum of shares.
pub fn split_expense(expense: &Expense) -> ShareResult {
    let num_participants = expense.participants.len() as i64;

    if num_participants == 0 {
        return ShareResult {
            per_person_cents: 0,
            shares: vec![],
            remainder_cents: 0,
        };
    }

    let base_share = expense.amount_cents / num_participants;
    let remainder = expense.amount_cents % num_participants;

    let shares: Vec<PersonShare> = expense
        .participants
        .iter()
        .enumerate()
        .map(|(i, attendee_id)| {
            let extra = (i as i64) < remainder;
            PersonShare {
                attendee_id: attendee_id.clone(),
                share_cents: base_share + if extra { 1 } else { 0 },
                extra_cent: extra,
            }
        })
        .collect();

    ShareResult {
        per_person_cents: base_share,
        shares,
        remainder_cents: remainder,
    }
}

/// Recalculates shares when participants change.
pub fn recalculate_on_participant_change(
    expense: &Expense,
    added: Option<&str>,
    removed: Option<&str>,
) -> ShareResult {
    let mut new_expense = expense.clone();

    if let Some(id) = removed {
        new_expense.participants.retain(|p| p != id);
    }

    if let Some(id) = added {
        if !new_expense.participants.contains(&id.to_string()) {
            new_expense.participants.push(id.to_string());
        }
    }

    split_expense(&new_expense)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_even_split() {
        let expense = Expense {
            id: "1".into(),
            payer_id: "A".into(),
            amount_cents: 10000, // $100.00
            participants: vec!["A".into(), "B".into(), "C".into(), "D".into()],
            category: "Food".into(),
            description: "Dinner".into(),
        };

        let result = split_expense(&expense);
        assert_eq!(result.per_person_cents, 2500); // $25.00 each
        assert_eq!(result.remainder_cents, 0);

        let total: i64 = result.shares.iter().map(|s| s.share_cents).sum();
        assert_eq!(total, 10000);
    }

    #[test]
    fn test_uneven_split() {
        let expense = Expense {
            id: "2".into(),
            payer_id: "A".into(),
            amount_cents: 10001, // $100.01
            participants: vec!["A".into(), "B".into(), "C".into()],
            category: "Food".into(),
            description: "Dinner".into(),
        };

        let result = split_expense(&expense);
        assert_eq!(result.per_person_cents, 3333); // $33.33 base
        assert_eq!(result.remainder_cents, 2);     // 2 cents remainder

        // First two participants get extra cent
        assert!(result.shares[0].extra_cent);
        assert!(result.shares[1].extra_cent);
        assert!(!result.shares[2].extra_cent);

        let total: i64 = result.shares.iter().map(|s| s.share_cents).sum();
        assert_eq!(total, 10001);
    }
}
```

#### 2.4 Balance Calculation

```rust
// crates/finance-core/src/balance.rs
use crate::{BalanceSummary, Cents, Expense};
use crate::split::split_expense;
use std::collections::HashMap;

/// Calculates balance summary for all attendees.
pub fn calculate_all_balances(expenses: &[Expense]) -> Vec<BalanceSummary> {
    let mut paid: HashMap<String, Cents> = HashMap::new();
    let mut owed: HashMap<String, Cents> = HashMap::new();
    let mut all_attendees: std::collections::HashSet<String> = std::collections::HashSet::new();

    for expense in expenses {
        // Track who paid
        *paid.entry(expense.payer_id.clone()).or_insert(0) += expense.amount_cents;
        all_attendees.insert(expense.payer_id.clone());

        // Track who owes (their share)
        let shares = split_expense(expense);
        for share in shares.shares {
            *owed.entry(share.attendee_id.clone()).or_insert(0) += share.share_cents;
            all_attendees.insert(share.attendee_id);
        }
    }

    all_attendees
        .into_iter()
        .map(|id| {
            let total_paid = *paid.get(&id).unwrap_or(&0);
            let total_owed = *owed.get(&id).unwrap_or(&0);
            BalanceSummary {
                attendee_id: id,
                total_paid_cents: total_paid,
                total_owed_cents: total_owed,
                net_balance_cents: total_paid - total_owed,
            }
        })
        .collect()
}

/// Calculates balance for a single attendee (more efficient for single lookup).
pub fn calculate_balance(expenses: &[Expense], attendee_id: &str) -> BalanceSummary {
    let mut total_paid: Cents = 0;
    let mut total_owed: Cents = 0;

    for expense in expenses {
        if expense.payer_id == attendee_id {
            total_paid += expense.amount_cents;
        }

        let shares = split_expense(expense);
        for share in shares.shares {
            if share.attendee_id == attendee_id {
                total_owed += share.share_cents;
            }
        }
    }

    BalanceSummary {
        attendee_id: attendee_id.to_string(),
        total_paid_cents: total_paid,
        total_owed_cents: total_owed,
        net_balance_cents: total_paid - total_owed,
    }
}
```

#### 2.5 WASM Bindings

```rust
// crates/finance-core/src/wasm.rs
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

use crate::{balance, split, BalanceSummary, Expense, ShareResult};

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn split_expense_wasm(expense_json: &str) -> Result<String, JsValue> {
    let expense: Expense = serde_json::from_str(expense_json)
        .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;

    let result = split::split_expense(&expense);

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialize error: {}", e)))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn calculate_all_balances_wasm(expenses_json: &str) -> Result<String, JsValue> {
    let expenses: Vec<Expense> = serde_json::from_str(expenses_json)
        .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;

    let result = balance::calculate_all_balances(&expenses);

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialize error: {}", e)))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn calculate_balance_wasm(
    expenses_json: &str,
    attendee_id: &str,
) -> Result<String, JsValue> {
    let expenses: Vec<Expense> = serde_json::from_str(expenses_json)
        .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;

    let result = balance::calculate_balance(&expenses, attendee_id);

    serde_json::to_string(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialize error: {}", e)))
}
```

---

## Phase 3: Media Processing Pipeline

### Problem Statement

The gallery expects 100-500 photos/videos with:
- Client-side optimization before upload (reduce bandwidth)
- EXIF extraction for auto-tagging
- Thumbnail generation
- Duplicate detection

### Detailed Implementation

#### 3.1 Rust Crate Structure

```rust
// crates/media-processor/Cargo.toml
[package]
name = "media-processor"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[features]
default = ["wasm"]
wasm = ["wasm-bindgen", "console_error_panic_hook", "web-sys"]

[dependencies]
image = { version = "0.25", default-features = false, features = ["jpeg", "png", "webp"] }
kamadak-exif = "0.5"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
wasm-bindgen = { version = "0.2", optional = true }
console_error_panic_hook = { version = "0.1", optional = true }
web-sys = { version = "0.3", optional = true, features = ["console"] }
sha2 = "0.10"  # For duplicate detection

[profile.release]
opt-level = "z"
lto = true
```

#### 3.2 Image Processing

```rust
// crates/media-processor/src/resize.rs
use image::{DynamicImage, ImageFormat, GenericImageView};

/// Image processing options
pub struct ProcessOptions {
    pub max_width: u32,
    pub max_height: u32,
    pub quality: u8,       // JPEG quality 0-100
    pub format: OutputFormat,
}

pub enum OutputFormat {
    Jpeg,
    WebP,
    Png,
}

impl Default for ProcessOptions {
    fn default() -> Self {
        Self {
            max_width: 2048,
            max_height: 2048,
            quality: 85,
            format: OutputFormat::Jpeg,
        }
    }
}

/// Processing result with metadata
pub struct ProcessResult {
    pub data: Vec<u8>,
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub original_size: usize,
    pub processed_size: usize,
    pub size_reduction_percent: f64,
}

/// Process an image with the given options.
pub fn process_image(data: &[u8], options: &ProcessOptions) -> Result<ProcessResult, String> {
    let original_size = data.len();

    // Load image
    let img = image::load_from_memory(data)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let (orig_width, orig_height) = img.dimensions();

    // Calculate new dimensions maintaining aspect ratio
    let (new_width, new_height) = calculate_dimensions(
        orig_width,
        orig_height,
        options.max_width,
        options.max_height,
    );

    // Resize if needed
    let processed = if new_width != orig_width || new_height != orig_height {
        img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3)
    } else {
        img
    };

    // Encode to output format
    let mut output = Vec::new();
    let format_str = match options.format {
        OutputFormat::Jpeg => {
            let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
                &mut output,
                options.quality,
            );
            processed.write_with_encoder(encoder)
                .map_err(|e| format!("Encode error: {}", e))?;
            "jpeg"
        }
        OutputFormat::WebP => {
            // WebP encoding
            processed.write_to(
                &mut std::io::Cursor::new(&mut output),
                ImageFormat::WebP,
            ).map_err(|e| format!("Encode error: {}", e))?;
            "webp"
        }
        OutputFormat::Png => {
            processed.write_to(
                &mut std::io::Cursor::new(&mut output),
                ImageFormat::Png,
            ).map_err(|e| format!("Encode error: {}", e))?;
            "png"
        }
    };

    let processed_size = output.len();
    let size_reduction = if original_size > 0 {
        ((original_size - processed_size) as f64 / original_size as f64) * 100.0
    } else {
        0.0
    };

    Ok(ProcessResult {
        data: output,
        width: new_width,
        height: new_height,
        format: format_str.to_string(),
        original_size,
        processed_size,
        size_reduction_percent: size_reduction,
    })
}

fn calculate_dimensions(
    orig_width: u32,
    orig_height: u32,
    max_width: u32,
    max_height: u32,
) -> (u32, u32) {
    if orig_width <= max_width && orig_height <= max_height {
        return (orig_width, orig_height);
    }

    let width_ratio = max_width as f64 / orig_width as f64;
    let height_ratio = max_height as f64 / orig_height as f64;
    let ratio = width_ratio.min(height_ratio);

    (
        (orig_width as f64 * ratio).round() as u32,
        (orig_height as f64 * ratio).round() as u32,
    )
}

/// Generate a thumbnail
pub fn generate_thumbnail(data: &[u8], size: u32) -> Result<Vec<u8>, String> {
    let img = image::load_from_memory(data)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let thumbnail = img.thumbnail(size, size);

    let mut output = Vec::new();
    thumbnail.write_to(
        &mut std::io::Cursor::new(&mut output),
        ImageFormat::Jpeg,
    ).map_err(|e| format!("Encode error: {}", e))?;

    Ok(output)
}
```

#### 3.3 EXIF Extraction

```rust
// crates/media-processor/src/exif.rs
use kamadak_exif::{In, Reader, Tag};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExifData {
    pub date_taken: Option<String>,
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub gps_latitude: Option<f64>,
    pub gps_longitude: Option<f64>,
    pub orientation: Option<u32>,
}

/// Extract EXIF metadata from image bytes.
pub fn extract_exif(data: &[u8]) -> ExifData {
    let mut cursor = std::io::Cursor::new(data);
    let reader = match Reader::new().read_from_container(&mut cursor) {
        Ok(r) => r,
        Err(_) => return ExifData::default(),
    };

    let mut exif = ExifData::default();

    // Date taken
    if let Some(field) = reader.get_field(Tag::DateTimeOriginal, In::PRIMARY) {
        exif.date_taken = Some(field.display_value().to_string());
    }

    // Camera info
    if let Some(field) = reader.get_field(Tag::Make, In::PRIMARY) {
        exif.camera_make = Some(field.display_value().to_string());
    }
    if let Some(field) = reader.get_field(Tag::Model, In::PRIMARY) {
        exif.camera_model = Some(field.display_value().to_string());
    }

    // GPS coordinates
    exif.gps_latitude = extract_gps_coord(&reader, Tag::GPSLatitude, Tag::GPSLatitudeRef);
    exif.gps_longitude = extract_gps_coord(&reader, Tag::GPSLongitude, Tag::GPSLongitudeRef);

    // Orientation (for auto-rotation)
    if let Some(field) = reader.get_field(Tag::Orientation, In::PRIMARY) {
        if let kamadak_exif::Value::Short(ref v) = field.value {
            exif.orientation = v.first().map(|&o| o as u32);
        }
    }

    exif
}

fn extract_gps_coord(
    reader: &kamadak_exif::Exif,
    coord_tag: Tag,
    ref_tag: Tag,
) -> Option<f64> {
    let coord_field = reader.get_field(coord_tag, In::PRIMARY)?;
    let ref_field = reader.get_field(ref_tag, In::PRIMARY)?;

    // Parse degrees/minutes/seconds format
    if let kamadak_exif::Value::Rational(ref rationals) = coord_field.value {
        if rationals.len() >= 3 {
            let degrees = rationals[0].to_f64();
            let minutes = rationals[1].to_f64();
            let seconds = rationals[2].to_f64();

            let mut decimal = degrees + minutes / 60.0 + seconds / 3600.0;

            // Apply reference (N/S for latitude, E/W for longitude)
            let ref_str = ref_field.display_value().to_string();
            if ref_str.contains('S') || ref_str.contains('W') {
                decimal = -decimal;
            }

            return Some(decimal);
        }
    }

    None
}

impl Default for ExifData {
    fn default() -> Self {
        Self {
            date_taken: None,
            camera_make: None,
            camera_model: None,
            gps_latitude: None,
            gps_longitude: None,
            orientation: None,
        }
    }
}
```

#### 3.4 Lazy Loading Integration

```typescript
// apps/web/lib/wasm/media-processor.ts
import type { ExifData, ProcessResult } from '@steamboat/wasm-types';

let wasmModule: typeof import('media-processor') | null = null;
let loadPromise: Promise<void> | null = null;

/**
 * Lazy load the media processor WASM module.
 * Only called when user accesses gallery upload functionality.
 */
export async function loadMediaProcessor(): Promise<void> {
  if (wasmModule) return;

  if (!loadPromise) {
    loadPromise = (async () => {
      // Dynamic import - not included in main bundle
      const wasm = await import('media-processor');
      await wasm.default();
      wasmModule = wasm;
    })();
  }

  await loadPromise;
}

/**
 * Check if media processor is loaded.
 */
export function isMediaProcessorLoaded(): boolean {
  return wasmModule !== null;
}

/**
 * Process image before upload.
 */
export async function processImage(
  data: Uint8Array,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'webp' | 'png';
  }
): Promise<ProcessResult> {
  await loadMediaProcessor();

  if (!wasmModule) {
    throw new Error('Media processor not loaded');
  }

  const optionsJson = JSON.stringify({
    max_width: options?.maxWidth ?? 2048,
    max_height: options?.maxHeight ?? 2048,
    quality: options?.quality ?? 85,
    format: options?.format ?? 'jpeg',
  });

  const resultJson = wasmModule.process_image(data, optionsJson);
  return JSON.parse(resultJson);
}

/**
 * Extract EXIF metadata for auto-tagging.
 */
export async function extractExif(data: Uint8Array): Promise<ExifData> {
  await loadMediaProcessor();

  if (!wasmModule) {
    return {}; // Return empty if WASM unavailable
  }

  const resultJson = wasmModule.extract_exif(data);
  return JSON.parse(resultJson);
}

/**
 * Generate thumbnail for preview.
 */
export async function generateThumbnail(
  data: Uint8Array,
  size: number = 200
): Promise<Uint8Array> {
  await loadMediaProcessor();

  if (!wasmModule) {
    throw new Error('Media processor not loaded');
  }

  return wasmModule.generate_thumbnail(data, size);
}
```

---

## Phase 4: MCP Servers as WASM Components

### Overview

Migrate JavaScript MCP servers to Rust WASM Components for:
- <1ms cold starts (vs 500-1000ms for Node.js)
- Strong sandboxing
- Portable deployment (edge, serverless, Kubernetes)

### Implementation Approach

#### 4.1 WASM Component Model Setup

```rust
// crates/mcp-servers/expense-optimizer-mcp/Cargo.toml
[package]
name = "expense-optimizer-mcp"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
expense-optimizer = { path = "../../expense-optimizer" }
wit-bindgen = "0.32"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[package.metadata.component]
package = "steamboat:mcp-expense-optimizer"
```

#### 4.2 WIT Interface Definition

```wit
// crates/mcp-servers/wit/mcp-server.wit
package steamboat:mcp-server;

interface types {
    record mcp-request {
        method: string,
        params: string,  // JSON string
    }

    record mcp-response {
        success: bool,
        result: option<string>,  // JSON string
        error: option<string>,
    }
}

interface handler {
    use types.{mcp-request, mcp-response};

    handle: func(request: mcp-request) -> mcp-response;
}

world mcp-server {
    export handler;
}
```

#### 4.3 Component Implementation

```rust
// crates/mcp-servers/expense-optimizer-mcp/src/lib.rs
wit_bindgen::generate!({
    world: "mcp-server",
    path: "../wit",
});

use exports::steamboat::mcp_server::handler::{Guest, McpRequest, McpResponse};
use expense_optimizer::{simplify_debts, Debt};

struct ExpenseOptimizerMcp;

impl Guest for ExpenseOptimizerMcp {
    fn handle(request: McpRequest) -> McpResponse {
        match request.method.as_str() {
            "optimize_settlements" => {
                match serde_json::from_str::<Vec<Debt>>(&request.params) {
                    Ok(debts) => {
                        let result = simplify_debts(&debts);
                        McpResponse {
                            success: true,
                            result: Some(serde_json::to_string(&result).unwrap()),
                            error: None,
                        }
                    }
                    Err(e) => McpResponse {
                        success: false,
                        result: None,
                        error: Some(format!("Parse error: {}", e)),
                    },
                }
            }
            _ => McpResponse {
                success: false,
                result: None,
                error: Some(format!("Unknown method: {}", request.method)),
            },
        }
    }
}

export!(ExpenseOptimizerMcp);
```

#### 4.4 Deployment Options

| Platform | Runtime | Cold Start | Notes |
|----------|---------|------------|-------|
| Vercel Edge | WasmEdge | <1ms | Native integration |
| Cloudflare Workers | V8 WASM | <1ms | Excellent performance |
| AWS Lambda | WasmEdge | 10-50ms | With SnapStart |
| SpinKube (K8s) | Spin | <1ms | For self-hosted |

---

## Hybrid Bundle Loading Strategy

### Strategy Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Initial Page Load                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  EAGER LOAD (Critical Path - ~80KB total):                      │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ expense-optimizer│  │  finance-core   │                       │
│  │     (~50KB)      │  │    (~30KB)      │                       │
│  └─────────────────┘  └─────────────────┘                       │
│                                                                  │
│  Loaded via: <link rel="modulepreload">                         │
│  Rationale: Used on every Finances page view                    │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAZY LOAD (On-Demand):                                         │
│                                                                  │
│  ┌─────────────────┐                                            │
│  │ media-processor │  Trigger: Gallery upload button click      │
│  │    (~300KB)     │  Preload: When hovering Gallery tab        │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// apps/web/lib/wasm/loader.ts

/**
 * WASM Module Loading Strategy
 *
 * EAGER: Loaded during app initialization
 * - expense-optimizer: Critical for Finances page
 * - finance-core: Critical for balance calculations
 *
 * LAZY: Loaded on-demand
 * - media-processor: Only needed for gallery uploads
 */

import { loadExpenseOptimizer } from './expense-optimizer';
import { loadFinanceCore } from './finance-core';

// Eager loading - called from _app.tsx or layout.tsx
export async function initializeWasm(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Load critical modules in parallel
  await Promise.all([
    loadExpenseOptimizer(),
    loadFinanceCore(),
  ]);

  console.log('Critical WASM modules loaded');
}

// Preload media processor on Gallery hover (reduces perceived latency)
export function preloadMediaProcessor(): void {
  if (typeof window === 'undefined') return;

  // Use link preload for WASM file
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = '/wasm/media_processor_bg.wasm';
  document.head.appendChild(link);
}
```

### Next.js Configuration

```javascript
// next.config.js
const CopyWebpackPlugin = require('copy-webpack-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Enable WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Copy WASM files to public directory
    if (!isServer) {
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: 'node_modules/expense-optimizer/*.wasm',
              to: 'static/wasm/[name][ext]',
            },
            {
              from: 'node_modules/finance-core/*.wasm',
              to: 'static/wasm/[name][ext]',
            },
            {
              from: 'node_modules/media-processor/*.wasm',
              to: 'static/wasm/[name][ext]',
            },
          ],
        })
      );
    }

    return config;
  },

  // Headers for WASM files
  async headers() {
    return [
      {
        source: '/wasm/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## Build Pipeline & Tooling

### Workspace Cargo.toml

```toml
# crates/Cargo.toml
[workspace]
resolver = "2"
members = [
    "expense-optimizer",
    "finance-core",
    "media-processor",
    "mcp-servers/expense-optimizer-mcp",
    "mcp-servers/payment-links-mcp",
]

[workspace.package]
version = "0.1.0"
edition = "2021"
license = "MIT"
repository = "https://github.com/yourorg/steamboat"

[workspace.dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
wasm-bindgen = "0.2"
console_error_panic_hook = "0.1"

[profile.release]
opt-level = "z"           # Optimize for size
lto = true                # Link-time optimization
codegen-units = 1         # Better optimization
panic = "abort"           # Smaller code
strip = true              # Strip symbols

[profile.release-native]
inherits = "release"
opt-level = 3             # Optimize for speed on server
```

### Build Script

```bash
#!/bin/bash
# scripts/build-wasm.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Building Rust WASM modules...${NC}"

# Navigate to crates directory
cd "$(dirname "$0")/../crates"

# Build each WASM package
for pkg in expense-optimizer finance-core media-processor; do
    echo -e "${YELLOW}Building $pkg...${NC}"

    wasm-pack build \
        --target web \
        --release \
        --out-dir "../packages/wasm-bindings/$pkg" \
        "./$pkg"

    # Optimize WASM with wasm-opt
    if command -v wasm-opt &> /dev/null; then
        echo -e "${YELLOW}Optimizing $pkg with wasm-opt...${NC}"
        wasm-opt -Oz \
            "../packages/wasm-bindings/$pkg/${pkg}_bg.wasm" \
            -o "../packages/wasm-bindings/$pkg/${pkg}_bg.wasm"
    fi

    # Print size
    SIZE=$(ls -lh "../packages/wasm-bindings/$pkg/${pkg}_bg.wasm" | awk '{print $5}')
    echo -e "${GREEN}✓ $pkg built: $SIZE${NC}"
done

# Build MCP Component servers
echo -e "${YELLOW}Building MCP WASM Components...${NC}"

for pkg in mcp-servers/expense-optimizer-mcp mcp-servers/payment-links-mcp; do
    echo -e "${YELLOW}Building $pkg...${NC}"

    cargo component build \
        --release \
        --manifest-path "./$pkg/Cargo.toml"

    echo -e "${GREEN}✓ $pkg built${NC}"
done

echo -e "${GREEN}All WASM modules built successfully!${NC}"
```

### Package.json Scripts

```json
{
  "scripts": {
    "build:wasm": "./scripts/build-wasm.sh",
    "build": "npm run build:wasm && next build",
    "dev": "next dev",
    "test:rust": "cd crates && cargo test",
    "test:wasm": "cd crates && wasm-pack test --headless --chrome"
  }
}
```

### Turborepo Configuration

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build:wasm": {
      "outputs": ["packages/wasm-bindings/**"],
      "inputs": ["crates/**/*.rs", "crates/**/Cargo.toml"]
    },
    "build": {
      "dependsOn": ["build:wasm"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "test:rust": {
      "inputs": ["crates/**/*.rs", "crates/**/Cargo.toml"]
    }
  }
}
```

---

## Testing Strategy

### Rust Unit Tests

```rust
// Run with: cargo test

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_expense_splitting() {
        // ... test code
    }
}
```

### WASM Integration Tests

```rust
// crates/expense-optimizer/tests/wasm.rs
#![cfg(target_arch = "wasm32")]

use wasm_bindgen_test::*;
use expense_optimizer::optimize_settlements;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_optimize_in_browser() {
    let debts_json = r#"[
        {"debtor": "A", "creditor": "B", "amount_cents": 10000, "expense_ids": []}
    ]"#;

    let result = optimize_settlements(debts_json).unwrap();
    let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

    assert_eq!(parsed["optimized_count"], 1);
}
```

### JavaScript/TypeScript Tests

```typescript
// apps/web/__tests__/wasm/expense-optimizer.test.ts
import { optimizeSettlements } from '@/lib/wasm/expense-optimizer';

describe('Expense Optimizer WASM', () => {
  beforeAll(async () => {
    // Load WASM module
    await loadExpenseOptimizer();
  });

  it('should simplify circular debts', async () => {
    const debts = [
      { debtor: 'A', creditor: 'B', amount_cents: 10000, expense_ids: [] },
      { debtor: 'B', creditor: 'C', amount_cents: 10000, expense_ids: [] },
      { debtor: 'C', creditor: 'A', amount_cents: 10000, expense_ids: [] },
    ];

    const result = await optimizeSettlements(debts);

    expect(result.optimized_count).toBe(0);
    expect(result.savings_percent).toBe(100);
  });
});
```

---

## Deployment Considerations

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "functions": {
    "app/api/**": {
      "runtime": "nodejs20.x",
      "maxDuration": 60
    }
  },
  "headers": [
    {
      "source": "/wasm/(.*)",
      "headers": [
        { "key": "Content-Type", "value": "application/wasm" },
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### Edge Runtime for MCP Servers (Future)

```typescript
// app/api/mcp/expense-optimizer/route.ts
export const runtime = 'edge';

import { WasmEdge } from '@vercel/wasm-edge';

export async function POST(request: Request) {
  const { method, params } = await request.json();

  const wasm = await WasmEdge.instantiate(
    await fetch('/wasm/expense_optimizer_mcp.wasm')
  );

  const result = wasm.handle({ method, params: JSON.stringify(params) });

  return Response.json(JSON.parse(result.result));
}
```

---

## Cost-Benefit Analysis

### Performance Improvements

| Operation | JavaScript | Rust/WASM | Improvement |
|-----------|------------|-----------|-------------|
| Debt simplification (20 debts) | ~50ms | ~0.5ms | **100x** |
| Balance calculation (50 expenses) | ~30ms | ~1ms | **30x** |
| Image resize (4K → 2K) | ~2000ms | ~200ms | **10x** |
| EXIF extraction | ~100ms | ~10ms | **10x** |

### Bundle Size Impact

| Module | Size | Loading | Impact |
|--------|------|---------|--------|
| expense-optimizer | ~50KB | Eager | Minimal (+50KB initial) |
| finance-core | ~30KB | Eager | Minimal (+30KB initial) |
| media-processor | ~300KB | Lazy | None (on-demand) |
| **Total eager** | **~80KB** | - | ~3% increase |

### AI Cost Reduction

| Agent | Before (Claude) | After (WASM) | Savings |
|-------|-----------------|--------------|---------|
| Expense Reconciliation | $0.015/call | $0 | 100% |
| Balance Calculation | $0.005/call | $0 | 100% |
| **Per trip savings** | ~$0.45 | - | ~25% of agent costs |

### Development Investment

| Phase | Estimated Effort | Team Skills Required |
|-------|------------------|---------------------|
| Phase 1: Debt Simplification | 1-2 weeks | Advanced Rust |
| Phase 2: Financial Core | 1 week | Advanced Rust |
| Phase 3: Media Processing | 2 weeks | Advanced Rust, image processing |
| Phase 4: MCP Components | 2-3 weeks | WASM Component Model, WIT |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-13 | Initial Rust/WASM integration plan |

---

## References

- [Rust and WebAssembly Book](https://rustwasm.github.io/book/)
- [wasm-bindgen Guide](https://rustwasm.github.io/wasm-bindgen/)
- [WebAssembly Component Model](https://component-model.bytecodealliance.org/)
- [WASI 0.3 Preview](https://github.com/WebAssembly/WASI)
- [Next.js WebAssembly Support](https://nextjs.org/docs/architecture/nextjs-compiler)
- [Splitwise Debt Simplification Algorithm](https://medium.com/@mithunmk93/algorithm-behind-splitwises-debt-simplification-feature-8ac485e97688)
- [WasmEdge](https://wasmedge.org/)
- [SpinKube](https://www.spinkube.dev/)
