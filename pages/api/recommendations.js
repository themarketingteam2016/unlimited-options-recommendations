import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req, res) {
  const { productId: shopifyProductId } = req.query;

  if (!shopifyProductId) {
    return res.status(400).json({ error: 'productId query parameter is required' });
  }

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
        .eq('product_id', product.id)
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

      // Get internal product ID from shopify_product_id
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('shopify_product_id', shopifyProductId)
        .single();

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Get internal IDs for recommended products
      const { data: recommendedProducts } = await supabaseAdmin
        .from('products')
        .select('id, shopify_product_id')
        .in('shopify_product_id', recommendedProductIds);

      // Delete existing recommendations
      await supabaseAdmin
        .from('product_recommendations')
        .delete()
        .eq('product_id', product.id);

      // Insert new recommendations
      if (recommendedProducts && recommendedProducts.length > 0) {
        const inserts = recommendedProducts.map((recProd, index) => ({
          product_id: product.id,
          recommended_product_id: recProd.id,
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
