import { supabaseAdmin } from '../../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('product_recommendations')
        .select(`
          *,
          recommended_product:products!product_recommendations_recommended_product_id_fkey (
            id,
            title,
            image_url,
            shopify_product_id
          )
        `)
        .eq('product_id', id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      res.status(200).json(data || []);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { recommendedProductIds } = req.body;

      // Delete existing recommendations
      await supabaseAdmin
        .from('product_recommendations')
        .delete()
        .eq('product_id', id);

      // Insert new recommendations
      if (recommendedProductIds && recommendedProductIds.length > 0) {
        const inserts = recommendedProductIds.map((recId, index) => ({
          product_id: id,
          recommended_product_id: recId,
          display_order: index
        }));

        const { error } = await supabaseAdmin
          .from('product_recommendations')
          .insert(inserts);

        if (error) throw error;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to update recommendations:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
