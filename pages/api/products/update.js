import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { productId: shopifyProductId } = req.query;

  if (!shopifyProductId) {
    return res.status(400).json({ error: 'productId query parameter is required' });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image_url } = req.body;

    console.log('Updating product image for:', shopifyProductId);

    // Update product image in database
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ image_url })
      .eq('shopify_product_id', shopifyProductId)
      .select()
      .single();

    if (error) throw error;

    console.log('Product image updated successfully');

    res.status(200).json({ success: true, product: data });
  } catch (error) {
    console.error('Failed to update product:', error);
    res.status(500).json({ error: error.message });
  }
}
