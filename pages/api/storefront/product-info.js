import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { productId } = req.query;

  if (!productId) {
    return res.status(400).json({ error: 'productId query parameter is required' });
  }

  if (req.method === 'GET') {
    try {
      // Get product info by shopify_product_id (public endpoint, no auth required)
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .select('id, shopify_product_id, is_ring, ring_sizes')
        .eq('shopify_product_id', productId)
        .single();

      if (error || !product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.status(200).json({
        id: product.id,
        shopify_product_id: product.shopify_product_id,
        is_ring: product.is_ring || false,
        ring_sizes: product.ring_sizes || null
      });
    } catch (error) {
      console.error('Failed to fetch product info:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
