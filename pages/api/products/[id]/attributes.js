import { supabaseAdmin } from '../../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('product_attributes')
        .select(`
          *,
          attribute:attributes (
            *,
            attribute_values (*)
          )
        `)
        .eq('product_id', id);

      if (error) throw error;

      res.status(200).json(data || []);
    } catch (error) {
      console.error('Failed to fetch product attributes:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { attributeIds } = req.body;

      // Delete existing product attributes
      await supabaseAdmin
        .from('product_attributes')
        .delete()
        .eq('product_id', id);

      // Insert new product attributes
      if (attributeIds && attributeIds.length > 0) {
        const inserts = attributeIds.map(attrId => ({
          product_id: id,
          attribute_id: attrId
        }));

        const { error } = await supabaseAdmin
          .from('product_attributes')
          .insert(inserts);

        if (error) throw error;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to update product attributes:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
