import { createProductOptions } from '../../../web/options-controller.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productId, options } = req.body;
    const session = res.locals?.shopify?.session;

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const shop = session.shop;
    await createProductOptions(shop, productId, options);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to create options:', error);
    res.status(500).json({ error: error.message });
  }
}
