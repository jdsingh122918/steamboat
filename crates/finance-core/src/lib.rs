//! Finance Core - Decimal precision financial calculations

pub mod types;
pub mod split;
pub mod balance;

#[cfg(feature = "wasm")]
pub mod wasm;

// Re-export main types and functions
pub use types::{Cents, Expense, PersonShare, ShareResult, BalanceSummary};
pub use split::split_expense_impl;
pub use balance::calculate_all_balances_impl;

#[cfg(feature = "wasm")]
pub use wasm::{init, split_expense, calculate_all_balances};
