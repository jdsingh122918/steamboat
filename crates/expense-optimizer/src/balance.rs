//! Balance calculation for debt simplification.
//!
//! This module provides functions to calculate net balances for participants
//! in a debt network.

use std::collections::HashMap;

use crate::types::Debt;

/// Calculate the net balance for each participant from a list of debts.
///
/// A positive balance means the person is owed money (creditor).
/// A negative balance means the person owes money (debtor).
///
/// # Arguments
/// * `debts` - Slice of Debt objects to calculate balances from
///
/// # Returns
/// A HashMap mapping participant names to their net balance in cents
pub fn calculate_net_balances(debts: &[Debt]) -> HashMap<String, i64> {
    let mut balances: HashMap<String, i64> = HashMap::new();

    for debt in debts {
        *balances.entry(debt.debtor.clone()).or_insert(0) -= debt.amount_cents;
        *balances.entry(debt.creditor.clone()).or_insert(0) += debt.amount_cents;
    }

    balances
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_debts() {
        let debts: Vec<Debt> = vec![];
        let balances = calculate_net_balances(&debts);
        assert!(balances.is_empty());
    }

    #[test]
    fn test_single_debt() {
        let debts = vec![Debt {
            debtor: "Alice".to_string(),
            creditor: "Bob".to_string(),
            amount_cents: 5000,
            expense_ids: vec!["exp1".to_string()],
        }];

        let balances = calculate_net_balances(&debts);

        assert_eq!(balances.get("Alice"), Some(&-5000));
        assert_eq!(balances.get("Bob"), Some(&5000));
    }

    #[test]
    fn test_circular_debt_balances() {
        // A owes B $100, B owes C $100, C owes A $100
        // Net result: everyone's balance is 0
        let debts = vec![
            Debt {
                debtor: "A".to_string(),
                creditor: "B".to_string(),
                amount_cents: 10000,
                expense_ids: vec!["exp1".to_string()],
            },
            Debt {
                debtor: "B".to_string(),
                creditor: "C".to_string(),
                amount_cents: 10000,
                expense_ids: vec!["exp2".to_string()],
            },
            Debt {
                debtor: "C".to_string(),
                creditor: "A".to_string(),
                amount_cents: 10000,
                expense_ids: vec!["exp3".to_string()],
            },
        ];

        let balances = calculate_net_balances(&debts);

        assert_eq!(balances.get("A"), Some(&0));
        assert_eq!(balances.get("B"), Some(&0));
        assert_eq!(balances.get("C"), Some(&0));
    }

    #[test]
    fn test_chain_debt_balances() {
        // A owes B $100, B owes C $100
        // A: -100, B: 0, C: +100
        let debts = vec![
            Debt {
                debtor: "A".to_string(),
                creditor: "B".to_string(),
                amount_cents: 10000,
                expense_ids: vec!["exp1".to_string()],
            },
            Debt {
                debtor: "B".to_string(),
                creditor: "C".to_string(),
                amount_cents: 10000,
                expense_ids: vec!["exp2".to_string()],
            },
        ];

        let balances = calculate_net_balances(&debts);

        assert_eq!(balances.get("A"), Some(&-10000));
        assert_eq!(balances.get("B"), Some(&0));
        assert_eq!(balances.get("C"), Some(&10000));
    }

    #[test]
    fn test_multiple_debts_same_pair() {
        // A owes B $50 twice = A owes B $100 total
        let debts = vec![
            Debt {
                debtor: "A".to_string(),
                creditor: "B".to_string(),
                amount_cents: 5000,
                expense_ids: vec!["exp1".to_string()],
            },
            Debt {
                debtor: "A".to_string(),
                creditor: "B".to_string(),
                amount_cents: 5000,
                expense_ids: vec!["exp2".to_string()],
            },
        ];

        let balances = calculate_net_balances(&debts);

        assert_eq!(balances.get("A"), Some(&-10000));
        assert_eq!(balances.get("B"), Some(&10000));
    }

    #[test]
    fn test_partial_cancellation_balances() {
        // A owes B $100, B owes A $40
        // Net: A: -60, B: +60
        let debts = vec![
            Debt {
                debtor: "A".to_string(),
                creditor: "B".to_string(),
                amount_cents: 10000,
                expense_ids: vec!["exp1".to_string()],
            },
            Debt {
                debtor: "B".to_string(),
                creditor: "A".to_string(),
                amount_cents: 4000,
                expense_ids: vec!["exp2".to_string()],
            },
        ];

        let balances = calculate_net_balances(&debts);

        assert_eq!(balances.get("A"), Some(&-6000));
        assert_eq!(balances.get("B"), Some(&6000));
    }

    #[test]
    fn test_complex_scenario_balances() {
        // A owes B $50, A owes C $30, B owes D $80, C owes D $20
        let debts = vec![
            Debt {
                debtor: "A".to_string(),
                creditor: "B".to_string(),
                amount_cents: 5000,
                expense_ids: vec!["exp1".to_string()],
            },
            Debt {
                debtor: "A".to_string(),
                creditor: "C".to_string(),
                amount_cents: 3000,
                expense_ids: vec!["exp2".to_string()],
            },
            Debt {
                debtor: "B".to_string(),
                creditor: "D".to_string(),
                amount_cents: 8000,
                expense_ids: vec!["exp3".to_string()],
            },
            Debt {
                debtor: "C".to_string(),
                creditor: "D".to_string(),
                amount_cents: 2000,
                expense_ids: vec!["exp4".to_string()],
            },
        ];

        let balances = calculate_net_balances(&debts);

        // A: -5000 - 3000 = -8000 (owes $80)
        // B: +5000 - 8000 = -3000 (owes $30)
        // C: +3000 - 2000 = +1000 (owed $10)
        // D: +8000 + 2000 = +10000 (owed $100)
        assert_eq!(balances.get("A"), Some(&-8000));
        assert_eq!(balances.get("B"), Some(&-3000));
        assert_eq!(balances.get("C"), Some(&1000));
        assert_eq!(balances.get("D"), Some(&10000));
    }
}
