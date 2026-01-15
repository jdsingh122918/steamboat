//! Integration tests for Steamboat Rust crates
//!
//! Tests the end-to-end flow: expenses -> splits -> balances -> debts -> simplification

use expense_optimizer::{Debt, SimplificationResult, simplify_debts};
use finance_core::{BalanceSummary, Cents, Expense, calculate_all_balances_impl, split_expense_impl};
use std::time::Instant;

// ============================================================================
// Helper Functions
// ============================================================================

/// Helper function to create an expense with sensible defaults
fn make_expense(
    id: &str,
    payer_id: &str,
    amount_cents: Cents,
    participants: Vec<&str>,
    category: &str,
    description: &str,
) -> Expense {
    Expense {
        id: id.to_string(),
        payer_id: payer_id.to_string(),
        amount_cents,
        participants: participants.into_iter().map(String::from).collect(),
        category: category.to_string(),
        description: description.to_string(),
    }
}

/// Convert balances to debts for simplification.
///
/// For each person with a negative balance (debtor), we create debts to people
/// with positive balances (creditors). This uses a greedy approach to create
/// pairwise debts that sum to the correct amounts.
fn balances_to_debts(balances: &[BalanceSummary]) -> Vec<Debt> {
    let mut debts = Vec::new();

    // Separate creditors (positive balance) and debtors (negative balance)
    let mut creditors: Vec<(&str, Cents)> = balances
        .iter()
        .filter(|b| b.net_balance_cents > 0)
        .map(|b| (b.attendee_id.as_str(), b.net_balance_cents))
        .collect();

    let mut debtors: Vec<(&str, Cents)> = balances
        .iter()
        .filter(|b| b.net_balance_cents < 0)
        .map(|b| (b.attendee_id.as_str(), -b.net_balance_cents)) // Store as positive
        .collect();

    // Sort for deterministic matching
    creditors.sort_by(|a, b| b.1.cmp(&a.1));
    debtors.sort_by(|a, b| b.1.cmp(&a.1));

    // Create pairwise debts
    let mut creditor_idx = 0;
    let mut debtor_idx = 0;

    while creditor_idx < creditors.len() && debtor_idx < debtors.len() {
        let (creditor_name, ref mut creditor_amount) = creditors[creditor_idx];
        let (debtor_name, ref mut debtor_amount) = debtors[debtor_idx];

        let transfer_amount = (*creditor_amount).min(*debtor_amount);

        if transfer_amount > 0 {
            debts.push(Debt {
                debtor: debtor_name.to_string(),
                creditor: creditor_name.to_string(),
                amount_cents: transfer_amount,
                expense_ids: vec![], // Not tracking specific expenses in this conversion
            });

            *creditor_amount -= transfer_amount;
            *debtor_amount -= transfer_amount;
        }

        if *creditor_amount == 0 {
            creditor_idx += 1;
        }
        if *debtor_amount == 0 {
            debtor_idx += 1;
        }
    }

    debts
}

/// Verify that all payments in a simplification result are valid
fn verify_payments(result: &SimplificationResult) -> bool {
    result.payments.iter().all(|p| {
        p.amount_cents > 0 && !p.from.is_empty() && !p.to.is_empty() && p.from != p.to
    })
}

// ============================================================================
// End-to-End Tests
// ============================================================================

