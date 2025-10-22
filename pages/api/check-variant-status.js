import { supabaseAdmin } from '../../lib/supabase';
import { handleCors } from '../../lib/cors';

async function checkVariantStatusHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { variantId } = req.body;

    if (!variantId) {
      return res.status(400).json({ error: 'variantId is required' });
    }

    console.log('[check-variant-status] Checking variant:', variantId);

    // Get variant from database
    const { data: variant, error } = await supabaseAdmin
      .from('variants')
      .select(`
        *,
        product:products!inner(shopify_product_id, title)
      `)
      .eq('id', variantId)
      .single();

    if (error || !variant) {
      return res.status(404).json({ error: 'Variant not found in database' });
    }

    const status = {
      variantId: variant.id,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock_quantity,
      hasShopifyId: !!variant.shopify_variant_id,
      shopifyVariantId: variant.shopify_variant_id,
      productTitle: variant.product?.title,
      productId: variant.product?.shopify_product_id,
      isActive: variant.is_active
    };

    console.log('[check-variant-status] Status:', status);

    res.status(200).json(status);
  } catch (error) {
    console.error('[check-variant-status] Error:', error);
    res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
}

export default function handler(req, res) {
  return handleCors(req, res, checkVariantStatusHandler);
}
