// Demo data for testing without Shopify authentication
const DEMO_PRODUCTS = [
  {
    id: 'gid://shopify/Product/1',
    title: 'Demo T-Shirt',
    handle: 'demo-t-shirt',
    status: 'ACTIVE',
    featuredImage: {
      url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png'
    },
    variants: [
      { id: 'gid://shopify/ProductVariant/1', title: 'Small', price: '19.99' }
    ]
  },
  {
    id: 'gid://shopify/Product/2',
    title: 'Demo Hoodie',
    handle: 'demo-hoodie',
    status: 'ACTIVE',
    featuredImage: {
      url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png'
    },
    variants: [
      { id: 'gid://shopify/ProductVariant/2', title: 'Medium', price: '49.99' }
    ]
  }
];

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Return demo products for now
      // TODO: Implement Shopify OAuth authentication for production
      res.status(200).json(DEMO_PRODUCTS);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
