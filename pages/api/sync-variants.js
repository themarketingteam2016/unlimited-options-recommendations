import { bulkSyncVariantsToShopify } from '../../lib/shopify-variants';
import { handleCors } from '../../lib/cors';

async function syncVariantsHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    console.log('[sync-variants] Starting sync for product:', productId);

    const result = await bulkSyncVariantsToShopify(productId);

    console.log('[sync-variants] Sync completed:', result);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[sync-variants] Error:', error);
    res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
}

export default function handler(req, res) {
  return handleCors(req, res, syncVariantsHandler);
}
