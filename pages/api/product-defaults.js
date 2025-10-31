import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req, res) {
  const { productId } = req.query;

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    // Convert Shopify product ID to internal UUID
    const { data: productData, error: productError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_product_id', productId)
      .single();

    if (productError || !productData) {
      console.error('Error finding product:', productError);
      return res.status(404).json({ error: 'Product not found' });
    }

    const internalProductId = productData.id;

    if (req.method === 'GET') {
      // Get product-specific default values
      const { data, error } = await supabaseAdmin
        .from('product_attributes')
        .select(`
          attribute_id,
          default_value_id
        `)
        .eq('product_id', internalProductId);

      if (error) {
        console.error('Error fetching product defaults:', error);
        return res.status(500).json({ error: error.message });
      }

      // Convert to a map of attribute_id -> default_value_id
      const defaultsMap = {};
      data.forEach(item => {
        if (item.default_value_id) {
          defaultsMap[item.attribute_id] = item.default_value_id;
        }
      });

      return res.status(200).json(defaultsMap);

    } else if (req.method === 'POST') {
      // Save product-specific default values
      const { defaults } = req.body; // defaults is an object: { attributeId: valueId }

      if (!defaults || typeof defaults !== 'object') {
        return res.status(400).json({ error: 'Defaults object is required' });
      }

      // Update or insert product_attributes with default values
      const updates = [];
      for (const [attributeId, valueId] of Object.entries(defaults)) {
        updates.push({
          product_id: internalProductId,
          attribute_id: attributeId,
          default_value_id: valueId || null
        });
      }

      if (updates.length === 0) {
        return res.status(200).json({ message: 'No defaults to save' });
      }

      // Use upsert to update existing or insert new records
      const { data, error } = await supabaseAdmin
        .from('product_attributes')
        .upsert(updates, {
          onConflict: 'product_id,attribute_id',
          returning: 'minimal'
        });

      if (error) {
        console.error('Error saving product defaults:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ message: 'Defaults saved successfully' });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Product defaults API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
