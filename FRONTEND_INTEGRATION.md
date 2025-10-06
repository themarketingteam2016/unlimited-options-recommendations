# Frontend Integration Guide
## Product Variations on Shopify Storefront

This guide shows you how to integrate custom product variations into your Shopify theme.

---

## 📋 Table of Contents

1. [Method 1: Using App Block (Recommended)](#method-1-app-block)
2. [Method 2: Using Liquid Snippet](#method-2-liquid-snippet)
3. [Method 3: Using Embed Widget](#method-3-embed-widget)
4. [Customization Options](#customization)
5. [Troubleshooting](#troubleshooting)

---

## Method 1: App Block (Recommended) ✅

The easiest way to add variations to your product pages.

### Steps:

1. **Go to Theme Customizer**
   ```
   Shopify Admin → Online Store → Themes → Customize
   ```

2. **Navigate to Product Page Template**
   - Click on **Templates** → **Product** (or any product)

3. **Add the App Block**
   - Click **"Add block"** or **"Add app block"**
   - Find **"Product Customizer"** under your app
   - Drag it to desired position (usually after price)

4. **Configure Settings** (optional)
   - ✅ Show quantity selector
   - ✅ Show SKU
   - Click **Save**

### That's it! The customizer will now appear on all product pages. 🎉

---

## Method 2: Liquid Snippet

For developers who want more control over placement and styling.

### Step 1: Create Snippet File

1. Go to your theme code editor:
   ```
   Shopify Admin → Online Store → Themes → Actions → Edit code
   ```

2. Create new snippet:
   - Click **"Add a new snippet"**
   - Name it: `product-customizer`
   - Copy content from: `shopify-theme-integration/product-customizer.liquid`

### Step 2: Add to Product Template

1. Open your product template file:
   - Usually: `sections/product-template.liquid`
   - Or: `sections/main-product.liquid`

2. Add this line where you want the customizer to appear:
   ```liquid
   {% render 'product-customizer', product: product %}
   ```

   **Example placement** (after product price):
   ```liquid
   <div class="product__price">
     {{ product.price | money }}
   </div>

   {%comment%} Add customizer here {%endcomment%}
   {% render 'product-customizer', product: product %}

   <div class="product__description">
     {{ product.description }}
   </div>
   ```

3. Save the file

### Step 3: Update Configuration

In the snippet, update the APP_URL on line 16:
```javascript
const APP_URL = 'https://unlimtited-options-recommendations.vercel.app';
```

---

## Method 3: Embed Widget (iFrame)

For embedding on any webpage (not just Shopify).

### Step 1: Get Embed Code

1. Go to admin panel:
   ```
   Your App → Products → Edit Product → Embed Code tab
   ```

2. Copy the iframe code

### Step 2: Add to Your Page

Paste the iframe code in your HTML:

```html
<iframe
  src="https://unlimtited-options-recommendations.vercel.app/embed/gid%3A%2F%2Fshopify%2FProduct%2F123"
  width="100%"
  height="700"
  frameborder="0"
  style="max-width: 500px; border: none; border-radius: 8px;">
</iframe>
```

### Step 3: Listen to Cart Events (Optional)

Add JavaScript to handle add-to-cart:

```html
<script>
window.addEventListener('message', function(event) {
  if (event.data.type === 'ADD_TO_CART') {
    const { variant, quantity, product } = event.data;

    // Your custom cart logic here
    console.log('Adding to cart:', variant, quantity);

    // Example: Trigger Shopify cart
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: variant.shopify_variant_id, quantity }]
      })
    });
  }
});
</script>
```

---

## 🎨 Customization Options

### Styling

All CSS classes are prefixed with `unlimited-` to avoid conflicts:

```css
/* Main container */
.unlimited-customizer { }

/* Option dropdowns */
.unlimited-option__select { }

/* Add to cart button */
.unlimited-add-to-cart { }

/* Price display */
.unlimited-variant-price { }

/* Stock info */
.unlimited-variant-stock { }
```

### Example: Change Button Color

```css
.unlimited-add-to-cart {
  background: #000 !important; /* Black button */
}

.unlimited-add-to-cart:hover {
  background: #333 !important;
}
```

### Example: Hide Quantity Selector

```css
.unlimited-quantity {
  display: none !important;
}
```

---

## 🔧 Advanced Configuration

### Change API Endpoint

In the snippet, update line 16:

```javascript
const APP_URL = 'https://your-custom-domain.com';
```

### Add Custom Cart Logic

Replace the `addToCart` function:

```javascript
async function addToCart() {
  if (!selectedVariant) return;

  // Your custom logic here
  const response = await fetch('/your-cart-api', {
    method: 'POST',
    body: JSON.stringify({
      variant_id: selectedVariant.id,
      quantity: parseInt(qtyInput.value)
    })
  });

  if (response.ok) {
    // Success actions
    window.location.href = '/cart';
  }
}
```

### Show Only on Specific Products

Wrap the render tag with a condition:

```liquid
{% if product.handle == 'custom-ring' or product.tags contains 'customizable' %}
  {% render 'product-customizer', product: product %}
{% endif %}
```

---

## 🐛 Troubleshooting

### Issue: "No custom options available"

**Cause:** Product doesn't have any variants configured

**Solution:**
1. Go to admin panel
2. Edit the product
3. Add attributes and values
4. Generate variations

### Issue: Dropdowns not showing

**Cause:** JavaScript error or API endpoint issue

**Solution:**
1. Open browser console (F12)
2. Check for errors
3. Verify API URL is correct
4. Ensure product ID format is correct

### Issue: Add to cart not working

**Cause:** Shopify variant ID mismatch

**Solution:**
1. Check console for errors
2. Verify `selectedVariant.shopify_variant_id` exists
3. Ensure product has valid Shopify variants

### Issue: Styling conflicts

**Cause:** Theme CSS overriding customizer styles

**Solution:**
```css
/* Add !important to override */
.unlimited-customizer * {
  box-sizing: border-box !important;
}
```

---

## 📱 Mobile Responsive

The customizer is fully responsive by default. For custom breakpoints:

```css
@media (max-width: 768px) {
  .unlimited-customizer__actions {
    flex-direction: column;
  }

  .unlimited-add-to-cart {
    width: 100%;
  }
}
```

---

## 🚀 Performance Tips

1. **Lazy Load Images**
   ```javascript
   <img loading="lazy" src="..." alt="...">
   ```

2. **Cache API Responses**
   ```javascript
   const cachedVariants = sessionStorage.getItem('variants-' + productId);
   if (cachedVariants) {
     variants = JSON.parse(cachedVariants);
   }
   ```

3. **Minimize API Calls**
   - Fetch data once on page load
   - Store in memory
   - Only refetch when needed

---

## 📝 Complete Example

Here's a complete integration in your product template:

```liquid
{%comment%} sections/main-product.liquid {%endcomment%}

<div class="product">
  <div class="product__media">
    {{ product.featured_image | image_url: width: 1000 | image_tag }}
  </div>

  <div class="product__info">
    <h1 class="product__title">{{ product.title }}</h1>

    <div class="product__price">
      {{ product.price | money }}
    </div>

    {%comment%} Product Customizer {%endcomment%}
    {% render 'product-customizer', product: product %}

    <div class="product__description">
      {{ product.description }}
    </div>
  </div>
</div>
```

---

## 🎯 Next Steps

1. ✅ Choose integration method
2. ✅ Add to theme
3. ✅ Test on product page
4. ✅ Customize styling
5. ✅ Configure settings

**Need help?** Check the troubleshooting section or contact support.

---

## 📚 Additional Resources

- [Shopify Theme Development](https://shopify.dev/docs/themes)
- [Liquid Reference](https://shopify.dev/docs/api/liquid)
- [Cart API Documentation](https://shopify.dev/docs/api/ajax/reference/cart)
- [App Block Documentation](https://shopify.dev/docs/apps/online-store/theme-app-extensions)

---

**Last Updated:** 2025-10-06
**Version:** 1.0.0
