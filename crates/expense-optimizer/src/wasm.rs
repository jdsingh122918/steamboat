//! WASM bindings for the expense optimizer.
//!
//! This module provides WebAssembly bindings for use in browser environments.

use wasm_bindgen::prelude::*;

use crate::simplify::simplify_debts;
use crate::types::Debt;

/// Initialize the WASM module with panic hook for better error messages.
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Optimize settlements from a list of debts.
///
/// Takes a JSON array of Debt objects and returns a SimplificationResult.
#[wasm_bindgen]
pub fn optimize_settlements(debts: JsValue) -> Result<JsValue, JsValue> {
    let debts: Vec<Debt> = serde_wasm_bindgen::from_value(debts)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse debts: {}", e)))?;

    let result = simplify_debts(&debts);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Validate that all debts have positive amounts.
#[wasm_bindgen]
pub fn validate_debts(debts: JsValue) -> Result<bool, JsValue> {
    let debts: Vec<Debt> = serde_wasm_bindgen::from_value(debts)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse debts: {}", e)))?;

    Ok(debts.iter().all(|d| d.amount_cents > 0))
}
