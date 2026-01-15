//! Type definitions for the expense optimizer.
//!
//! This module contains the core data structures used for debt simplification.

use serde::{Deserialize, Serialize};

/// Represents a debt from one person to another.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Debt {
    /// The person who owes money.
    pub debtor: String,
    /// The person who is owed money.
    pub creditor: String,
    /// The amount owed in cents (to avoid floating point issues).
    pub amount_cents: i64,
    /// IDs of expenses that contributed to this debt.
    pub expense_ids: Vec<String>,
}

/// Represents a payment to settle debts.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Payment {
    /// The person making the payment.
    pub from: String,
    /// The person receiving the payment.
    pub to: String,
    /// The amount to pay in cents.
    pub amount_cents: i64,
    /// Human-readable reason for the payment.
    pub reason: String,
}

/// Result of the debt simplification algorithm.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SimplificationResult {
    /// Number of original debt records.
    pub original_count: usize,
    /// Number of optimized payments.
    pub optimized_count: usize,
    /// The simplified list of payments.
    pub payments: Vec<Payment>,
    /// Percentage reduction in number of transactions.
    pub savings_percent: f64,
}
