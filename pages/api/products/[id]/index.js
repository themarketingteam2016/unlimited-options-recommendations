import { supabaseAdmin } from '../../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PATCH') {
    try {
      const { is_ring } = req.body;

      const updateData = {};
      if (typeof is_ring !== 'undefined') {
        updateData.is_ring = is_ring;
      }

      const { data, error } = await supabaseAdmin
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json(data);
    } catch (error) {
      console.error('Failed to update product:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
