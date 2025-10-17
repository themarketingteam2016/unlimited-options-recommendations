import { supabaseAdmin } from '../../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('attribute_values')
        .select('*')
        .eq('attribute_id', id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      res.status(200).json(data || []);
    } catch (error) {
      console.error('Failed to fetch attribute values:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { value, imageUrl, isDefault } = req.body;
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // If setting as default, first unset any existing default for this attribute
      if (isDefault) {
        await supabaseAdmin
          .from('attribute_values')
          .update({ is_default: false })
          .eq('attribute_id', id)
          .eq('is_default', true);
      }

      const { data, error } = await supabaseAdmin
        .from('attribute_values')
        .insert([{
          attribute_id: id,
          value,
          slug,
          image_url: imageUrl || null,
          is_default: isDefault || false
        }])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json(data);
    } catch (error) {
      console.error('Failed to create attribute value:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
