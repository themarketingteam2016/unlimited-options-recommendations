import { supabaseAdmin } from '../../../../lib/supabase';
import { handleCors } from '../../../../lib/cors';

async function variantsHandler(req, res) {
  const { id: shopifyProductId } = req.query;

  console.log('[Variants API] Request received:', {
    shopifyProductId,
    method: req.method,
    url: req.url
  });

  if (!shopifyProductId) {
    console.error('[Variants API] No product ID provided');
    return res.status(400).json({ error: 'Product ID is required' });
  }

  if (req.method !== 'GET') {
    console.error('[Variants API] Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get internal product ID from shopify_product_id
    console.log('[Variants API] Looking up product:', shopifyProductId);
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_product_id', shopifyProductId)
      .single();

    if (productError) {
      console.error('[Variants API] Product lookup error:', productError);
      return res.status(404).json({ error: 'Product not found', details: productError.message });
    }

    if (!product) {
      console.error('[Variants API] Product not found in database');
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log('[Variants API] Found product ID:', product.id);

    // Fetch variants with options
    const { data, error } = await supabaseAdmin
      .from('variants')
      .select(`
        *,
        variant_options (
          id,
          attribute_id,
          attribute_value_id,
          attribute:attributes (
            id,
            name,
            is_primary
          ),
          attribute_value:attribute_values (
            id,
            value,
            image_url
          )
        )
      `)
      .eq('product_id', product.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Variants API] Error fetching variants:', error);
      throw error;
    }

    const variants = data || [];
    console.log('[Variants API] Returning variants:', { count: variants.length });

    // Ensure we always return an array
    return res.status(200).json(Array.isArray(variants) ? variants : []);
  } catch (error) {
    console.error('[Variants API] Failed to fetch product variants:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default function handler(req, res) {
  return handleCors(req, res, variantsHandler);
}
