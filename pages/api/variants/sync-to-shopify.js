import { withAuth } from '../../../lib/auth-middleware';
import { bulkSyncVariantsToShopify } from '../../../lib/shopify-variants';

async function syncToShopifyHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    console.log('Syncing variants to Shopify for product:', productId);

    const result = await bulkSyncVariantsToShopify(productId);

    res.status(200).json({
      success: true,
      ...result,
      message: `Synced ${result.synced} of ${result.total} variants to Shopify`
    });
  } catch (error) {
    console.error('Sync to Shopify error:', error);
    res.status(500).json({ error: error.message });
  }
}

export default withAuth(syncToShopifyHandler);
