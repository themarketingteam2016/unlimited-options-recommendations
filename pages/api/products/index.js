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

      // Fetch additional data from Supabase (like is_ring, ring_sizes)
      const { data: supabaseProducts, error: supabaseError } = await supabaseAdmin
        .from('products')
        .select('id, shopify_product_id, is_ring, ring_sizes');

      if (supabaseError) {
        console.error('Error fetching from Supabase:', supabaseError);
      }

      // Merge Supabase data with Shopify products
      const enrichedProducts = shopifyProducts.map(shopifyProduct => {
        const supabaseProduct = supabaseProducts?.find(
          sp => sp.shopify_product_id === shopifyProduct.id
        );
        return {
          ...shopifyProduct,
          id: supabaseProduct?.id || shopifyProduct.id,
          is_ring: supabaseProduct?.is_ring || false,
          ring_sizes: supabaseProduct?.ring_sizes || null
        };
      });

      res.status(200).json(enrichedProducts);
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
