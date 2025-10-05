import { supabaseAdmin } from '../../../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  // Handle catch-all route - id will be an array
  // If single element, it's fully encoded - decode it
  // If multiple elements, join them (backward compatibility)
  const shopifyProductId = Array.isArray(id)
    ? (id.length === 1 ? decodeURIComponent(id[0]) : id.join('/'))
    : id;

  if (req.method === 'GET') {
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

      const { data, error } = await supabaseAdmin
        .from('variants')
        .select(`
          *,
          variant_options (
            id,
            attribute:attributes (
              id,
              name
            ),
            attribute_value:attribute_values (
              id,
              value,
              image_url
            )
          )
        `)
        .eq('product_id', product.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      res.status(200).json(data || []);
    } catch (error) {
      console.error('Failed to fetch variants:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { variants } = req.body;

      for (const variant of variants) {
        const { error } = await supabaseAdmin
          .from('variants')
          .update({
            price: variant.price,
            compare_at_price: variant.compare_at_price,
            cost: variant.cost,
            sku: variant.sku,
            stock_quantity: variant.stock_quantity,
            is_active: variant.is_active
          })
          .eq('id', variant.id);

        if (error) throw error;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to update variants:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { variantIds } = req.body;

      const { error } = await supabaseAdmin
        .from('variants')
        .delete()
        .in('id', variantIds);

      if (error) throw error;

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to delete variants:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
