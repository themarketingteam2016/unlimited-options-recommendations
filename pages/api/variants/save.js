import { saveVariantCombinations, saveVariantToMetafield } from '../../../web/options-controller.js';
import shopify from '../../../web/shopify.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productId, variants } = req.body;
    const session = res.locals?.shopify?.session;

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const shop = session.shop;

    await saveVariantCombinations(shop, productId, variants);
    await saveVariantToMetafield(shopify, session, productId, variants);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to save variants:', error);
    res.status(500).json({ error: error.message });
  }
}
