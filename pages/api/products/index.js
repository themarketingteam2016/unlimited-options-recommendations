import { fetchShopifyProductsREST } from '../../../lib/shopify-client';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Fetch live products from Shopify
      const shopifyProducts = await fetchShopifyProductsREST();

      // Sync to Supabase
      for (const product of shopifyProducts) {
        await supabaseAdmin
          .from('products')
          .upsert({
            shopify_product_id: product.id,
            shopify_handle: product.handle,
            title: product.title,
            description: product.description || '',
            image_url: product.featuredImage?.url || null,
            status: product.status.toLowerCase()
          }, {
            onConflict: 'shopify_product_id'
          });
      }

      res.status(200).json(shopifyProducts);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