/// Test the complete flow: expenses -> splits -> balances -> debts -> simplified payments
#[test]
fn test_end_to_end_flow() {
    // Create expenses: Alice pays for dinner, Bob pays for taxi
    let expenses = vec![
        make_expense(
            "exp1",
            "alice",
            10000, // $100.00 dinner
            vec!["alice", "bob", "charlie"],
            "food",
            "Group dinner",
        ),
        make_expense(
            "exp2",
            "bob",
            3000, // $30.00 taxi
            vec!["alice", "bob", "charlie"],
            "transport",
            "Taxi to restaurant",
        ),
    ];

    // Step 1: Verify individual splits work correctly
    let dinner_split = split_expense_impl(&expenses[0]);
    assert_eq!(dinner_split.shares.len(), 3);
    let dinner_sum: Cents = dinner_split.shares.iter().map(|s| s.share_cents).sum();
    assert_eq!(dinner_sum, 10000, "Dinner split must sum to original amount");

    let taxi_split = split_expense_impl(&expenses[1]);
    assert_eq!(taxi_split.shares.len(), 3);
    let taxi_sum: Cents = taxi_split.shares.iter().map(|s| s.share_cents).sum();
    assert_eq!(taxi_sum, 3000, "Taxi split must sum to original amount");

    // Step 2: Calculate balances
    let balances = calculate_all_balances_impl(&expenses);
    assert_eq!(balances.len(), 3, "Should have 3 participants");

    // Step 3: Convert balances to debts
    let debts = balances_to_debts(&balances);

    // Step 4: Simplify debts
    let result = simplify_debts(&debts);

    // Verify optimization occurred
    assert!(
        result.optimized_count <= result.original_count,
        "Optimized count should be <= original count"
    );

    // Verify all payments are valid
    assert!(verify_payments(&result), "All payments should be valid");

    // Verify the total amount transferred matches the expected settlements
    let total_transferred: Cents = result.payments.iter().map(|p| p.amount_cents).sum();
    let total_positive_balance: Cents = balances
        .iter()
        .filter(|b| b.net_balance_cents > 0)
        .map(|b| b.net_balance_cents)
        .sum();
    assert_eq!(
        total_transferred, total_positive_balance,
        "Total transferred should equal total positive balances"
    );
}

/// Test balance conservation law: sum of all net balances = 0
#[test]
fn test_balance_conservation() {
    // Create a variety of expenses with different payers and participants
    let expenses = vec![
        make_expense(
            "exp1",
            "alice",
            15000, // $150.00
            vec!["alice", "bob", "charlie", "diana"],
            "food",
            "Fancy dinner",
        ),
        make_expense(
            "exp2",
            "bob",
            8000, // $80.00
            vec!["bob", "charlie"],
            "entertainment",
            "Movie tickets",
        ),
        make_expense(
            "exp3",
            "charlie",
            12345, // $123.45 - odd amount to test remainder handling
            vec!["alice", "bob", "charlie", "diana", "eve"],
            "activities",
            "Group activity",
        ),
        make_expense(
            "exp4",
            "diana",
            5001, // $50.01 - another odd amount
            vec!["alice", "diana"],
            "transport",
            "Uber",
        ),
    ];

    let balances = calculate_all_balances_impl(&expenses);

    // Sum of all net balances must be zero
    let sum: Cents = balances.iter().map(|b| b.net_balance_cents).sum();
    assert_eq!(sum, 0, "Sum of all net balances must be zero (conservation law)");

    // Also verify that total paid equals total owed
    let total_paid: Cents = balances.iter().map(|b| b.total_paid_cents).sum();
    let total_owed: Cents = balances.iter().map(|b| b.total_owed_cents).sum();
    assert_eq!(
        total_paid, total_owed,
        "Total paid must equal total owed across all participants"
    );
}

/// Test that splitting preserves the total amount for various edge cases
#[test]
fn test_split_amount_preservation() {
    let test_cases = vec![
        (10000, 2),  // Even split
        (10000, 3),  // Remainder of 1
        (10000, 7),  // Remainder of 6
        (1, 3),      // Very small amount
        (9999999, 7), // Large amount with remainder
    ];

    for (amount, num_participants) in test_cases {
        let participants: Vec<&str> = (0..num_participants)
            .map(|i| match i {
                0 => "a",
                1 => "b",
                2 => "c",
                3 => "d",
                4 => "e",
                5 => "f",
                _ => "g",
            })
            .collect();

        let expense = make_expense(
            "test",
            "payer",
            amount,
            participants,
            "test",
            "Test expense",
        );

        let result = split_expense_impl(&expense);
        let sum: Cents = result.shares.iter().map(|s| s.share_cents).sum();

        assert_eq!(
            sum, amount,
            "Split sum must equal original for amount {} with {} participants",
            amount, num_participants
        );
    }
}

