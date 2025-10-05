import { getVariantCombinations } from '../../../web/options-controller.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productId } = req.query;
    const session = res.locals?.shopify?.session;

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const shop = session.shop;
    const variants = await getVariantCombinations(shop, productId);
    res.status(200).json(variants);
  } catch (error) {
    console.error('Failed to get variants:', error);
    res.status(500).json({ error: error.message });
  }
}
