import { supabaseAdmin } from '../../../../lib/supabase';
import { handleCors } from '../../../../lib/cors';

async function recommendationsHandler(req, res) {
  const { id: shopifyProductId } = req.query;

  console.log('[Recommendations API] Request received:', {
    shopifyProductId,
    method: req.method,
    url: req.url
  });

  if (!shopifyProductId) {
    console.error('[Recommendations API] No product ID provided');
    return res.status(400).json({ error: 'Product ID is required' });
  }

  if (req.method !== 'GET') {
    console.error('[Recommendations API] Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get internal product ID from shopify_product_id
    console.log('[Recommendations API] Looking up product:', shopifyProductId);
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_product_id', shopifyProductId)
      .single();

    if (productError) {
      console.error('[Recommendations API] Product lookup error:', productError);
      return res.status(404).json({ error: 'Product not found', details: productError.message });
    }

    if (!product) {
      console.error('[Recommendations API] Product not found in database');
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log('[Recommendations API] Found product ID:', product.id);

    // Fetch recommendations with full product details
    const { data, error } = await supabaseAdmin
      .from('product_recommendations')
      .select(`
        id,
        display_order,
        recommended_product:products!product_recommendations_recommended_product_id_fkey (
          id,
          shopify_product_id,
          shopify_handle,
          title,
          description,
          image_url,
          status
        )
      `)
      .eq('product_id', product.id)
      .order('display_order', { ascending: true })
      .limit(6);

    if (error) {
      console.error('[Recommendations API] Recommendations fetch error:', error);
      throw error;
    }

    console.log('[Recommendations API] Fetched recommendations:', { count: (data || []).length });

    // Return recommendations with proper structure
    const recommendations = (data || []).map(rec => ({
      id: rec.id,
      display_order: rec.display_order,
      reason: null, // Can be added to schema later if needed
      recommended_product: {
        id: rec.recommended_product?.shopify_product_id,
        shopify_product_id: rec.recommended_product?.shopify_product_id,
        handle: rec.recommended_product?.shopify_handle,
        title: rec.recommended_product?.title,
        description: rec.recommended_product?.description,
        image_url: rec.recommended_product?.image_url,
        featuredImage: rec.recommended_product?.image_url ? { url: rec.recommended_product.image_url } : null,
        status: rec.recommended_product?.status,
        price: '0.00' // Default price, can be enhanced later
      }
    })).filter(rec => rec.recommended_product?.id);

    console.log('[Recommendations API] Returning recommendations:', { count: recommendations.length });
    return res.status(200).json(recommendations);
  } catch (error) {
    console.error('[Recommendations API] Failed to fetch recommendations:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default function handler(req, res) {
  return handleCors(req, res, recommendationsHandler);
}
