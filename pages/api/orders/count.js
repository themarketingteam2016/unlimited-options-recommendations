export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || 'joseph-asher.myshopify.com';
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(500).json({ error: 'Shopify access token not configured' });
    }

    // Fetch orders count from Shopify
    const response = await fetch(`https://${shopDomain}/admin/api/2024-01/orders/count.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();

    res.status(200).json({ count: data.count || 0 });
  } catch (error) {
    console.error('Error fetching orders count:', error);
    res.status(500).json({ error: error.message, count: 0 });
  }
}
