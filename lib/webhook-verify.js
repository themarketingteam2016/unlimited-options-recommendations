import crypto from 'crypto';

/**
 * Verify Shopify webhook HMAC signature
 * @param {Object} req - Next.js request object
 * @param {string} secret - Shopify API secret
 * @returns {boolean} - True if signature is valid
 */
export function verifyWebhookHmac(req, secret) {
  const hmac = req.headers['x-shopify-hmac-sha256'];

  if (!hmac) {
    console.error('[Webhook Verify] No HMAC header found');
    return false;
  }

  // Get raw body (must be raw, not parsed)
  const body = req.body;
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body);

  // Generate HMAC
  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  // Compare
  const isValid = crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(hash)
  );

  if (!isValid) {
    console.error('[Webhook Verify] HMAC verification failed');
  }

  return isValid;
}

/**
 * Middleware to verify webhook and extract shop
 */
export function withWebhookVerification(handler) {
  return async (req, res) => {
    try {
      // Verify HMAC
      const isValid = verifyWebhookHmac(req, process.env.SHOPIFY_API_SECRET);

      if (!isValid) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Webhook signature verification failed'
        });
      }

      // Extract shop from body or headers
      const shop = req.body?.shop_domain || req.headers['x-shopify-shop-domain'];

      if (!shop) {
        console.warn('[Webhook] No shop domain found in webhook');
      }

      // Attach shop to request
      req.webhookShop = shop;

      // Call handler
      return await handler(req, res);
    } catch (error) {
      console.error('[Webhook Verification] Error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  };
}

/**
 * Configure Next.js API route to accept raw body for webhooks
 * Add this to your webhook route files:
 *
 * export const config = {
 *   api: {
 *     bodyParser: false,
 *   },
 * };
 */
export async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', reject);
  });
}
