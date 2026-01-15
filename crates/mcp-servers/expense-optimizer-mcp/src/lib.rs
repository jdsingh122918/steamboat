//! Expense Optimizer MCP Server
//!
//! This crate provides an MCP (Model Context Protocol) server interface
//! for the expense-optimizer debt simplification engine.

use expense_optimizer::{simplify_debts, Debt, SimplificationResult};
use serde::{Deserialize, Serialize};

/// An MCP request containing a method name and JSON-encoded parameters.
#[derive(Debug, Serialize, Deserialize)]
pub struct McpRequest {
    /// The method to invoke (e.g., "optimize_settlements").
    pub method: String,
    /// JSON-encoded parameters for the method.
    pub params: String,
}

/// An MCP response containing the result or error from a request.
#[derive(Debug, Serialize, Deserialize)]
pub struct McpResponse {
    /// Whether the request was successful.
    pub success: bool,
    /// JSON-encoded result if successful.
    pub result: Option<String>,
    /// Error message if unsuccessful.
    pub error: Option<String>,
}

/// Handle an MCP request and return an MCP response.
///
/// # Arguments
/// * `request` - The MCP request to process
///
/// # Returns
/// An McpResponse containing either the result or an error
pub fn handle(request: McpRequest) -> McpResponse {
    handle_request(&request.method, &request.params)
}

/// Internal handler for MCP requests.
///
/// # Arguments
/// * `method` - The method name to invoke
/// * `params` - JSON-encoded parameters
///
/// # Returns
/// An McpResponse containing either the result or an error
fn handle_request(method: &str, params: &str) -> McpResponse {
    match method {
        "optimize_settlements" => optimize_settlements(params),
        _ => McpResponse {
            success: false,
            result: None,
            error: Some(format!("Unknown method: {}", method)),
        },
    }
}

/// Handle the optimize_settlements method.
///
/// Parses debts from JSON, runs the simplification algorithm,
/// and returns the result as JSON.
fn optimize_settlements(params: &str) -> McpResponse {
    // Parse debts from JSON
    let debts: Vec<Debt> = match serde_json::from_str(params) {
        Ok(d) => d,
        Err(e) => {
            return McpResponse {
                success: false,
                result: None,
                error: Some(format!("Parse error: {}", e)),
            };
        }
    };

    // Call the simplification algorithm
    let result: SimplificationResult = simplify_debts(&debts);

    // Serialize the result to JSON
    match serde_json::to_string(&result) {
        Ok(json) => McpResponse {
            success: true,
            result: Some(json),
            error: None,
        },
        Err(e) => McpResponse {
            success: false,
            result: None,
            error: Some(format!("Serialization error: {}", e)),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_debts_returns_empty_payments() {
        let response = handle_request("optimize_settlements", "[]");
        assert!(response.success);
        let result: SimplificationResult =
            serde_json::from_str(&response.result.unwrap()).unwrap();
        assert_eq!(result.payments.len(), 0);
    }

    #[test]
    fn test_single_debt_returns_single_payment() {
        let debts = r#"[{"debtor":"A","creditor":"B","amount_cents":5000,"expense_ids":[]}]"#;
        let response = handle_request("optimize_settlements", debts);
        assert!(response.success);
        let result: SimplificationResult =
            serde_json::from_str(&response.result.unwrap()).unwrap();
        assert_eq!(result.payments.len(), 1);
    }

    #[test]
    fn test_circular_debts_returns_empty_payments() {
        let debts = r#"[
            {"debtor":"A","creditor":"B","amount_cents":10000,"expense_ids":[]},
            {"debtor":"B","creditor":"C","amount_cents":10000,"expense_ids":[]},
            {"debtor":"C","creditor":"A","amount_cents":10000,"expense_ids":[]}
        ]"#;
        let response = handle_request("optimize_settlements", debts);
        assert!(response.success);
        let result: SimplificationResult =
            serde_json::from_str(&response.result.unwrap()).unwrap();
        assert_eq!(result.payments.len(), 0);
    }

    #[test]
    fn test_chain_debts_consolidates_payment() {
        let debts = r#"[
            {"debtor":"A","creditor":"B","amount_cents":10000,"expense_ids":[]},
            {"debtor":"B","creditor":"C","amount_cents":10000,"expense_ids":[]}
        ]"#;
        let response = handle_request("optimize_settlements", debts);
        assert!(response.success);
        let result: SimplificationResult =
            serde_json::from_str(&response.result.unwrap()).unwrap();
        assert_eq!(result.payments.len(), 1);
        assert_eq!(result.payments[0].from, "A");
        assert_eq!(result.payments[0].to, "C");
    }

    #[test]
    fn test_unknown_method_returns_error() {
        let response = handle_request("unknown_method", "{}");
        assert!(!response.success);
        assert!(response.error.unwrap().contains("Unknown method"));
    }

    #[test]
    fn test_malformed_json_returns_parse_error() {
        let response = handle_request("optimize_settlements", "not valid json");
        assert!(!response.success);
        assert!(response.error.unwrap().contains("Parse error"));
    }

    #[test]
    fn test_large_scenario_optimizes_efficiently() {
        // Generate 50 debts among 20 people
        let mut debts = Vec::new();
        for i in 0..50 {
            debts.push(serde_json::json!({
                "debtor": format!("person_{}", i % 20),
                "creditor": format!("person_{}", (i + 1) % 20),
                "amount_cents": 1000 + (i * 100),
                "expense_ids": []
            }));
        }
        let debts_json = serde_json::to_string(&debts).unwrap();
        let response = handle_request("optimize_settlements", &debts_json);
        assert!(response.success);
        let result: SimplificationResult =
            serde_json::from_str(&response.result.unwrap()).unwrap();
        // At most n-1 payments for n people
        assert!(result.optimized_count <= 19);
    }

    #[test]
    fn test_handle_function_works() {
        let request = McpRequest {
            method: "optimize_settlements".to_string(),
            params: "[]".to_string(),
        };
        let response = handle(request);
        assert!(response.success);
    }

    #[test]
    fn test_handle_with_invalid_method() {
        let request = McpRequest {
            method: "invalid".to_string(),
            params: "{}".to_string(),
        };
        let response = handle(request);
        assert!(!response.success);
        assert!(response.error.is_some());
    }
}
