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

    // Get limit from query params (default to 5)
    const limit = parseInt(req.query.limit) || 5;

    // Fetch recent orders from Shopify
    const response = await fetch(`https://${shopDomain}/admin/api/2024-01/orders.json?limit=${limit}&status=any`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();

    // Format orders for dashboard
    const formattedOrders = (data.orders || []).map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      name: order.name,
      customerName: order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : 'Guest',
      totalPrice: order.total_price,
      currency: order.currency,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      createdAt: order.created_at,
      itemCount: order.line_items?.length || 0
    }));

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ error: error.message, orders: [] });
  }
}
