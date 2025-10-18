import cookie from 'cookie';
import {
  verifyHmac,
  getAccessToken,
  storeSession,
  isValidShopDomain,
} from '../../../lib/shopify-auth';

/**
 * OAuth Callback Endpoint
 * Handles the callback from Shopify after merchant approves permissions
 */
export default async function handler(req, res) {
  try {
    const { shop, code, state, hmac } = req.query;

    console.log('[OAuth Callback] Request received');
    console.log('[OAuth Callback] Shop:', shop);
    console.log('[OAuth Callback] Has code:', !!code);
    console.log('[OAuth Callback] Has state:', !!state);

    // Parse cookies
    const cookies = cookie.parse(req.headers.cookie || '');
    const storedNonce = cookies.shopify_nonce;
    const storedShop = cookies.shopify_shop;

    // Validate required parameters
    if (!shop || !code || !state || !hmac) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'shop, code, state, and hmac are required',
      });
    }

    // Validate shop domain
    if (!isValidShopDomain(shop)) {
      return res.status(400).json({
        error: 'Invalid shop domain',
        message: 'Shop must be a valid myshopify.com domain',
      });
    }

    // Verify shop matches cookie
    if (shop !== storedShop) {
      console.error('[OAuth Callback] Shop mismatch:', { shop, storedShop });
      return res.status(403).json({
        error: 'Shop mismatch',
        message: 'Shop parameter does not match stored value',
      });
    }

    // Verify state/nonce
    if (state !== storedNonce) {
      console.error('[OAuth Callback] Nonce mismatch:', { state, storedNonce });
      return res.status(403).json({
        error: 'Invalid state parameter',
        message: 'State verification failed. Please try again.',
      });
    }

    // Verify HMAC signature
    if (!verifyHmac(req.query)) {
      console.error('[OAuth Callback] HMAC verification failed');
      return res.status(403).json({
        error: 'HMAC verification failed',
        message: 'Request signature is invalid',
      });
    }

    console.log('[OAuth Callback] All validations passed');

    // Exchange code for access token
    let accessToken;
    try {
      accessToken = await getAccessToken(shop, code);
      console.log('[OAuth Callback] Access token obtained');
    } catch (error) {
      console.error('[OAuth Callback] Failed to get access token:', error);
      return res.status(500).json({
        error: 'Failed to get access token',
        message: error.message,
      });
    }

    // Store session in database
    try {
      await storeSession(shop, accessToken, req.query.scope || process.env.SCOPES);
      console.log('[OAuth Callback] Session stored successfully');
    } catch (error) {
      console.error('[OAuth Callback] Failed to store session:', error);
      return res.status(500).json({
        error: 'Failed to store session',
        message: error.message,
      });
    }

    // Clear temporary cookies
    res.setHeader('Set-Cookie', [
      'shopify_nonce=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      'shopify_shop=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    ]);

    // Set session cookie
    res.setHeader('Set-Cookie', [
      `shopify_session=${shop}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`, // 30 days
    ]);

    console.log('[OAuth Callback] Installation successful for shop:', shop);

    // Redirect to app dashboard or success page
    return res.redirect(`/dashboard?shop=${shop}&installed=true`);
  } catch (error) {
    console.error('[OAuth Callback] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
