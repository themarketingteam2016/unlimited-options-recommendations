# Complete Checkout Flow Documentation

## Overview
This guide explains how custom product variants flow from selection through checkout to completed order.

---

## Flow Diagram

```
Product Page → Add to Cart → Cart → Checkout → Order → Fulfillment
     ↓              ↓           ↓         ↓        ↓         ↓
  Select      Create       Display   Process   Update    Ship
  Options     Variant      Items     Payment   Stock     Items
```

---

## Step-by-Step Process

### 1. **Product Page - Option Selection**

**File:** `extensions/product-customizer-block/blocks/product-customizer.liquid`

**What Happens:**
- Customer selects options (Metal, Quality, Gem Size, etc.)
- Widget fetches matching variants from API
- Displays price, stock, and SKU
- Enables "Add to Cart" button when all options selected

**API Call:**
```javascript
GET /api/products/{productId}/variants
// Returns: Array of variants with options, prices, stock
```

---

### 2. **Add to Cart - Variant Creation**

**File:** `pages/api/cart/add-variant.js`

**What Happens:**
- Widget calls `/api/cart/add-variant` with variant ID
- API checks if Shopify variant exists
- **If NO:** Creates Shopify variant on-demand via GraphQL
- **If YES:** Returns existing Shopify variant ID
- Stock is validated
- Returns cart data with properties

**API Call:**
```javascript
POST /api/cart/add-variant
Body: { variantId: "uuid", quantity: 1 }

Response: {
  success: true,
  cartData: {
    id: "shopifyVariantId",
    quantity: 1,
    properties: {
      "Metal": "14K White Gold",
      "Quality": "VVS",
      "_SKU": "RING-14KWG-VVS"
    }
  }
}
```

**Shopify Variant Creation:**
```javascript
// lib/shopify-variants.js
mutation productVariantCreate($input: ProductVariantInput!) {
  productVariantCreate(input: $input) {
    productVariant {
      id
      price
      sku
      inventoryQuantity
    }
  }
}
```

---

### 3. **Cart Page - Display**

**Shopify Cart API:** `/cart/add.js`

**What Happens:**
- Variant is added to Shopify cart
- Line item properties are attached
- Cart displays:
  - Product title
  - Variant options as properties
  - Custom price
  - Custom SKU
  - Quantity

**Cart Line Item Structure:**
```json
{
  "id": "shopify_variant_id",
  "product_id": "product_id",
  "title": "Custom Ring",
  "variant_title": "14K White Gold / VVS / 1.5ct",
  "price": "2499.00",
  "quantity": 1,
  "properties": {
    "Metal": "14K White Gold",
    "Quality": "VVS",
    "Gem Size": "1.5ct",
    "_SKU": "RING-14KWG-VVS-15"
  }
}
```

---

### 4. **Checkout - Processing**

**Shopify Checkout**

**What Happens:**
- Customer enters shipping/billing info
- Selects shipping method
- Enters payment details
- Reviews order with custom variant details
- Completes purchase

**Order Data Includes:**
```json
{
  "line_items": [{
    "variant_id": "shopify_variant_id",
    "quantity": 1,
    "price": "2499.00",
    "properties": [
      { "name": "Metal", "value": "14K White Gold" },
      { "name": "Quality", "value": "VVS" },
      { "name": "Gem Size", "value": "1.5ct" },
      { "name": "_SKU", "value": "RING-14KWG-VVS-15" }
    ]
  }]
}
```

---

### 5. **Order Creation - Webhook**

**File:** `pages/api/webhooks/orders-create.js`

**What Happens:**
- Shopify sends webhook to your app
- Webhook is verified using HMAC signature
- Stock is updated in database
- Order details are logged

**Webhook Payload:**
```json
{
  "id": 123456789,
  "name": "#1001",
  "line_items": [{
    "variant_id": "shopify_variant_id",
    "quantity": 1,
    "price": "2499.00"
  }]
}
```

**Stock Update:**
```javascript
// Decrease stock in database
UPDATE variants
SET stock_quantity = stock_quantity - {quantity}
WHERE shopify_variant_id = {variant_id}
```

---

### 6. **Order Fulfillment**

**Shopify Admin**

**What Happens:**
- Order appears in Shopify admin
- Line item properties are visible
- Custom SKU helps identify exact variant
- Pick/pack/ship based on properties
- Update order status
- Customer receives confirmation email with all custom details

---

## Setup Instructions

### 1. Run Database Migration

Add `shopify_variant_id` column to variants table:

```sql
ALTER TABLE variants ADD COLUMN IF NOT EXISTS shopify_variant_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_variants_shopify_variant_id ON variants(shopify_variant_id);
```

