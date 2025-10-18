# API Routes Migration Guide

## Overview

This guide explains how to update your remaining API routes to use the new OAuth authentication system.

## Routes Already Updated

✅ `/api/products/index.js` - Uses `withAuth()`
✅ `/api/variants/save.js` - Uses `withAuth()` with direct Shopify client
✅ `/api/variants/create.js` - Uses `withOptionalAuth()`
✅ `/api/options/create.js` - Uses `withAuth()`
✅ `/api/cart/add-variant.js` - Uses `withOptionalAuth()` + CORS

## Routes That Need Update

The following routes still need to be migrated:

### Admin Routes (Require Authentication)

Use `withAuth()` for these routes:

1. **`/api/variants/sync-to-shopify.js`** - Syncing variants to Shopify
2. **`/api/variants/update-options.js`** - Updating variant options
3. **`/api/variants/generate.js`** - Generating variant combinations
4. **`/api/variants/index.js`** - Listing variants
5. **`/api/variants/[productId].js`** - Get variants by product
6. **`/api/products/sync.js`** - Syncing products
7. **`/api/products/update.js`** - Updating products
8. **`/api/products/[id]/variants.js`** - Product variant details
9. **`/api/products/[id]/recommendations.js`** - Product recommendations
10. **`/api/recommendations.js`** - General recommendations
11. **`/api/recommendations/create.js`** - Creating recommendations
12. **`/api/attributes/index.js`** - Listing attributes
13. **`/api/attributes/[id].js`** - Attribute details
14. **`/api/attributes/[id]/values.js`** - Attribute values
15. **`/api/attributes/values/[id].js`** - Specific attribute value
16. **`/api/attribute-images.js`** - Attribute images
17. **`/api/upload.js`** - File uploads

### Utility Routes (Optional Auth)

Use `withOptionalAuth()` for these:

1. **`/api/options/[productId].js`** - Get product options
2. **`/api/options/generate-combinations.js`** - Generate combinations

### Database/Migration Routes (Keep as-is or remove in production)

These routes should be protected or removed in production:

1. **`/api/setup-database.js`** - ⚠️ Remove or protect
2. **`/api/check-database.js`** - ⚠️ Remove or protect
3. **`/api/db/init.js`** - ⚠️ Remove or protect
4. **`/api/run-migration.js`** - ⚠️ Remove or protect
5. **`/api/migrations/add-variant-id.js`** - ⚠️ Remove or protect
6. **`/api/debug-products.js`** - ⚠️ Remove in production

### Webhook Routes (Special Handling)

Webhooks need HMAC verification, not OAuth:

1. **`/api/webhooks/orders-create.js`** - Needs webhook HMAC verification

## Migration Pattern

### Pattern 1: Simple Admin Route

**Before:**
```javascript
export default async function handler(req, res) {
  // Your code
}
```

**After:**
```javascript
import { withAuth } from '../../../lib/auth-middleware';

async function handler(req, res) {
  const { shop, shopifyClient } = req.session;

  // Use shopifyClient instead of hardcoded shop
  const data = await shopifyClient.graphql('...');

  res.json(data);
}

export default withAuth(handler);
```

### Pattern 2: Route with CORS (Storefront)

**Before:**
```javascript
import { handleCors } from '../../../lib/cors';

async function myHandler(req, res) {
  // Your code
}

export default function handler(req, res) {
  return handleCors(req, res, myHandler);
}
```

**After:**
```javascript
import { withOptionalAuth } from '../../../lib/auth-middleware';
import { handleCors } from '../../../lib/cors';

async function myHandler(req, res) {
  // Session may or may not be available
  const { shop, shopifyClient } = req.session || {};

  // Your code
}

const authHandler = withOptionalAuth(myHandler);

export default function handler(req, res) {
  return handleCors(req, res, authHandler);
}
```

### Pattern 3: Webhook Route

Webhooks need special handling:

```javascript
import crypto from 'crypto';

export default async function handler(req, res) {
  // Verify webhook HMAC
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const body = JSON.stringify(req.body);

  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  if (hash !== hmac) {
    return res.status(403).json({ error: 'Invalid webhook signature' });
  }

  // Process webhook
  const { shop, ...data } = req.body;

  // Get session for this shop if needed
  const { getSession } = await import('../../../lib/shopify-auth');
  const session = await getSession(shop);

  // Handle webhook...

  res.status(200).json({ success: true });
}
```

## Accessing Shopify API

### Old Way (Hardcoded - INSECURE):
```javascript
import { shopifyAdmin } from '../../../lib/shopify-client';

// This uses hardcoded shop domain!
const data = await shopifyAdmin.request(query);
```

### New Way (Session-based - SECURE):
```javascript
async function handler(req, res) {
  const { shopifyClient } = req.session;

  // GraphQL
  const data = await shopifyClient.graphql(query, variables);

  // REST API
  const products = await shopifyClient.rest('products.json');

  res.json(data);
}

export default withAuth(handler);
```

## Testing Updated Routes

### 1. Get a Valid Session

First, install the app:
```
http://localhost:3000/api/auth?shop=your-dev-store.myshopify.com
```

### 2. Test Admin Routes

Include the shop parameter:
```bash
curl "http://localhost:3000/api/products?shop=your-dev-store.myshopify.com"
```

Or if you have the session cookie set:
```bash
curl -H "Cookie: shopify_session=your-dev-store.myshopify.com" \
  "http://localhost:3000/api/products"
```

### 3. Test Storefront Routes

Storefront routes don't need auth:
```bash
curl -X POST "http://localhost:3000/api/cart/add-variant" \
  -H "Content-Type: application/json" \
  -d '{"variantId": 123, "quantity": 1}'
```

## Common Issues

### "No shop parameter or session"
**Solution**: Pass `?shop=yourstore.myshopify.com` or ensure cookie is set

### "No valid session found"
**Solution**: Reinstall the app via `/api/auth`

### "SHOPIFY_API_SECRET is undefined"
**Solution**: Check `.env.local` file has all required variables

### Route still using hardcoded shop
**Solution**: Use `req.session.shop` instead of hardcoded domain

## Batch Update Script

To quickly find routes that need updating:

```bash
# Find routes without withAuth
grep -r "export default async function handler" pages/api/ | \
  grep -v "withAuth" | \
  grep -v "auth/"
```

## Priority Order

1. **High Priority** (User-facing admin features):
   - Product sync and update routes
   - Variant management routes
   - Recommendations routes

2. **Medium Priority** (Internal features):
   - Attribute management
   - Upload functionality

3. **Low Priority** (Can be removed):
   - Debug routes
   - Database setup routes

## Next Steps

1. Update routes one by one following the patterns above
2. Test each route after updating
3. Remove/protect database utility routes before production
4. Implement webhook HMAC verification
5. Update CORS policy to restrict origins

## Need Help?

Refer to these files for examples:
- `/pages/api/products/index.js` - Basic withAuth usage
- `/pages/api/variants/save.js` - Complex logic with Shopify client
- `/pages/api/cart/add-variant.js` - Optional auth + CORS
- `/lib/auth-middleware.js` - Middleware documentation
