//! Expense Optimizer - Debt simplification engine

pub mod types;
pub mod balance;
pub mod simplify;

#[cfg(feature = "wasm")]
pub mod wasm;

// Re-export main types and functions
pub use types::{Debt, Payment, SimplificationResult};
pub use balance::calculate_net_balances;
pub use simplify::simplify_debts;

#[cfg(feature = "wasm")]
pub use wasm::{init, optimize_settlements, validate_debts};
