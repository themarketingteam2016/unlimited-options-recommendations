import { withAuth } from '../../../lib/auth-middleware';
import { supabaseAdmin } from '../../../lib/supabase';

async function productsHandler(req, res) {
  if (req.method === 'GET') {
    try {
      // Use the authenticated Shopify client from session
      const { shopifyClient } = req.session;

      // Fetch live products from Shopify using GraphQL
      const data = await shopifyClient.graphql(`
        query getProducts {
          products(first: 250) {
            edges {
              node {
                id
                title
                handle
                description
                status
                featuredImage {
                  url
                }
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      price
                      sku
                      inventoryQuantity
                    }
                  }
                }
              }
            }
          }
        }
      `);

      const shopifyProducts = data.products.edges.map(edge => edge.node);

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

// Export with authentication middleware
export default withAuth(productsHandler);
