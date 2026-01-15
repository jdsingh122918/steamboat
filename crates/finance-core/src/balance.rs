//! Balance calculation algorithm.
//!
//! This module provides the algorithm for calculating net balances
//! across all expenses for each participant.

use std::collections::HashMap;

use crate::split::split_expense_impl;
use crate::types::{BalanceSummary, Cents, Expense};

/// Calculates the net balance for each person across all expenses.
///
/// For each expense:
/// - The payer's `total_paid` increases by the full expense amount
/// - Each participant's `total_owed` increases by their share
///
/// The net balance is `total_paid - total_owed`:
/// - Positive: others owe this person money
/// - Negative: this person owes others money
///
/// # Invariant
///
/// The sum of all net balances is always zero (money is conserved).
pub fn calculate_all_balances_impl(expenses: &[Expense]) -> Vec<BalanceSummary> {
    // Track paid and owed amounts for each person
    let mut paid: HashMap<String, Cents> = HashMap::new();
    let mut owed: HashMap<String, Cents> = HashMap::new();

    for expense in expenses {
        // Payer paid the full amount
        *paid.entry(expense.payer_id.clone()).or_insert(0) += expense.amount_cents;

        // Each participant owes their share
        let split = split_expense_impl(expense);
        for share in &split.shares {
            *owed.entry(share.attendee_id.clone()).or_insert(0) += share.share_cents;
        }
    }

    // Collect all unique person IDs
    let mut all_people: Vec<String> = paid
        .keys()
        .chain(owed.keys())
        .cloned()
        .collect();
    all_people.sort();
    all_people.dedup();

    // Build balance summaries
    all_people
        .into_iter()
        .map(|person_id| {
            let total_paid = *paid.get(&person_id).unwrap_or(&0);
            let total_owed = *owed.get(&person_id).unwrap_or(&0);
            let net_balance = total_paid - total_owed;

            BalanceSummary {
                attendee_id: person_id,
                total_paid_cents: total_paid,
                total_owed_cents: total_owed,
                net_balance_cents: net_balance,
            }
        })
        .collect()
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
    fn test_balance_calculation() {
        // A pays $100 split 4 ways among A, B, C, D
        // Each person owes 2500 cents
        // A paid 10000, owes 2500 -> net +7500
        // B/C/D paid 0, owe 2500 each -> net -2500 each
        let expenses = vec![make_expense("1", "A", 10000, vec!["A", "B", "C", "D"])];

        let balances = calculate_all_balances_impl(&expenses);
        assert_eq!(balances.len(), 4);

        // Find each person's balance
        let a_balance = balances.iter().find(|b| b.attendee_id == "A").unwrap();
        let b_balance = balances.iter().find(|b| b.attendee_id == "B").unwrap();
        let c_balance = balances.iter().find(|b| b.attendee_id == "C").unwrap();
        let d_balance = balances.iter().find(|b| b.attendee_id == "D").unwrap();

        // A: paid 10000, owes 2500, net +7500
        assert_eq!(a_balance.total_paid_cents, 10000);
        assert_eq!(a_balance.total_owed_cents, 2500);
        assert_eq!(a_balance.net_balance_cents, 7500);

        // B, C, D: paid 0, owe 2500, net -2500
        for balance in [b_balance, c_balance, d_balance] {
            assert_eq!(balance.total_paid_cents, 0);
            assert_eq!(balance.total_owed_cents, 2500);
            assert_eq!(balance.net_balance_cents, -2500);
        }
    }

    #[test]
    fn test_balance_conservation() {
        // The sum of all net balances must always be zero
        let expenses = vec![
            make_expense("1", "A", 10000, vec!["A", "B", "C", "D"]),
            make_expense("2", "B", 3333, vec!["A", "B"]),
            make_expense("3", "C", 7777, vec!["B", "C", "D"]),
        ];

        let balances = calculate_all_balances_impl(&expenses);

        let sum: Cents = balances.iter().map(|b| b.net_balance_cents).sum();
        assert_eq!(sum, 0, "Sum of all net balances must be zero");
    }

    #[test]
    fn test_multiple_expenses_same_payer() {
        // A pays for two expenses
        let expenses = vec![
            make_expense("1", "A", 1000, vec!["A", "B"]),
            make_expense("2", "A", 2000, vec!["A", "B"]),
        ];

        let balances = calculate_all_balances_impl(&expenses);

        let a_balance = balances.iter().find(|b| b.attendee_id == "A").unwrap();
        let b_balance = balances.iter().find(|b| b.attendee_id == "B").unwrap();

        // A: paid 3000, owes 1500, net +1500
        assert_eq!(a_balance.total_paid_cents, 3000);
        assert_eq!(a_balance.total_owed_cents, 1500);
        assert_eq!(a_balance.net_balance_cents, 1500);

        // B: paid 0, owes 1500, net -1500
        assert_eq!(b_balance.total_paid_cents, 0);
        assert_eq!(b_balance.total_owed_cents, 1500);
        assert_eq!(b_balance.net_balance_cents, -1500);
    }

    #[test]
    fn test_payer_not_in_participants() {
        // A pays but doesn't participate (e.g., buying gift for others)
        let expenses = vec![make_expense("1", "A", 3000, vec!["B", "C", "D"])];

        let balances = calculate_all_balances_impl(&expenses);

        let a_balance = balances.iter().find(|b| b.attendee_id == "A").unwrap();

        // A: paid 3000, owes 0 (not a participant), net +3000
        assert_eq!(a_balance.total_paid_cents, 3000);
        assert_eq!(a_balance.total_owed_cents, 0);
        assert_eq!(a_balance.net_balance_cents, 3000);

        // Each of B, C, D owes 1000
        for person in ["B", "C", "D"] {
            let balance = balances.iter().find(|b| b.attendee_id == person).unwrap();
            assert_eq!(balance.total_paid_cents, 0);
            assert_eq!(balance.total_owed_cents, 1000);
            assert_eq!(balance.net_balance_cents, -1000);
        }

        // Conservation check
        let sum: Cents = balances.iter().map(|b| b.net_balance_cents).sum();
        assert_eq!(sum, 0);
    }
}
