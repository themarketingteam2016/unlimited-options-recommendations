import { supabaseAdmin } from '../../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { value, imageUrl } = req.body;
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const updateData = {
        value,
        slug,
        image_url: imageUrl || null
      };

      const { data, error } = await supabaseAdmin
        .from('attribute_values')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json(data);
    } catch (error) {
      console.error('Failed to update attribute value:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { error } = await supabaseAdmin
        .from('attribute_values')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to delete attribute value:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
