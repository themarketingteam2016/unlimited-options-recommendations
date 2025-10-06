import { supabaseAdmin } from '../../../lib/supabase';
import { createVariantOnDemand } from '../../../lib/shopify-variants';
import { handleCors } from '../../../lib/cors';

async function addVariantHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { variantId, quantity = 1 } = req.body;

    console.log('[add-variant] Request received:', { variantId, quantity });

    if (!variantId) {
      console.error('[add-variant] Missing variantId');
      return res.status(400).json({ error: 'variantId is required' });
    }

    // Get variant details from database
    console.log('[add-variant] Fetching variant from database:', variantId);
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
      console.error('[add-variant] Variant not found:', variantError);
      return res.status(404).json({
        error: 'Variant not found',
        details: variantError?.message
      });
    }

    console.log('[add-variant] Variant found:', {
      id: variant.id,
      sku: variant.sku,
      stock: variant.stock_quantity,
      shopifyVariantId: variant.shopify_variant_id,
      productId: variant.product?.shopify_product_id
    });

    // Check stock
    if (variant.stock_quantity < quantity) {
      console.error('[add-variant] Insufficient stock:', {
        requested: quantity,
        available: variant.stock_quantity
      });
      return res.status(400).json({
        error: 'Out of stock',
        available: variant.stock_quantity
      });
    }

    let shopifyVariantId = variant.shopify_variant_id;

    // Create Shopify variant if it doesn't exist
    if (!shopifyVariantId) {
      console.log('[add-variant] Creating Shopify variant on-demand');
      try {
        shopifyVariantId = await createVariantOnDemand(variantId);
        console.log('[add-variant] Shopify variant created:', shopifyVariantId);
      } catch (error) {
        console.error('[add-variant] Failed to create Shopify variant:', error.message);
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
          message: 'Using fallback mode with line item properties',
          error: error.message
        });
      }
    } else {
      console.log('[add-variant] Using existing Shopify variant:', shopifyVariantId);
    }

    // Extract numeric ID from GID
    const numericVariantId = shopifyVariantId.split('/').pop();
    console.log('[add-variant] Extracted numeric variant ID:', numericVariantId);

    // Build line item properties
    const properties = {};
    variant.variant_options?.forEach(opt => {
      properties[opt.attribute.name] = opt.attribute_value.value;
    });

    if (variant.sku) {
      properties['_SKU'] = variant.sku;
    }

    console.log('[add-variant] Built cart data with properties:', properties);

    // Return cart add data
    const response = {
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
    };

    console.log('[add-variant] Success response:', response);
    res.status(200).json(response);
  } catch (error) {
    console.error('[add-variant] Unexpected error:', error);
    res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
}

export default function handler(req, res) {
  return handleCors(req, res, addVariantHandler);
}
