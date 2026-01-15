//! WASM bindings for finance-core.
//!
//! This module provides JavaScript-compatible bindings for the core financial
//! calculation functions using wasm-bindgen.

use wasm_bindgen::prelude::*;

use crate::balance::calculate_all_balances_impl;
use crate::split::split_expense_impl;
use crate::types::Expense;

/// Initialize the WASM module.
///
/// Sets up the panic hook for better error messages in the browser console.
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Splits an expense among its participants.
///
/// Takes a JavaScript object representing an Expense and returns the split result.
///
/// # Arguments
///
/// * `expense` - A JavaScript object with the Expense structure
///
/// # Returns
///
/// A JavaScript object containing the ShareResult, or an error message.
#[wasm_bindgen]
pub fn split_expense(expense: JsValue) -> Result<JsValue, JsValue> {
    let expense: Expense = serde_wasm_bindgen::from_value(expense)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse expense: {}", e)))?;

    let result = split_expense_impl(&expense);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Calculates net balances for all participants across multiple expenses.
///
/// Takes a JavaScript array of Expense objects and returns balance summaries.
///
/// # Arguments
///
/// * `expenses` - A JavaScript array of Expense objects
///
/// # Returns
///
/// A JavaScript array of BalanceSummary objects, or an error message.
#[wasm_bindgen]
pub fn calculate_all_balances(expenses: JsValue) -> Result<JsValue, JsValue> {
    let expenses: Vec<Expense> = serde_wasm_bindgen::from_value(expenses)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse expenses: {}", e)))?;

    let result = calculate_all_balances_impl(&expenses);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}
