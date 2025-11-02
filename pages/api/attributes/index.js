import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('attributes')
        .select(`
          id,
          name,
          slug,
          is_primary,
          display_order,
          created_at,
          updated_at,
          attribute_values (
            id,
            value,
            slug,
            image_url,
            display_order
          )
        `)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Supabase error fetching attributes:', error);
        throw error;
      }

      console.log('Attributes API returning:', JSON.stringify(data, null, 2));
      res.status(200).json(data || []);
    } catch (error) {
      console.error('Failed to fetch attributes:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, isPrimary } = req.body;

      // Create slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // If setting as primary, unset other primary attributes
      if (isPrimary) {
        await supabaseAdmin
          .from('attributes')
          .update({ is_primary: false })
          .eq('is_primary', true);
      }

      const { data, error } = await supabaseAdmin
        .from('attributes')
        .insert([{ name, slug, is_primary: isPrimary || false }])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json(data);
    } catch (error) {
      console.error('Failed to create attribute:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
