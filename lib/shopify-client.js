// Shopify Admin API client for fetching products
export async function fetchShopifyProducts() {
  const shop = 'unlimited-options-recommendations.myshopify.com';
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_API_SECRET;

  const query = `
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
  `;

  try {
    const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data.products.edges.map(edge => edge.node);
  } catch (error) {
    console.error('Failed to fetch Shopify products:', error);
    throw error;
  }
}

// Alternative: Fetch using REST API
export async function fetchShopifyProductsREST() {
  const shop = 'unlimited-options-recommendations.myshopify.com';
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_API_SECRET;

  try {
    const response = await fetch(`https://${shop}/admin/api/2024-01/products.json?limit=250`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to match GraphQL format
    return data.products.map(product => ({
      id: `gid://shopify/Product/${product.id}`,
      title: product.title,
      handle: product.handle,
      description: product.body_html,
      status: product.status.toUpperCase(),
      featuredImage: product.image ? { url: product.image.src } : null,
      variants: product.variants.map(v => ({
        id: `gid://shopify/ProductVariant/${v.id}`,
        title: v.title,
        price: v.price,
        sku: v.sku,
        inventoryQuantity: v.inventory_quantity,
      })),
    }));
  } catch (error) {
    console.error('Failed to fetch Shopify products (REST):', error);
    throw error;
  }
}
