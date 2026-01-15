use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Venmo,
    PayPal,
    CashApp,
    Zelle,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentLinkRequest {
    pub platform: Platform,
    pub recipient: String,
    pub amount_cents: i64,
    pub memo: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentLinkResult {
    pub platform: Platform,
    pub link: Option<String>,
    pub fallback_text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpRequest {
    pub method: String,
    pub params: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpResponse {
    pub success: bool,
    pub result: Option<String>,
    pub error: Option<String>,
}

/// Handle an MCP request and return a response
pub fn handle(request: McpRequest) -> McpResponse {
    match request.method.as_str() {
        "generate_payment_link" => generate_payment_link(&request.params),
        _ => McpResponse {
            success: false,
            result: None,
            error: Some(format!("Unknown method: {}", request.method)),
        },
    }
}

/// Generate a payment link based on the request parameters
fn generate_payment_link(params: &str) -> McpResponse {
    // Parse the request
    let request: PaymentLinkRequest = match serde_json::from_str(params) {
        Ok(req) => req,
        Err(e) => {
            return McpResponse {
                success: false,
                result: None,
                error: Some(format!("Failed to parse request: {}", e)),
            };
        }
    };

    // Generate the payment link result
    let result = generate_link_for_platform(&request);

    // Serialize the result
    match serde_json::to_string(&result) {
        Ok(json) => McpResponse {
            success: true,
            result: Some(json),
            error: None,
        },
        Err(e) => McpResponse {
            success: false,
            result: None,
            error: Some(format!("Failed to serialize result: {}", e)),
        },
    }
}

/// Generate a payment link for a specific platform
fn generate_link_for_platform(request: &PaymentLinkRequest) -> PaymentLinkResult {
    let amount_str = format_amount(request.amount_cents);

    match request.platform {
        Platform::Venmo => {
            let recipient = ensure_venmo_prefix(&request.recipient);
            let encoded_memo = urlencoding::encode(&request.memo);
            let link = format!(
                "venmo://paycharge?txn=pay&recipients={}&amount={}&note={}",
                recipient, amount_str, encoded_memo
            );
            PaymentLinkResult {
                platform: Platform::Venmo,
                link: Some(link),
                fallback_text: format!(
                    "Pay {} ${} via Venmo: {}",
                    recipient, amount_str, request.memo
                ),
            }
        }
        Platform::PayPal => {
            let link = format!("https://paypal.me/{}/{}", request.recipient, amount_str);
            PaymentLinkResult {
                platform: Platform::PayPal,
                link: Some(link),
                fallback_text: format!(
                    "Pay {} ${} via PayPal: {}",
                    request.recipient, amount_str, request.memo
                ),
            }
        }
        Platform::CashApp => {
            let recipient = ensure_cashapp_prefix(&request.recipient);
            let link = format!("https://cash.app/{}/{}", recipient, amount_str);
            PaymentLinkResult {
                platform: Platform::CashApp,
                link: Some(link),
                fallback_text: format!(
                    "Pay {} ${} via Cash App: {}",
                    recipient, amount_str, request.memo
                ),
            }
        }
        Platform::Zelle => {
            // Zelle has no deep link capability
            PaymentLinkResult {
                platform: Platform::Zelle,
                link: None,
                fallback_text: format!("Pay {} ${} via Zelle", request.recipient, amount_str),
            }
        }
    }
}

/// Convert cents to dollars with two decimal places
fn format_amount(cents: i64) -> String {
    format!("{:.2}", cents as f64 / 100.0)
}

/// Ensure Venmo username has @ prefix
fn ensure_venmo_prefix(recipient: &str) -> String {
    if recipient.starts_with('@') {
        recipient.to_string()
    } else {
        format!("@{}", recipient)
    }
}

/// Ensure CashApp username has $ prefix
fn ensure_cashapp_prefix(recipient: &str) -> String {
    if recipient.starts_with('$') {
        recipient.to_string()
    } else {
        format!("${}", recipient)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_venmo_link_generation() {
        let request = create_request("venmo", "@mike_j", 15000, "Trip expenses");
        let response = handle(request);
        assert!(response.success);
        let result: PaymentLinkResult = serde_json::from_str(&response.result.unwrap()).unwrap();
        assert_eq!(
            result.link.unwrap(),
            "venmo://paycharge?txn=pay&recipients=@mike_j&amount=150.00&note=Trip%20expenses"
        );
    }

    #[test]
    fn test_venmo_handles_missing_at_sign() {
        let request = create_request("venmo", "mike_j", 15000, "Trip");
        let response = handle(request);
        let result: PaymentLinkResult = serde_json::from_str(&response.result.unwrap()).unwrap();
        assert!(result.link.unwrap().contains("@mike_j"));
    }

    #[test]
    fn test_venmo_url_encodes_special_characters() {
        let request = create_request("venmo", "@mike_j", 15000, "Trip & dinner");
        let response = handle(request);
        let result: PaymentLinkResult = serde_json::from_str(&response.result.unwrap()).unwrap();
        assert!(result.link.unwrap().contains("Trip%20%26%20dinner"));
    }

    #[test]
    fn test_paypal_link_generation() {
        let request = create_request("paypal", "mike@email.com", 15000, "Trip expenses");
        let response = handle(request);
        let result: PaymentLinkResult = serde_json::from_str(&response.result.unwrap()).unwrap();
        assert_eq!(result.link.unwrap(), "https://paypal.me/mike@email.com/150.00");
    }

    #[test]
    fn test_paypal_memo_in_fallback_not_url() {
        let request = create_request("paypal", "mike@email.com", 15000, "Trip expenses");
        let response = handle(request);
        let result: PaymentLinkResult = serde_json::from_str(&response.result.unwrap()).unwrap();
        assert!(!result.link.unwrap().contains("Trip"));
        assert!(result.fallback_text.contains("Trip expenses"));
    }

    #[test]
    fn test_cashapp_link_generation() {
        let request = create_request("cashapp", "$TomB", 8550, "Dinner");
        let response = handle(request);
        let result: PaymentLinkResult = serde_json::from_str(&response.result.unwrap()).unwrap();
        assert_eq!(result.link.unwrap(), "https://cash.app/$TomB/85.50");
    }

    #[test]
    fn test_cashapp_adds_dollar_prefix_if_missing() {
        let request = create_request("cashapp", "TomB", 8550, "Dinner");
        let response = handle(request);
        let result: PaymentLinkResult = serde_json::from_str(&response.result.unwrap()).unwrap();
        assert!(result.link.unwrap().contains("$TomB"));
    }

    #[test]
    fn test_zelle_returns_fallback_only() {
        let request = create_request("zelle", "555-123-4567", 6500, "Settlement");
        let response = handle(request);
        let result: PaymentLinkResult = serde_json::from_str(&response.result.unwrap()).unwrap();
        assert!(result.link.is_none());
        assert_eq!(result.fallback_text, "Pay 555-123-4567 $65.00 via Zelle");
    }

    #[test]
    fn test_generate_payment_link_mcp_method() {
        let request = McpRequest {
            method: "generate_payment_link".to_string(),
            params: r#"{"platform":"venmo","recipient":"@user","amount_cents":5000,"memo":"Test"}"#
                .to_string(),
        };
        let response = handle(request);
        assert!(response.success);
    }

    #[test]
    fn test_invalid_platform_returns_error() {
        let request = McpRequest {
            method: "generate_payment_link".to_string(),
            params: r#"{"platform":"bitcoin","recipient":"addr","amount_cents":5000,"memo":"Test"}"#
                .to_string(),
        };
        let response = handle(request);
        assert!(!response.success);
        assert!(response.error.is_some());
    }

    #[test]
    fn test_unknown_method_returns_error() {
        let request = McpRequest {
            method: "unknown".to_string(),
            params: "{}".to_string(),
        };
        let response = handle(request);
        assert!(!response.success);
        assert!(response.error.unwrap().contains("Unknown method"));
    }

    // Helper function for creating test requests
    fn create_request(platform: &str, recipient: &str, amount_cents: i64, memo: &str) -> McpRequest {
        McpRequest {
            method: "generate_payment_link".to_string(),
            params: serde_json::json!({
                "platform": platform,
                "recipient": recipient,
                "amount_cents": amount_cents,
                "memo": memo
            })
            .to_string(),
        }
    }
}
