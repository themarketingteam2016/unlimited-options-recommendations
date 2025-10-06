import { supabaseAdmin } from '../../../lib/supabase';
import { handleCors } from '../../../lib/cors';

async function createRecommendationHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productId, recommendedProductId, displayOrder = 0 } = req.body;

    if (!productId || !recommendedProductId) {
      return res.status(400).json({
        error: 'productId and recommendedProductId are required'
      });
    }

    // Get internal product IDs
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_product_id', productId)
      .single();

    const { data: recommendedProduct } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_product_id', recommendedProductId)
      .single();

    if (!product || !recommendedProduct) {
      return res.status(404).json({ error: 'One or both products not found' });
    }

    // Create recommendation
    const { data, error } = await supabaseAdmin
      .from('product_recommendations')
      .insert({
        product_id: product.id,
        recommended_product_id: recommendedProduct.id,
        display_order: displayOrder
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Recommendation already exists' });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Failed to create recommendation:', error);
    res.status(500).json({ error: error.message });
  }
}

export default function handler(req, res) {
  return handleCors(req, res, createRecommendationHandler);
}
