//! Debt simplification algorithm.
//!
//! This module provides the core algorithm to minimize the number of transactions
//! needed to settle debts between multiple parties.

use std::collections::HashMap;

use crate::balance::calculate_net_balances;
use crate::types::{Debt, Payment, SimplificationResult};

/// Simplify a list of debts into the minimum number of payments.
///
/// This uses a greedy algorithm:
/// 1. Calculate net balance for each person
/// 2. Separate into creditors (positive balance) and debtors (negative balance)
/// 3. Sort both lists by amount (descending by absolute value)
/// 4. Greedily match largest debtor with largest creditor
///
/// # Arguments
/// * `debts` - Slice of Debt objects to simplify
///
/// # Returns
/// A SimplificationResult containing the optimized payments
pub fn simplify_debts(debts: &[Debt]) -> SimplificationResult {
    let original_count = debts.len();

    if debts.is_empty() {
        return SimplificationResult {
            original_count: 0,
            optimized_count: 0,
            payments: Vec::new(),
            savings_percent: 0.0,
        };
    }

    // Step 1: Calculate net balance for each person
    // Positive balance = person is owed money (creditor)
    // Negative balance = person owes money (debtor)
    let balances: HashMap<String, i64> = calculate_net_balances(debts);

    // Step 2: Separate into creditors and debtors
    let mut creditors: Vec<(String, i64)> = Vec::new();
    let mut debtors: Vec<(String, i64)> = Vec::new();

    for (person, balance) in balances {
        if balance > 0 {
            creditors.push((person, balance));
        } else if balance < 0 {
            debtors.push((person, -balance)); // Store as positive amount
        }
        // If balance is 0, person is settled and can be ignored
    }

    // Step 3: Sort both lists by amount descending
    creditors.sort_by(|a, b| b.1.cmp(&a.1));
    debtors.sort_by(|a, b| b.1.cmp(&a.1));

    // Step 4: Greedy matching
    let mut payments: Vec<Payment> = Vec::new();
    let mut creditor_idx = 0;
    let mut debtor_idx = 0;

    while creditor_idx < creditors.len() && debtor_idx < debtors.len() {
        let (creditor_name, creditor_amount) = &mut creditors[creditor_idx];
        let (debtor_name, debtor_amount) = &mut debtors[debtor_idx];

        // Transfer the minimum of what's owed and what's due
        let transfer_amount = (*creditor_amount).min(*debtor_amount);

        if transfer_amount > 0 {
            payments.push(Payment {
                from: debtor_name.clone(),
                to: creditor_name.clone(),
                amount_cents: transfer_amount,
                reason: format!(
                    "Settlement: {} pays {} ${:.2}",
                    debtor_name,
                    creditor_name,
                    transfer_amount as f64 / 100.0
                ),
            });

            *creditor_amount -= transfer_amount;
            *debtor_amount -= transfer_amount;
        }

        // Move to next creditor/debtor if they're settled
        if *creditor_amount == 0 {
            creditor_idx += 1;
        }
        if *debtor_amount == 0 {
            debtor_idx += 1;
        }
    }

    let optimized_count = payments.len();

    // Calculate savings percentage
    let savings_percent = if original_count > 0 {
        ((original_count as f64 - optimized_count as f64) / original_count as f64) * 100.0
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_debts() {
        let debts: Vec<Debt> = vec![];
        let result = simplify_debts(&debts);

        assert_eq!(result.original_count, 0);
        assert_eq!(result.optimized_count, 0);
        assert_eq!(result.payments.len(), 0);
        assert_eq!(result.savings_percent, 0.0);
    }

    #[test]
    fn test_single_debt() {
        let debts = vec![Debt {
            debtor: "Alice".to_string(),
            creditor: "Bob".to_string(),
            amount_cents: 5000, // $50.00
            expense_ids: vec!["exp1".to_string()],
        }];

        let result = simplify_debts(&debts);

        assert_eq!(result.original_count, 1);
        assert_eq!(result.optimized_count, 1);
        assert_eq!(result.payments.len(), 1);

        let payment = &result.payments[0];
        assert_eq!(payment.from, "Alice");
        assert_eq!(payment.to, "Bob");
        assert_eq!(payment.amount_cents, 5000);
        assert_eq!(result.savings_percent, 0.0);
    }

    #[test]
    fn test_circular_debt_cancels() {
        // A owes B $100, B owes C $100, C owes A $100
        // Net result: everyone's balance is 0, no payments needed
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

        let result = simplify_debts(&debts);

        assert_eq!(result.original_count, 3);
        assert_eq!(result.optimized_count, 0);
        assert_eq!(result.payments.len(), 0);
        assert_eq!(result.savings_percent, 100.0);
    }

    #[test]
    fn test_chain_simplification() {
        // A owes B $100, B owes C $100
        // Simplified: A pays C $100 directly
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

        let result = simplify_debts(&debts);

        assert_eq!(result.original_count, 2);
        assert_eq!(result.optimized_count, 1);
        assert_eq!(result.payments.len(), 1);

        let payment = &result.payments[0];
        assert_eq!(payment.from, "A");
        assert_eq!(payment.to, "C");
        assert_eq!(payment.amount_cents, 10000);
        assert_eq!(result.savings_percent, 50.0);
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

        let result = simplify_debts(&debts);

        assert_eq!(result.original_count, 2);
        assert_eq!(result.optimized_count, 1);
        assert_eq!(result.payments.len(), 1);

        let payment = &result.payments[0];
        assert_eq!(payment.from, "A");
        assert_eq!(payment.to, "B");
        assert_eq!(payment.amount_cents, 10000);
        assert_eq!(result.savings_percent, 50.0);
    }

    #[test]
    fn test_partial_cancellation() {
        // A owes B $100, B owes A $40
        // Net: A owes B $60
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

        let result = simplify_debts(&debts);

        assert_eq!(result.original_count, 2);
        assert_eq!(result.optimized_count, 1);
        assert_eq!(result.payments.len(), 1);

        let payment = &result.payments[0];
        assert_eq!(payment.from, "A");
        assert_eq!(payment.to, "B");
        assert_eq!(payment.amount_cents, 6000);
    }

    #[test]
    fn test_complex_scenario() {
        // Complex scenario with 4 people
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

        let result = simplify_debts(&debts);

        // Net balances:
        // A: -5000 - 3000 = -8000 (owes $80)
        // B: +5000 - 8000 = -3000 (owes $30)
        // C: +3000 - 2000 = +1000 (owed $10)
        // D: +8000 + 2000 = +10000 (owed $100)
        // So: A and B are debtors, C and D are creditors
        // Optimized: 2 payments max (one to each creditor)

        assert_eq!(result.original_count, 4);
        assert!(result.optimized_count <= 3); // Should be 2 or 3 payments

        // Verify total amounts balance
        let total_paid: i64 = result.payments.iter().map(|p| p.amount_cents).sum();
        assert_eq!(total_paid, 11000); // $80 + $30 = $110
    }
}
