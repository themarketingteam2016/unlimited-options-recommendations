import { withAuth } from '../../../lib/auth-middleware';
import { supabaseAdmin } from '../../../lib/supabase';

// This endpoint syncs Shopify products to our database
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Products array required' });
    }

    const synced = [];

    for (const product of products) {
      const { data, error } = await supabaseAdmin
        .from('products')
        .upsert({
          shopify_product_id: product.id,
          shopify_handle: product.handle,
          title: product.title,
          description: product.description || '',
          image_url: product.featuredImage?.url || null,
          status: product.status || 'active'
        }, {
          onConflict: 'shopify_product_id'
        })
        .select()
        .single();

      if (!error) {
        synced.push(data);
      }
    }

    res.status(200).json({ success: true, synced: synced.length });
  } catch (error) {
    console.error('Failed to sync products:', error);
    res.status(500).json({ error: error.message });
  }
}

export default withAuth(handler);
