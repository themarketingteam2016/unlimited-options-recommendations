/**
 * CORS Middleware for API Routes
 * Allows requests from Shopify storefronts
 */

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins (or specify Shopify domain)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}

export function handleCors(req, res, handler) {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Continue to handler
  return handler(req, res);
}
