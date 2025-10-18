# OAuth Implementation Guide

## Overview

This document describes the OAuth authentication implementation for the Unlimited Options Recommendations Shopify app.

## What Was Implemented

### 1. Session Storage (Supabase)
- **Table**: `shopify_sessions`
- **Location**: `/supabase/migrations/create_sessions_table.sql`
- **Fields**:
  - `shop` (unique) - Merchant's shop domain
  - `access_token` - OAuth access token
  - `scopes` - Granted permissions
  - `created_at`, `updated_at` - Timestamps

### 2. Authentication Library
- **File**: `/lib/shopify-auth.js`
- **Functions**:
  - `generateAuthUrl()` - Creates OAuth authorization URL
  - `verifyHmac()` - Verifies Shopify request signatures
  - `getAccessToken()` - Exchanges code for access token
  - `storeSession()` - Saves session to Supabase
  - `getSession()` - Retrieves session from Supabase
  - `createShopifyClient()` - Creates authenticated API client
  - `isValidShopDomain()` - Validates shop domain format
  - `verifyAppProxyRequest()` - Validates app proxy requests

### 3. OAuth Endpoints

#### `/pages/api/auth/index.js` - OAuth Initialization
- **Route**: `/api/auth?shop=yourstore.myshopify.com`
- **Purpose**: Starts OAuth flow
- **Process**:
  1. Validates shop parameter
  2. Generates authorization URL
  3. Stores nonce in cookie
  4. Redirects to Shopify

#### `/pages/api/auth/callback.js` - OAuth Callback
- **Route**: `/api/auth/callback`
- **Purpose**: Completes OAuth flow
- **Process**:
  1. Validates HMAC signature
  2. Verifies state/nonce
  3. Exchanges code for access token
  4. Stores session in Supabase
  5. Sets session cookie
  6. Redirects to dashboard

### 4. Authentication Middleware
- **File**: `/lib/auth-middleware.js`
- **Exports**:
  - `withAuth()` - Required authentication
  - `withAppProxy()` - App proxy authentication
  - `withOptionalAuth()` - Optional authentication

### 5. Updated Scopes
**Old**: `write_products`

**New**:
- `read_products` - Read product data
- `write_products` - Create/update products
- `read_inventory` - Read inventory levels
- `write_inventory` - Update inventory
- `read_orders` - Access order data
- `write_cart_transforms` - Modify cart
- `read_themes` - Access theme files

## How to Use

### For New API Routes

```javascript
import { withAuth } from '../../../lib/auth-middleware';

async function handler(req, res) {
  // Access authenticated session
  const { shop, accessToken, shopifyClient } = req.session;

  // Make authenticated API calls
  const data = await shopifyClient.graphql(`
    query {
      products(first: 10) {
        edges {
          node {
            id
            title
          }
        }
      }
    }
  `);

  res.json(data);
}

export default withAuth(handler);
```

### App Installation Flow

1. **Merchant Clicks Install**:
   ```
   https://yourapp.vercel.app/api/auth?shop=merchant-store.myshopify.com
   ```

2. **Merchant Approves Permissions**:
   - Shopify shows permission request
   - Merchant clicks "Install app"

3. **Callback & Session Creation**:
   - Shopify redirects to `/api/auth/callback`
   - Access token exchanged
   - Session stored in Supabase
   - Merchant redirected to `/dashboard?shop=...&installed=true`

4. **Making Authenticated Requests**:
   ```
   GET /api/products?shop=merchant-store.myshopify.com
   ```
   OR with session cookie (set automatically):
   ```
   GET /api/products
   ```

## Security Features

1. **HMAC Verification**: All OAuth callbacks verified
2. **Nonce/State Validation**: Prevents CSRF attacks
3. **Session Cookies**: HttpOnly, SameSite=Lax
4. **Shop Domain Validation**: Only valid myshopify.com domains
5. **Row Level Security**: Supabase policies protect sessions

## Testing OAuth Flow

### 1. Start Development Server
```bash
npm run dev
```

### 2. Install App
Navigate to:
```
http://localhost:3000/api/auth?shop=your-dev-store.myshopify.com
```

### 3. Approve Permissions
Click "Install app" on Shopify's permission screen

### 4. Test Authenticated Endpoint
```bash
curl "http://localhost:3000/api/products?shop=your-dev-store.myshopify.com"
```

## Migration Steps for Existing Routes

### Before (Insecure):
```javascript
import { shopifyAdmin } from '../../../lib/shopify-client';

export default async function handler(req, res) {
  // Hardcoded shop domain!
  const data = await shopifyAdmin.request('...');
  res.json(data);
}
```

### After (Secure):
```javascript
import { withAuth } from '../../../lib/auth-middleware';

async function handler(req, res) {
  // Session-based authentication!
  const { shopifyClient } = req.session;
  const data = await shopifyClient.graphql('...');
  res.json(data);
}

export default withAuth(handler);
```

## Environment Variables Required

```env
# Shopify App Credentials
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=read_products,write_products,read_inventory,write_inventory,read_orders,write_cart_transforms,read_themes
HOST=https://yourapp.vercel.app

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Next Steps

To update your remaining API routes:

1. **Find routes without authentication**:
   ```bash
   grep -r "export default" pages/api/ | grep -v "withAuth"
   ```

2. **Update each route**:
   - Import `withAuth` middleware
   - Remove hardcoded shop domains
   - Use `req.session.shopifyClient` instead
   - Wrap handler with `withAuth()`

3. **Test each route**:
   - Ensure shop parameter is passed
   - Verify session is valid
   - Check API responses

## Troubleshooting

### "No shop parameter or session"
- Pass `?shop=yourstore.myshopify.com` in URL
- OR ensure session cookie is set

### "HMAC verification failed"
- Check SHOPIFY_API_SECRET is correct
- Ensure request is coming from Shopify

### "No valid session found"
- Reinstall the app via `/api/auth`
- Check Supabase connection

### "Invalid shop domain"
- Shop must end with `.myshopify.com`
- No http:// or https:// prefix

## Files Created/Modified

### Created:
- `/lib/shopify-auth.js` - Core OAuth functions
- `/lib/auth-middleware.js` - Authentication middleware
- `/pages/api/auth/index.js` - OAuth init endpoint
- `/pages/api/auth/callback.js` - OAuth callback endpoint
- `/supabase/migrations/create_sessions_table.sql` - Database schema
- `/OAUTH_IMPLEMENTATION.md` - This documentation

### Modified:
- `/pages/api/products/index.js` - Example secure route
- `/shopify.app.toml` - Updated scopes
- `/.env.local` - Updated SCOPES variable
- `/package.json` - Added `cookie` dependency

## Resources

- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/auth/oauth)
- [Shopify API Scopes](https://shopify.dev/docs/api/usage/access-scopes)
- [App Bridge Documentation](https://shopify.dev/docs/api/app-bridge)