Or run via Supabase dashboard SQL editor.

---

### 2. Configure Webhooks

**In Shopify Admin:**

1. Go to **Settings → Notifications → Webhooks**
2. Click **Create webhook**
3. Configure:
   - **Event:** Order creation
   - **Format:** JSON
   - **URL:** `https://unlimtited-options-recommendations.vercel.app/api/webhooks/orders-create`
   - **API Version:** Latest

4. Save webhook

---

### 3. Get Shopify Location ID

For inventory management, you need your location ID:

```javascript
// Run in Shopify GraphQL Admin API
query {
  locations(first: 1) {
    edges {
      node {
        id
        name
      }
    }
  }
}

// Returns: gid://shopify/Location/{id}
```

Update in `lib/shopify-variants.js` line 34:
```javascript
locationId: 'gid://shopify/Location/YOUR_LOCATION_ID'
```

---

### 4. Sync Existing Variants (Optional)

If you have existing variants without Shopify IDs:

```javascript
POST /api/variants/sync-to-shopify
Body: { productId: "gid://shopify/Product/123" }

// Syncs up to 100 variants per product
```

---

## Testing the Flow

### Test Scenario 1: Normal Flow

1. **Product Page:**
   - Select: Metal=14K White Gold, Quality=VVS, Size=1.5ct
   - Click "Add to Cart"
   - ✅ Should create Shopify variant and add to cart

2. **Cart:**
   - ✅ Line item shows correct options as properties
   - ✅ Price matches custom variant price
   - ✅ SKU is visible (if enabled in theme)

3. **Checkout:**
   - Complete checkout with test payment
   - ✅ Order processes successfully

4. **Order:**
   - ✅ Webhook fires and updates stock
   - ✅ Order appears in Shopify admin
   - ✅ All custom properties visible

---

### Test Scenario 2: Fallback Mode

If Shopify variant creation fails:

1. System uses product's default variant
2. Stores ALL options as line item properties
3. Cart shows: "_Custom_Variant: Yes"
4. You can manually adjust price in admin after order

---

## Troubleshooting

### Issue: Variant not added to cart

**Check:**
- Browser console for errors
- Network tab for API responses
- Stock availability
- Shopify variant limit (100 per product)

**Solution:**
```javascript
// Check variant in database
SELECT * FROM variants WHERE id = 'variant-uuid';

// Check if Shopify variant exists
SELECT shopify_variant_id FROM variants WHERE id = 'variant-uuid';
```

---

### Issue: Wrong price in cart

**Cause:** Shopify variant price doesn't match database

**Solution:**
- Resync variant to Shopify
- Or use Shopify Functions to adjust price dynamically

---

### Issue: Stock not updating

**Check:**
- Webhook is configured correctly
- Webhook is firing (check Shopify admin webhook logs)
- API endpoint is reachable
- HMAC signature is valid

**Solution:**
```bash
# Test webhook manually
curl -X POST https://unlimtited-options-recommendations.vercel.app/api/webhooks/orders-create \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: {signature}" \
  -d '{order payload}'
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/products/{id}/variants` | GET | Fetch variants for product |
| `/api/cart/add-variant` | POST | Prepare variant for cart |
| `/api/variants/sync-to-shopify` | POST | Bulk sync variants |
| `/api/webhooks/orders-create` | POST | Handle order creation |

---

## Line Item Properties

Properties attached to cart items:

| Property | Description |
|----------|-------------|
| `Metal` | Selected metal type |
| `Quality` | Selected quality grade |
| `Gem Size` | Selected gem size |
| `_SKU` | Custom SKU for fulfillment |
| `_Custom_Variant` | Flag for custom variants |

**Note:** Properties starting with `_` are hidden from customer but visible in admin.

---

## Limitations

1. **Shopify Variant Limit:** 100 variants per product
   - If you have >100 combinations, use fallback mode
   - Consider grouping similar variants

2. **Dynamic Pricing:**
   - Shopify uses variant price at checkout
   - For dynamic pricing, use Shopify Functions (Plus plan)

3. **Inventory Sync:**
   - Manual adjustment needed if webhook fails
   - Consider implementing inventory sync job

---

## Next Steps

1. ✅ Deploy latest code
2. ✅ Run database migration
3. ✅ Configure webhook
4. ✅ Get location ID
5. ✅ Test complete flow
6. ✅ Train staff on custom orders

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Vercel logs for API errors
3. Check Shopify webhook logs
4. Review this documentation

---

**Last Updated:** 2025-10-06
**Version:** 1.0.0
