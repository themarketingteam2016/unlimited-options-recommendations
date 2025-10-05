import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('attributes')
        .select(`
          *,
          attribute_values (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      res.status(200).json(data);
    } catch (error) {
      console.error('Failed to fetch attribute:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { name, isPrimary } = req.body;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // If setting as primary, unset other primary attributes
      if (isPrimary) {
        await supabaseAdmin
          .from('attributes')
          .update({ is_primary: false })
          .eq('is_primary', true)
          .neq('id', id);
      }

      const { data, error } = await supabaseAdmin
        .from('attributes')
        .update({ name, slug, is_primary: isPrimary || false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json(data);
    } catch (error) {
      console.error('Failed to update attribute:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { error } = await supabaseAdmin
        .from('attributes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to delete attribute:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
