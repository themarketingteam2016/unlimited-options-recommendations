/**
 * Simplified authentication middleware for custom apps (single store)
 * No OAuth needed - just uses Admin API access token from environment
 */

/**
 * Create Shopify GraphQL client
 */
function createShopifyClient(shop, accessToken) {
  const makeRequest = async (query, variables = {}) => {
    const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // Return just the data for .graphql() method
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  };

  return {
    // For Draft Orders API (create-checkout.js)
    request: async (query, { variables } = {}) => {
      const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken
        },
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    },
    // For products API (index.js)
    graphql: async (query, variables) => {
      return await makeRequest(query, variables);
    }
  };
}

/**
 * Authentication middleware for Next.js API routes
 * Uses static credentials from environment variables (custom app)
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
      const shop = process.env.SHOPIFY_SHOP_DOMAIN;
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

      if (!shop || !accessToken) {
        console.error('[Auth Middleware] Missing environment variables');
        return res.status(500).json({
          error: 'Configuration error',
          message: 'SHOPIFY_SHOP_DOMAIN or SHOPIFY_ACCESS_TOKEN not configured',
        });
      }

      // Create Shopify client
      const shopifyClient = createShopifyClient(shop, accessToken);

      // Attach session to request object
      req.session = {
        shop,
        accessToken,
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
 * For custom apps, just passes through
 */
export function withAppProxy(handler) {
  return async (req, res) => {
    try {
      const shop = process.env.SHOPIFY_SHOP_DOMAIN;
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

      if (shop && accessToken) {
        const shopifyClient = createShopifyClient(shop, accessToken);
        req.session = {
          shop,
          accessToken,
          shopifyClient,
        };
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

      const shop = process.env.SHOPIFY_SHOP_DOMAIN;
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

      console.log('[Optional Auth Middleware] Shop:', shop);

      if (shop && accessToken) {
        try {
          // Create Shopify client
          const shopifyClient = createShopifyClient(shop, accessToken);

          // Attach session to request object
          req.session = {
            shop,
            accessToken,
            shopifyClient,
          };
          console.log('[Optional Auth Middleware] Session attached');
        } catch (error) {
          console.error('[Optional Auth Middleware] Error creating client:', {
            message: error.message,
            stack: error.stack
          });
          // Continue without session
        }
      } else {
        console.log('[Optional Auth Middleware] Missing credentials, continuing without auth');
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
