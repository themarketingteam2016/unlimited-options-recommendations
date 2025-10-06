import { supabaseAdmin } from '../../../../lib/supabase';
import { handleCors } from '../../../../lib/cors';

async function recommendationsHandler(req, res) {
  const { id: shopifyProductId } = req.query;

  if (!shopifyProductId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get internal product ID from shopify_product_id
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_product_id', shopifyProductId)
      .single();

    if (productError) {
      console.error('Product lookup error:', productError);
      return res.status(404).json({ error: 'Product not found', details: productError.message });
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Fetch recommendations with full product details
    const { data, error } = await supabaseAdmin
      .from('recommendations')
      .select(`
        id,
        reason,
        recommended_product:products!recommendations_recommended_product_id_fkey (
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
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) {
      console.error('Recommendations fetch error:', error);
      throw error;
    }

    // Return recommendations with proper structure
    const recommendations = (data || []).map(rec => ({
      id: rec.id,
      reason: rec.reason,
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

    res.status(200).json(recommendations);
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    res.status(500).json({ error: error.message });
  }
}

export default function handler(req, res) {
  return handleCors(req, res, recommendationsHandler);
}
