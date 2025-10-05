import shopify from '../../../web/shopify.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const session = res.locals?.shopify?.session;
      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const client = new shopify.api.clients.Graphql({ session });

      const response = await client.request(`
        query getProducts {
          products(first: 50) {
            edges {
              node {
                id
                title
                handle
                status
                featuredImage {
                  url
                }
                variants(first: 10) {
                  edges {
                    node {
                      id
                      title
                      price
                    }
                  }
                }
              }
            }
          }
        }
      `);

      res.status(200).json(response.data.products.edges.map(edge => edge.node));
    } catch (error) {
      console.error('Failed to fetch products:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    // Handle product creation if needed
    res.status(405).json({ error: 'Method not allowed' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