/// Test realistic trip scenario: 15 attendees, ~$5000 total
#[test]
fn test_realistic_trip_scenario() {
    let start = Instant::now();

    // Create 15 attendees
    let attendees: Vec<String> = (1..=15).map(|i| format!("person_{}", i)).collect();
    let attendee_refs: Vec<&str> = attendees.iter().map(|s| s.as_str()).collect();

    // Create multiple expenses totaling ~$5000
    let expenses = vec![
        // Accommodation: person_1 pays for everyone
        make_expense(
            "exp1",
            &attendees[0],
            200000, // $2000.00
            attendee_refs.clone(),
            "accommodation",
            "Airbnb for weekend",
        ),
        // Food: person_2 pays for everyone
        make_expense(
            "exp2",
            &attendees[1],
            80000, // $800.00
            attendee_refs.clone(),
            "food",
            "Groceries",
        ),
        // Dinner 1: person_3 pays for half the group
        make_expense(
            "exp3",
            &attendees[2],
            45000, // $450.00
            attendee_refs[0..8].to_vec(),
            "food",
            "Restaurant dinner",
        ),
        // Dinner 2: person_4 pays for other half
        make_expense(
            "exp4",
            &attendees[3],
            42000, // $420.00
            attendee_refs[7..15].to_vec(),
            "food",
            "Restaurant dinner",
        ),
        // Activities: person_5 pays for everyone
        make_expense(
            "exp5",
            &attendees[4],
            75000, // $750.00
            attendee_refs.clone(),
            "activities",
            "Kayak rental",
        ),
        // Transport: person_6 pays for small group
        make_expense(
            "exp6",
            &attendees[5],
            15000, // $150.00
            attendee_refs[0..5].to_vec(),
            "transport",
            "Airport shuttle",
        ),
        // Transport: person_7 pays for another small group
        make_expense(
            "exp7",
            &attendees[6],
            18000, // $180.00
            attendee_refs[5..10].to_vec(),
            "transport",
            "Another shuttle",
        ),
        // Supplies: person_8 pays for everyone
        make_expense(
            "exp8",
            &attendees[7],
            12500, // $125.00
            attendee_refs.clone(),
            "supplies",
            "Camping supplies",
        ),
        // Tips: person_9 pays for everyone
        make_expense(
            "exp9",
            &attendees[8],
            8500, // $85.00
            attendee_refs.clone(),
            "other",
            "Tips and gratuities",
        ),
    ];

    // Calculate total expenses
    let total_cents: Cents = expenses.iter().map(|e| e.amount_cents).sum();
    assert!(
        total_cents >= 490000 && total_cents <= 510000,
        "Total should be around $5000, got ${:.2}",
        total_cents as f64 / 100.0
    );

    // Calculate balances
    let balances = calculate_all_balances_impl(&expenses);

    // Verify balance conservation
    let balance_sum: Cents = balances.iter().map(|b| b.net_balance_cents).sum();
    assert_eq!(balance_sum, 0, "Balances must sum to zero");

    // Convert to debts
    let debts = balances_to_debts(&balances);

    // Simplify debts
    let result = simplify_debts(&debts);

    // Assert: payments <= 14 (at most n-1 payments for n people)
    assert!(
        result.optimized_count <= 14,
        "Should have at most 14 payments for 15 people, got {}",
        result.optimized_count
    );

    // Assert: optimization should reduce the number of transactions
    assert!(
        result.optimized_count <= result.original_count,
        "Optimization should not increase transaction count"
    );

    // Verify all payments are valid
    assert!(verify_payments(&result), "All payments should be valid");

    // Assert: total execution time < 100ms
    let duration = start.elapsed();
    assert!(
        duration.as_millis() < 100,
        "Execution should take less than 100ms, took {:?}",
        duration
    );

    // Print summary for debugging
    println!("Realistic trip scenario results:");
    println!("  Total expenses: ${:.2}", total_cents as f64 / 100.0);
    println!("  Participants: {}", attendees.len());
    println!("  Original debt records: {}", result.original_count);
    println!("  Optimized payments: {}", result.optimized_count);
    println!("  Savings: {:.1}%", result.savings_percent);
    println!("  Execution time: {:?}", duration);
}

