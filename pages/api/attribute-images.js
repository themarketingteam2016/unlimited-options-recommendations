import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req, res) {
  const { productId: shopifyProductId } = req.query;

  if (!shopifyProductId) {
    return res.status(400).json({ error: 'productId query parameter is required' });
  }

  // Get internal product ID
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('shopify_product_id', shopifyProductId)
    .single();

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const productId = product.id;

  if (req.method === 'GET') {
    try {
      // Fetch all variant images for this product
      const { data, error } = await supabaseAdmin
        .from('variant_images')
        .select('*')
        .eq('product_id', productId);

      if (error) throw error;

      res.status(200).json(data || []);
    } catch (error) {
      console.error('Failed to fetch attribute images:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { attributeValueId, imageUrl } = req.body;

      if (!attributeValueId || !imageUrl) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if image already exists for this product + attribute value
      const { data: existing } = await supabaseAdmin
        .from('variant_images')
        .select('id')
        .eq('product_id', productId)
        .eq('attribute_value_id', attributeValueId)
        .single();

      if (existing) {
        // Update existing image
        const { error } = await supabaseAdmin
          .from('variant_images')
          .update({ image_url: imageUrl })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new image
        const { error } = await supabaseAdmin
          .from('variant_images')
          .insert({
            product_id: productId,
            attribute_value_id: attributeValueId,
            image_url: imageUrl
          });

        if (error) throw error;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to save attribute image:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { attributeValueId } = req.body;

      const { error } = await supabaseAdmin
        .from('variant_images')
        .delete()
        .eq('product_id', productId)
        .eq('attribute_value_id', attributeValueId);

      if (error) throw error;

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to delete attribute image:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
