use shopify_function::prelude::*;
use shopify_function::Result;

#[shopify_function_target(query_path = "src/query.graphql", schema_path = "schema.graphql")]
fn function(input: input::ResponseData) -> Result<output::FunctionResult> {
    let mut operations: Vec<output::CartOperation> = Vec::new();

    // Iterate through cart lines
    for line in input.cart.lines.iter() {
        // Check if this is a custom variant (has _Price property)
        if let Some(custom_price) = line.attribute.as_ref().and_then(|attrs| {
            attrs.iter().find_map(|attr| {
                if attr.key == "_Price" {
                    // Extract price from "$600" format
                    attr.value.strip_prefix("$").and_then(|v| v.parse::<f64>().ok())
                } else {
                    None
                }
            })
        }) {
            // Update the line item price
            operations.push(output::CartOperation::Update(output::CartLineUpdate {
                cart_line_id: line.id.clone(),
                price: Some(output::Price {
                    adjustment: output::PriceAdjustment::PercentageDecrease(output::Percentage {
                        value: calculate_discount_percentage(
                            line.cost.amount_per_quantity.amount,
                            custom_price,
                        ),
                    }),
                }),
                title: None,
            }));
        }
    }

    Ok(output::FunctionResult { operations })
}

fn calculate_discount_percentage(original_price: f64, target_price: f64) -> f64 {
    if original_price <= 0.0 {
        return 0.0;
    }

    let difference = original_price - target_price;
    let percentage = (difference / original_price) * 100.0;

    // Clamp between 0 and 100
    percentage.max(0.0).min(100.0)
}
