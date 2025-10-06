import { supabaseAdmin } from '../../../../lib/supabase';
import { handleCors } from '../../../../lib/cors';

async function recommendationsHandler(req, res) {
  const { id: shopifyProductId } = req.query;

  if (!shopifyProductId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Fetch recommendations
    const { data, error } = await supabaseAdmin
      .from('recommendations')
      .select(`
        *,
        recommended_product:products!recommendations_recommended_product_id_fkey (
          shopify_product_id,
          title,
          image_url,
          featuredImage:featured_image
        )
      `)
      .eq('product_id', product.id)
      .limit(2);

    if (error) throw error;

    // Fetch basic product info for recommendations from the products API
    const recommendedProducts = await Promise.all(
      (data || []).map(async (rec) => {
        const shopifyId = rec.recommended_product?.shopify_product_id;
        if (!shopifyId) return null;

        // Fetch from our products API to get full details
        try {
          const productsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/products`);
          const products = await productsRes.json();
          const fullProduct = products.find(p => p.id === shopifyId);

          if (fullProduct) {
            return {
              ...rec,
              recommended_product: {
                ...rec.recommended_product,
                ...fullProduct
              }
            };
          }
          return rec;
        } catch (err) {
          console.error('Error fetching product details:', err);
          return rec;
        }
      })
    );

    res.status(200).json(recommendedProducts.filter(p => p !== null));
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    res.status(500).json({ error: error.message });
  }
}

export default function handler(req, res) {
  return handleCors(req, res, recommendationsHandler);
}
