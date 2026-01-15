//! Expense splitting algorithm.
//!
//! This module provides the core algorithm for splitting expenses among participants
//! with proper handling of remainder cents to ensure exact totals.

use crate::types::{Cents, Expense, PersonShare, ShareResult};

/// Splits an expense among its participants.
///
/// The algorithm ensures that the sum of all shares exactly equals the expense amount.
/// When the amount doesn't divide evenly, the remainder cents are distributed
/// one at a time to the first N participants (where N = remainder).
///
/// # Examples
///
/// ```
/// use finance_core::{Expense, split_expense_impl};
///
/// let expense = Expense {
///     id: "1".to_string(),
///     payer_id: "alice".to_string(),
///     amount_cents: 10000, // $100.00
///     participants: vec!["alice".to_string(), "bob".to_string()],
///     category: "food".to_string(),
///     description: "Dinner".to_string(),
/// };
///
/// let result = split_expense_impl(&expense);
/// assert_eq!(result.per_person_cents, 5000);
/// assert_eq!(result.remainder_cents, 0);
/// ```
pub fn split_expense_impl(expense: &Expense) -> ShareResult {
    let num_participants = expense.participants.len();

    // Handle edge case: no participants
    if num_participants == 0 {
        return ShareResult {
            per_person_cents: 0,
            shares: Vec::new(),
            remainder_cents: 0,
        };
    }

    let num_participants = num_participants as Cents;
    let base_share = expense.amount_cents / num_participants;
    let remainder = expense.amount_cents % num_participants;

    let shares: Vec<PersonShare> = expense
        .participants
        .iter()
        .enumerate()
        .map(|(idx, participant_id)| {
            // First `remainder` participants get an extra cent
            let gets_extra = (idx as Cents) < remainder;
            let share = if gets_extra {
                base_share + 1
            } else {
                base_share
            };

            PersonShare {
                attendee_id: participant_id.clone(),
                share_cents: share,
                extra_cent: gets_extra,
            }
        })
        .collect();

    ShareResult {
        per_person_cents: base_share,
        shares,
        remainder_cents: remainder,
    }
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn make_expense(
        id: &str,
        payer_id: &str,
        amount_cents: Cents,
        participants: Vec<&str>,
    ) -> Expense {
        Expense {
            id: id.to_string(),
            payer_id: payer_id.to_string(),
            amount_cents,
            participants: participants.into_iter().map(String::from).collect(),
            category: "test".to_string(),
            description: "Test expense".to_string(),
        }
    }

    #[test]
    fn test_even_split() {
        // $100.00 / 4 people = 2500 cents each
        let expense = make_expense("1", "A", 10000, vec!["A", "B", "C", "D"]);
        let result = split_expense_impl(&expense);

        assert_eq!(result.per_person_cents, 2500);
        assert_eq!(result.remainder_cents, 0);
        assert_eq!(result.shares.len(), 4);

        // Each person gets exactly 2500 cents
        for share in &result.shares {
            assert_eq!(share.share_cents, 2500);
            assert!(!share.extra_cent);
        }

        // Sum must equal original amount
        let sum: Cents = result.shares.iter().map(|s| s.share_cents).sum();
        assert_eq!(sum, 10000);
    }

    #[test]
    fn test_uneven_split_with_remainder() {
        // $100.01 / 3 people = 3333 base, 2 get extra cent
        let expense = make_expense("1", "A", 10001, vec!["A", "B", "C"]);
        let result = split_expense_impl(&expense);

        assert_eq!(result.per_person_cents, 3333);
        assert_eq!(result.remainder_cents, 2);
        assert_eq!(result.shares.len(), 3);

        // First two get 3334, third gets 3333
        assert_eq!(result.shares[0].share_cents, 3334);
        assert!(result.shares[0].extra_cent);

        assert_eq!(result.shares[1].share_cents, 3334);
        assert!(result.shares[1].extra_cent);

        assert_eq!(result.shares[2].share_cents, 3333);
        assert!(!result.shares[2].extra_cent);

        // Sum must equal original amount
        let sum: Cents = result.shares.iter().map(|s| s.share_cents).sum();
        assert_eq!(sum, 10001);
    }

    #[test]
    fn test_single_participant() {
        // Single person gets the full amount
        let expense = make_expense("1", "A", 5000, vec!["A"]);
        let result = split_expense_impl(&expense);

        assert_eq!(result.per_person_cents, 5000);
        assert_eq!(result.remainder_cents, 0);
        assert_eq!(result.shares.len(), 1);
        assert_eq!(result.shares[0].share_cents, 5000);
        assert_eq!(result.shares[0].attendee_id, "A");
    }

    #[test]
    fn test_zero_participants() {
        // No participants returns empty result
        let expense = make_expense("1", "A", 5000, vec![]);
        let result = split_expense_impl(&expense);

        assert_eq!(result.per_person_cents, 0);
        assert_eq!(result.remainder_cents, 0);
        assert!(result.shares.is_empty());
    }
}
