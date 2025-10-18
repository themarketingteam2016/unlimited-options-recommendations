import { generateAuthUrl, isValidShopDomain, SHOPIFY_CONFIG } from '../../../lib/shopify-auth';

/**
 * OAuth Initialization Endpoint
 * Handles the initial OAuth request from Shopify
 */
export default async function handler(req, res) {
  try {
    const { shop } = req.query;

    console.log('[OAuth Init] Request received for shop:', shop);

    // Validate shop parameter
    if (!shop) {
      return res.status(400).json({
        error: 'Missing shop parameter',
        message: 'Please provide a shop parameter (e.g., ?shop=mystore.myshopify.com)',
      });
    }

    // Validate shop domain format
    if (!isValidShopDomain(shop)) {
      return res.status(400).json({
        error: 'Invalid shop domain',
        message: 'Shop must be a valid myshopify.com domain',
      });
    }

    // Generate OAuth authorization URL
    const redirectUri = `${SHOPIFY_CONFIG.host}/api/auth/callback`;
    const { authUrl, nonce } = generateAuthUrl(shop, redirectUri);

    console.log('[OAuth Init] Generated auth URL');
    console.log('[OAuth Init] Redirect URI:', redirectUri);
    console.log('[OAuth Init] Scopes:', SHOPIFY_CONFIG.scopes);

    // Store nonce in cookie for verification in callback
    res.setHeader('Set-Cookie', [
      `shopify_nonce=${nonce}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300`,
      `shopify_shop=${shop}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300`,
    ]);

    // Redirect to Shopify authorization page
    res.redirect(authUrl);
  } catch (error) {
    console.error('[OAuth Init] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
