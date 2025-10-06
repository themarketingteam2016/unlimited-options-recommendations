import { supabaseAdmin } from '../../../lib/supabase';
import { createVariantOnDemand } from '../../../lib/shopify-variants';
import { handleCors } from '../../../lib/cors';

async function addVariantHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { variantId, quantity = 1 } = req.body;

    if (!variantId) {
      return res.status(400).json({ error: 'variantId is required' });
    }

    // Get variant details from database
    const { data: variant, error: variantError } = await supabaseAdmin
      .from('variants')
      .select(`
        *,
        product:products!inner(shopify_product_id, title),
        variant_options (
          attribute:attributes (name),
          attribute_value:attribute_values (value)
        )
      `)
      .eq('id', variantId)
      .single();

    if (variantError || !variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    // Check stock
    if (variant.stock_quantity < quantity) {
      return res.status(400).json({
        error: 'Insufficient stock',
        available: variant.stock_quantity
      });
    }

    let shopifyVariantId = variant.shopify_variant_id;

    // Create Shopify variant if it doesn't exist
    if (!shopifyVariantId) {
      try {
        shopifyVariantId = await createVariantOnDemand(variantId);
      } catch (error) {
        console.error('Failed to create Shopify variant:', error);
        // Fallback: return data for client-side cart add with properties
        return res.status(200).json({
          success: false,
          fallback: true,
          variant: {
            id: variant.id,
            sku: variant.sku,
            price: variant.price,
            title: variant.product.title,
            options: variant.variant_options?.map(opt => ({
              name: opt.attribute.name,
              value: opt.attribute_value.value
            })) || []
          },
          message: 'Using fallback mode with line item properties'
        });
      }
    }

    // Extract numeric ID from GID
    const numericVariantId = shopifyVariantId.split('/').pop();

    // Build line item properties
    const properties = {};
    variant.variant_options?.forEach(opt => {
      properties[opt.attribute.name] = opt.attribute_value.value;
    });

    if (variant.sku) {
      properties['_SKU'] = variant.sku;
    }

    // Return cart add data
    res.status(200).json({
      success: true,
      cartData: {
        id: numericVariantId,
        quantity: quantity,
        properties: properties
      },
      variant: {
        id: shopifyVariantId,
        sku: variant.sku,
        price: variant.price,
        stock: variant.stock_quantity
      }
    });
  } catch (error) {
    console.error('Add variant error:', error);
    res.status(500).json({ error: error.message });
  }
}

export default function handler(req, res) {
  return handleCors(req, res, addVariantHandler);
}
