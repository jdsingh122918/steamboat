//! Core types for financial calculations.
//!
//! This module defines the fundamental data structures used for expense splitting
//! and balance calculations.

use serde::{Deserialize, Serialize};

/// Monetary amounts in cents (1/100 of currency unit).
/// Using i64 allows for negative balances and large amounts.
pub type Cents = i64;

/// Represents an expense paid by one person and split among participants.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Expense {
    /// Unique identifier for the expense.
    pub id: String,
    /// ID of the person who paid for this expense.
    pub payer_id: String,
    /// Total amount in cents.
    pub amount_cents: Cents,
    /// List of participant IDs who share this expense.
    pub participants: Vec<String>,
    /// Category of the expense (e.g., "food", "transport").
    pub category: String,
    /// Human-readable description.
    pub description: String,
}

/// Represents one person's share of an expense.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct PersonShare {
    /// ID of the participant.
    pub attendee_id: String,
    /// Their share in cents.
    pub share_cents: Cents,
    /// Whether this person received an extra cent from remainder distribution.
    pub extra_cent: bool,
}

/// Result of splitting an expense among participants.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct ShareResult {
    /// Base amount per person before remainder distribution.
    pub per_person_cents: Cents,
    /// Individual shares for each participant.
    pub shares: Vec<PersonShare>,
    /// Remainder cents that were distributed (for verification).
    pub remainder_cents: Cents,
}

/// Summary of a person's financial position across all expenses.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct BalanceSummary {
    /// ID of the person.
    pub attendee_id: String,
    /// Total amount they paid for expenses.
    pub total_paid_cents: Cents,
    /// Total amount they owe for their shares.
    pub total_owed_cents: Cents,
    /// Net balance: positive means others owe them, negative means they owe others.
    pub net_balance_cents: Cents,
}
