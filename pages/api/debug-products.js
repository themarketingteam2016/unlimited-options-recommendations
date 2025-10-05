import { fetchShopifyProductsREST } from '../../lib/shopify-client';
import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req, res) {
  try {
    console.log('Fetching from Shopify...');

    // Try to fetch from Shopify
    let shopifyProducts = [];
    let shopifyError = null;

    try {
      shopifyProducts = await fetchShopifyProductsREST();
      console.log('Shopify products:', shopifyProducts.length);
    } catch (error) {
      shopifyError = error.message;
      console.error('Shopify fetch error:', error);
    }

    // Check Supabase products
    const { data: supabaseProducts, error: supabaseError } = await supabaseAdmin
      .from('products')
      .select('*');

    console.log('Supabase products:', supabaseProducts?.length || 0);

    res.status(200).json({
      shopify: {
        count: shopifyProducts.length,
        error: shopifyError,
        sample: shopifyProducts[0] || null
      },
      supabase: {
        count: supabaseProducts?.length || 0,
        error: supabaseError?.message || null,
        sample: supabaseProducts?.[0] || null
      },
      env: {
        hasAccessToken: !!process.env.SHOPIFY_ACCESS_TOKEN,
        hasApiKey: !!process.env.SHOPIFY_API_KEY,
        hasApiSecret: !!process.env.SHOPIFY_API_SECRET
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}
