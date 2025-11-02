import { withOptionalAuth } from '../../../lib/auth-middleware';
import { supabaseAdmin } from '../../../lib/supabase';
import { createVariantOnDemand } from '../../../lib/shopify-variants';
import { handleCors } from '../../../lib/cors';

async function addVariantHandler(req, res) {
  console.log('[add-variant] Handler started');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { variantId, quantity = 1, ringSize } = req.body;

    console.log('[add-variant] Request received:', { variantId, quantity, ringSize });

    if (!variantId) {
      console.error('[add-variant] Missing variantId');
      return res.status(400).json({ error: 'variantId is required' });
    }

    // Check if Supabase is configured
    if (!supabaseAdmin) {
      console.error('[add-variant] Supabase admin client not initialized');
      return res.status(500).json({
        error: 'Database not configured',
        message: 'Supabase admin client is not available'
      });
    }

    // Get variant details from database
    console.log('[add-variant] Fetching variant from database:', variantId);
    const { data: variant, error: variantError } = await supabaseAdmin
      .from('variants')
      .select(`
        *,
        product:products(shopify_product_id, title),
        variant_options (
          attribute:attributes (name),
          attribute_value:attribute_values (value)
        )
      `)
      .eq('id', variantId)
      .single();

    if (variantError) {
      console.error('[add-variant] Database error fetching variant:', {
        error: variantError,
        message: variantError?.message,
        details: variantError?.details,
        hint: variantError?.hint,
        code: variantError?.code
      });
      return res.status(500).json({
        error: 'Database error',
        message: variantError?.message,
        details: variantError?.details
      });
    }

    if (!variant) {
      console.error('[add-variant] Variant not found with ID:', variantId);
      return res.status(404).json({
        error: 'Variant not found',
        variantId: variantId
      });
    }

    // Validate product relationship
    if (!variant.product || !variant.product.shopify_product_id) {
      console.error('[add-variant] Variant has no associated product:', {
        variantId: variant.id,
        product: variant.product
      });
      return res.status(400).json({
        error: 'Variant has no associated product',
        variantId: variant.id
      });
    }

    console.log('[add-variant] Variant found:', {
      id: variant.id,
      sku: variant.sku,
      stock: variant.stock_quantity,
      productId: variant.product.shopify_product_id
    });

    // Check stock
    if (variant.stock_quantity !== null && variant.stock_quantity !== undefined && variant.stock_quantity < quantity) {
      console.error('[add-variant] Insufficient stock:', {
        requested: quantity,
        available: variant.stock_quantity
      });
      return res.status(400).json({
        error: 'Out of stock',
        available: variant.stock_quantity
      });
    }

    // Note: variants table doesn't have shopify_variant_id column
    // Always use fallback mode with line item properties
    console.log('[add-variant] Using fallback mode - custom variants not synced to Shopify');

    // Build line item properties with variant options
    const properties = {
      '_Custom_Variant': 'Yes',
      '_Price': `$${variant.price}`,
      '_custom_variant_id': variant.id // Store variant ID for checkout
    };

    console.log('[add-variant] DEBUG: variant.id =', variant.id);
    console.log('[add-variant] DEBUG: properties after initial build =', JSON.stringify(properties));

    variant.variant_options?.forEach(opt => {
      if (opt.attribute && opt.attribute_value) {
        properties[opt.attribute.name] = opt.attribute_value.value;
      }
    });

    if (variant.sku) {
      properties['_SKU'] = variant.sku;
    }

    // Add Ring Size if provided
    if (ringSize) {
      properties['Ring Size'] = ringSize;
    }

    console.log('[add-variant] Built fallback cart data with properties:', properties);

    // Return fallback response - client will use Shopify product's first variant with custom properties
    const response = {
      success: false,
      fallback: true,
      variant: {
        id: variant.id,
        sku: variant.sku,
        price: variant.price,
        title: variant.product.title,
        shopify_product_id: variant.product.shopify_product_id,
        options: variant.variant_options?.map(opt => ({
          name: opt.attribute?.name || 'Unknown',
          value: opt.attribute_value?.value || 'Unknown'
        })) || [],
        properties: properties
      },
      message: 'Using fallback mode with line item properties'
    };

    console.log('[add-variant] DEBUG: Final properties being sent =', JSON.stringify(response.variant.properties));
    console.log('[add-variant] Success response:', response);
    res.status(200).json(response);
  } catch (error) {
    console.error('[add-variant] Unexpected error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Wrap with optional auth first, then CORS
const authHandler = withOptionalAuth(addVariantHandler);

export default async function handler(req, res) {
  try {
    console.log('[add-variant] Main handler called');
    return await handleCors(req, res, authHandler);
  } catch (error) {
    console.error('[add-variant] Error in main handler:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({
      error: 'Handler error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
