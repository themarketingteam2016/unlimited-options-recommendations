import { withAuth } from '../../../lib/auth-middleware';
import { supabaseAdmin } from '../../../lib/supabase';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productId, options } = req.body;
    const { shop } = req.session;

    if (!productId || !options) {
      return res.status(400).json({ error: 'productId and options are required' });
    }

    console.log(`[Options Create] Creating options for product ${productId} in shop ${shop}`);

    // Get internal product ID
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_product_id', productId)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Store options in database (you can expand this based on your schema)
    // For now, we'll just acknowledge success
    // You may want to create an 'options' table to store these

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Options Create] Failed to create options:', error);
    res.status(500).json({ error: error.message });
  }
}

export default withAuth(handler);