/// Test that the full pipeline handles edge cases correctly
#[test]
fn test_edge_cases() {
    // Case 1: Single person pays for themselves
    let expenses = vec![make_expense(
        "exp1",
        "alice",
        5000,
        vec!["alice"],
        "personal",
        "Solo lunch",
    )];
    let balances = calculate_all_balances_impl(&expenses);
    assert_eq!(balances.len(), 1);
    assert_eq!(balances[0].net_balance_cents, 0, "Self-payment should result in zero balance");

    // Case 2: Payer not in participants (paying for others)
    let expenses = vec![make_expense(
        "exp2",
        "alice",
        6000,
        vec!["bob", "charlie"],
        "gift",
        "Treating others",
    )];
    let balances = calculate_all_balances_impl(&expenses);
    let alice = balances.iter().find(|b| b.attendee_id == "alice").unwrap();
    assert_eq!(
        alice.net_balance_cents, 6000,
        "Alice should be owed the full amount"
    );

    // Case 3: Multiple payers for overlapping groups
    let expenses = vec![
        make_expense("exp3", "alice", 4000, vec!["alice", "bob"], "food", "Lunch"),
        make_expense("exp4", "bob", 4000, vec!["alice", "bob"], "food", "Dinner"),
    ];
    let balances = calculate_all_balances_impl(&expenses);
    // Each paid 4000, each owes 4000, so everyone should be at zero
    for balance in &balances {
        assert_eq!(
            balance.net_balance_cents, 0,
            "{} should have zero balance with symmetric expenses",
            balance.attendee_id
        );
    }
}

/// Test that debt simplification maintains the total amount to be settled
#[test]
fn test_debt_simplification_amount_preservation() {
    let expenses = vec![
        make_expense(
            "exp1",
            "alice",
            30000, // $300
            vec!["alice", "bob", "charlie", "diana"],
            "food",
            "Dinner",
        ),
        make_expense(
            "exp2",
            "bob",
            20000, // $200
            vec!["alice", "bob", "charlie"],
            "transport",
            "Rental car",
        ),
        make_expense(
            "exp3",
            "charlie",
            15000, // $150
            vec!["bob", "charlie", "diana"],
            "activities",
            "Museum tickets",
        ),
    ];

    let balances = calculate_all_balances_impl(&expenses);
    let debts = balances_to_debts(&balances);
    let result = simplify_debts(&debts);

    // Calculate total positive balance (what creditors are owed)
    let total_owed_to_creditors: Cents = balances
        .iter()
        .filter(|b| b.net_balance_cents > 0)
        .map(|b| b.net_balance_cents)
        .sum();

    // Calculate total amount in simplified payments
    let total_in_payments: Cents = result.payments.iter().map(|p| p.amount_cents).sum();

    assert_eq!(
        total_in_payments, total_owed_to_creditors,
        "Total payment amount must equal total owed to creditors"
    );
}

/// Test with a large number of small transactions
#[test]
fn test_many_small_transactions() {
    let attendees: Vec<String> = (1..=10).map(|i| format!("person_{}", i)).collect();
    let attendee_refs: Vec<&str> = attendees.iter().map(|s| s.as_str()).collect();

    // Create 50 small expenses with rotating payers
    let expenses: Vec<Expense> = (0..50)
        .map(|i| {
            let payer_idx = i % 10;
            let amount = 1000 + (i as Cents * 100); // $10 to $59

            make_expense(
                &format!("exp{}", i),
                &attendees[payer_idx],
                amount,
                attendee_refs.clone(),
                "misc",
                &format!("Expense {}", i),
            )
        })
        .collect();

    let balances = calculate_all_balances_impl(&expenses);

    // Verify conservation
    let sum: Cents = balances.iter().map(|b| b.net_balance_cents).sum();
    assert_eq!(sum, 0, "Balance conservation must hold with many transactions");

    let debts = balances_to_debts(&balances);
    let result = simplify_debts(&debts);

    // With 10 people, we should have at most 9 payments
    assert!(
        result.optimized_count <= 9,
        "Should have at most 9 payments for 10 people"
    );
}
