import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Shopify OAuth configuration
export const SHOPIFY_CONFIG = {
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecret: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES || 'read_products,write_products,read_inventory,write_inventory,read_orders,write_cart_transforms',
  host: process.env.HOST,
  apiVersion: '2024-01',
};

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(shop, redirectUri) {
  const nonce = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: SHOPIFY_CONFIG.apiKey,
    scope: SHOPIFY_CONFIG.scopes,
    redirect_uri: redirectUri,
    state: nonce,
  });

  return {
    authUrl: `https://${shop}/admin/oauth/authorize?${params.toString()}`,
    nonce,
  };
}

/**
 * Verify HMAC signature from Shopify
 */
export function verifyHmac(query) {
  const { hmac, ...params } = query;

  if (!hmac) {
    return false;
  }

  // Sort and create message
  const message = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  // Generate HMAC
  const generatedHash = crypto
    .createHmac('sha256', SHOPIFY_CONFIG.apiSecret)
    .update(message)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(generatedHash)
  );
}

/**
 * Exchange authorization code for access token
 */
export async function getAccessToken(shop, code) {
  const url = `https://${shop}/admin/oauth/access_token`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: SHOPIFY_CONFIG.apiKey,
      client_secret: SHOPIFY_CONFIG.apiSecret,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Store session in Supabase
 */
export async function storeSession(shop, accessToken, scopes) {
  const { data, error } = await supabase
    .from('shopify_sessions')
    .upsert({
      shop,
      access_token: accessToken,
      scopes: scopes,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'shop'
    })
    .select();

  if (error) {
    console.error('Failed to store session:', error);
    throw new Error('Failed to store session');
  }

  return data[0];
}

/**
 * Get session from Supabase
 */
export async function getSession(shop) {
  const { data, error } = await supabase
    .from('shopify_sessions')
    .select('*')
    .eq('shop', shop)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No session found
      return null;
    }
    console.error('Failed to get session:', error);
    throw new Error('Failed to get session');
  }

  return data;
}

/**
 * Delete session from Supabase
 */
export async function deleteSession(shop) {
  const { error } = await supabase
    .from('shopify_sessions')
    .delete()
    .eq('shop', shop);

  if (error) {
    console.error('Failed to delete session:', error);
    throw new Error('Failed to delete session');
  }
}

/**
 * Validate shop domain
 */
export function isValidShopDomain(shop) {
  if (!shop) return false;

  const shopPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
  return shopPattern.test(shop);
}

/**
 * Create Shopify API client with session
 */
export function createShopifyClient(shop, accessToken) {
  return {
    async graphql(query, variables = {}) {
      const response = await fetch(
        `https://${shop}/admin/api/${SHOPIFY_CONFIG.apiVersion}/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify({ query, variables }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data;
    },

    async rest(endpoint, options = {}) {
      const response = await fetch(
        `https://${shop}/admin/api/${SHOPIFY_CONFIG.apiVersion}/${endpoint}`,
        {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
            ...options.headers,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify REST API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    },
  };
}

/**
 * Verify app proxy request
 */
export function verifyAppProxyRequest(query) {
  const { signature, ...params } = query;

  if (!signature) {
    return false;
  }

  // Sort and create message
  const message = Object.keys(params)
    .sort()
    .map(key => `${key}=${Array.isArray(params[key]) ? params[key].join(',') : params[key]}`)
    .join('');

  // Generate HMAC
  const generatedHash = crypto
    .createHmac('sha256', SHOPIFY_CONFIG.apiSecret)
    .update(message)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(generatedHash)
  );
}
