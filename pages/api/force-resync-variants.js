import { syncVariantToShopify } from '../../lib/shopify-variants';
import { supabaseAdmin } from '../../lib/supabase';
import { handleCors } from '../../lib/cors';

async function forceResyncVariantsHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    console.log('[force-resync] Starting force resync for product:', productId);

    // Get internal product ID
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_product_id', productId)
      .single();

    if (!product) {
      throw new Error('Product not found');
    }

    // Get ALL variants (including those with existing Shopify IDs)
    const { data: variants } = await supabaseAdmin
      .from('variants')
      .select(`
        *,
        variant_options (
          attribute:attributes (name),
          attribute_value:attribute_values (value)
        )
      `)
      .eq('product_id', product.id)
      .eq('is_active', true)
      .limit(100);

    if (!variants || variants.length === 0) {
      return res.status(200).json({
        synced: 0,
        message: 'No variants found for this product'
      });
    }

    console.log(`[force-resync] Found ${variants.length} variants to resync`);

    // Clear existing Shopify IDs first
    await supabaseAdmin
      .from('variants')
      .update({ shopify_variant_id: null })
      .eq('product_id', product.id);

    console.log('[force-resync] Cleared existing Shopify variant IDs');

    const results = [];
    for (const variant of variants) {
      try {
        console.log(`[force-resync] Syncing variant ${variant.id}...`);
        const shopifyVariantId = await syncVariantToShopify(variant, productId);
        results.push({
          success: true,
          variantId: variant.id,
          shopifyVariantId,
          sku: variant.sku
        });
        console.log(`[force-resync] ✓ Synced variant ${variant.id} -> ${shopifyVariantId}`);
      } catch (error) {
        console.error(`[force-resync] ✗ Failed to sync variant ${variant.id}:`, error.message);
        results.push({
          success: false,
          variantId: variant.id,
          error: error.message,
          sku: variant.sku
        });
      }
    }

    const response = {
      synced: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      total: variants.length,
      results
    };

    console.log('[force-resync] Completed:', response);

    res.status(200).json(response);
  } catch (error) {
    console.error('[force-resync] Error:', error);
    res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
}

export default function handler(req, res) {
  return handleCors(req, res, forceResyncVariantsHandler);
}
