import { supabaseAdmin } from '../../../../lib/supabase';

export default async function handler(req, res) {
  const { id: shopifyProductId } = req.query;

  if (!shopifyProductId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get internal product ID from shopify_product_id
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_product_id', shopifyProductId)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

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

    if (error) throw error;

    res.status(200).json(data || []);
  } catch (error) {
    console.error('Failed to fetch product variants:', error);
    res.status(500).json({ error: error.message });
  }
}
