import { supabaseAdmin } from '../../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { value, imageUrl, isDefault } = req.body;
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Get the attribute_id first
      const { data: existingValue } = await supabaseAdmin
        .from('attribute_values')
        .select('attribute_id')
        .eq('id', id)
        .single();

      // If setting as default, first unset any existing default for this attribute
      if (isDefault && existingValue) {
        await supabaseAdmin
          .from('attribute_values')
          .update({ is_default: false })
          .eq('attribute_id', existingValue.attribute_id)
          .eq('is_default', true)
          .neq('id', id);
      }

      const updateData = {
        value,
        slug,
        image_url: imageUrl || null
      };

      // Only update is_default if it's explicitly provided
      if (typeof isDefault !== 'undefined') {
        updateData.is_default = isDefault;
      }

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
