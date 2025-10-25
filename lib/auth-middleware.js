import { getSession, createShopifyClient } from './shopify-auth';

// Simple cookie parser function to avoid dependency issues
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};

  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    const value = parts.slice(1).join('=').trim();
    if (name) {
      cookies[name] = value;
    }
  });
  return cookies;
}

/**
 * Authentication middleware for Next.js API routes
 * Verifies that the request has a valid Shopify session
 *
 * Usage:
 * import { withAuth } from '../../../lib/auth-middleware';
 *
 * async function handler(req, res) {
 *   // Access session data via req.session
 *   const { shop, accessToken, shopifyClient } = req.session;
 *   // Your code here
 * }
 *
 * export default withAuth(handler);
 */
export function withAuth(handler) {
  return async (req, res) => {
    try {
      // Get shop from query parameter or cookie
      let shop = req.query.shop;

      if (!shop) {
        // Try to get from cookie
        const cookies = parseCookies(req.headers.cookie);
        shop = cookies.shopify_session;
      }

      if (!shop) {
        console.error('[Auth Middleware] No shop parameter or session cookie');
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing shop parameter or session',
          authUrl: `/api/auth?shop=${req.query.shop || ''}`,
        });
      }

      // Get session from database
      const session = await getSession(shop);

      if (!session || !session.access_token) {
        console.error('[Auth Middleware] No valid session found for shop:', shop);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'No valid session found. Please reinstall the app.',
          authUrl: `/api/auth?shop=${shop}`,
        });
      }

      // Create Shopify client
      const shopifyClient = createShopifyClient(shop, session.access_token);

      // Attach session to request object
      req.session = {
        shop: session.shop,
        accessToken: session.access_token,
        scopes: session.scopes,
        shopifyClient,
      };

      // Call the original handler
      return await handler(req, res);
    } catch (error) {
      console.error('[Auth Middleware] Error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  };
}

/**
 * Middleware for app proxy requests
 * Verifies HMAC signature from Shopify app proxy
 */
export function withAppProxy(handler) {
  return async (req, res) => {
    try {
      const { signature } = req.query;

      if (!signature) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing signature parameter',
        });
      }

      // Verify app proxy signature
      const { verifyAppProxyRequest } = await import('./shopify-auth');
      if (!verifyAppProxyRequest(req.query)) {
        console.error('[App Proxy Middleware] Signature verification failed');
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid signature',
        });
      }

      // Extract shop from logged_in_customer_id or shop parameter
      const shop = req.query.shop;

      if (shop) {
        // Get session if shop is available
        const session = await getSession(shop);

        if (session) {
          const shopifyClient = createShopifyClient(shop, session.access_token);
          req.session = {
            shop: session.shop,
            accessToken: session.access_token,
            scopes: session.scopes,
            shopifyClient,
          };
        }
      }

      // Call the original handler
      return await handler(req, res);
    } catch (error) {
      console.error('[App Proxy Middleware] Error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  };
}

/**
 * Optional authentication middleware
 * Does not require authentication but adds session if available
 */
export function withOptionalAuth(handler) {
  return async (req, res) => {
    try {
      console.log('[Optional Auth Middleware] Started');
      // Get shop from query parameter or cookie
      let shop = req.query.shop;

      if (!shop) {
        // Try to get from cookie
        const cookies = parseCookies(req.headers.cookie);
        shop = cookies.shopify_session;
      }

      console.log('[Optional Auth Middleware] Shop:', shop);

      if (shop) {
        try {
          // Get session from database
          console.log('[Optional Auth Middleware] Getting session for shop:', shop);
          const session = await getSession(shop);

          if (session && session.access_token) {
            // Create Shopify client
            const shopifyClient = createShopifyClient(shop, session.access_token);

            // Attach session to request object
            req.session = {
              shop: session.shop,
              accessToken: session.access_token,
              scopes: session.scopes,
              shopifyClient,
            };
            console.log('[Optional Auth Middleware] Session attached');
          } else {
            console.log('[Optional Auth Middleware] No session found or no access token');
          }
        } catch (error) {
          console.error('[Optional Auth Middleware] Error getting session:', {
            message: error.message,
            stack: error.stack
          });
          // Continue without session
        }
      } else {
        console.log('[Optional Auth Middleware] No shop parameter, continuing without auth');
      }

      // Call the original handler
      console.log('[Optional Auth Middleware] Calling original handler');
      return await handler(req, res);
    } catch (error) {
      console.error('[Optional Auth Middleware] Unexpected error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };
}
