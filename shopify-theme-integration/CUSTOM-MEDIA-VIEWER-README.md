# Custom Media Viewer - Installation Guide

## Overview

The Custom Media Viewer replaces your default Shopify product media with a custom image viewer that automatically updates when customers select attribute values with images (like metal types).

## Features

- ✅ Shows default product image on page load
- ✅ Automatically updates when attribute with image is selected
- ✅ Clickable thumbnails for browsing product images
- ✅ Smooth transitions and hover effects
- ✅ Mobile responsive
- ✅ Integrates seamlessly with Unlimited Options

## Installation

### Step 1: Upload the Liquid File

1. Go to your Shopify admin → **Online Store** → **Themes**
2. Click **Actions** → **Edit code** on your active theme
3. In the **Snippets** folder, click **Add a new snippet**
4. Name it: `custom-media-viewer`
5. Copy the contents of `custom-media-viewer.liquid` and paste it into the new snippet
6. Click **Save**

### Step 2: Add to Product Template

1. In your theme editor, find your product template (usually `sections/product-template.liquid` or `sections/main-product.liquid`)
2. Find where the default product images are displayed (look for something like `{{ product.featured_image }}` or `product__media`)
3. **Replace** or **comment out** the default image code
4. Add this line where you want the custom viewer to appear:

```liquid
{% render 'custom-media-viewer', product: product %}
```

### Example:

**Before:**
```liquid
<div class="product__media">
  <img src="{{ product.featured_image | image_url: width: 1200 }}" alt="{{ product.title }}">
</div>
```

**After:**
```liquid
{% comment %} Original media - replaced with custom viewer
<div class="product__media">
  <img src="{{ product.featured_image | image_url: width: 1200 }}" alt="{{ product.title }}">
</div>
{% endcomment %}

{% render 'custom-media-viewer', product: product %}
```

### Step 3: Test

1. Go to a product page with attribute options (e.g., Metal Type)
2. Select an attribute value that has an image uploaded
3. The main product image should change to show the attribute image!

## How It Works

1. **Default State**: Shows the product's featured image
2. **Attribute Selection**: When customer selects Metal Type (or any attribute with an image), the custom viewer listens for the `unlimited-options:image-change` event
3. **Image Update**: The main image smoothly transitions to the attribute value's image
4. **Thumbnails**: Customer can still click thumbnails to view other product images

## Customization

### Adjust Image Size

Edit the viewer snippet and change the width parameter:

```liquid
src="{{ product.featured_image | image_url: width: 1200 }}"
```

Change `1200` to your desired width (e.g., `800`, `1500`, etc.)

### Change Thumbnail Count

By default, it shows 5 thumbnails. To show more/less:

```liquid
{% for image in product.images limit: 5 %}
```

Change `5` to your desired number.

### Styling

The viewer includes built-in styles. To customize:

1. Find the `<style>` section in `custom-media-viewer.liquid`
2. Modify colors, borders, shadows, etc.

**Example - Change border color:**
```css
.custom-media-viewer__main {
  border: 1px solid #your-color-here;
}
```

## Troubleshooting

### Image not changing when selecting attribute

1. **Check console** (F12 in browser) for errors
2. **Verify** the attribute value has an image uploaded in admin
3. **Ensure** the product customizer extension is active on your theme

### Thumbnails not showing

- Make sure your product has multiple images
- Check that `product.images.size > 1`

### Image appears stretched/distorted

Adjust the `aspect-ratio` in the CSS:

```css
.custom-media-viewer__main {
  aspect-ratio: 1;  /* Change to 4/3, 16/9, etc. */
}
```

## API

### JavaScript Functions

The custom viewer exposes these global functions:

#### Update Image Programmatically
```javascript
window.updateCustomMediaViewer(imageUrl, altText);
```

#### Reset to Default Image
```javascript
window.resetProductImage();
```

### Events

The viewer listens for this custom event:

```javascript
document.dispatchEvent(new CustomEvent('unlimited-options:image-change', {
  detail: { imageUrl: 'your-image-url', altText: 'description' }
}));
```

## Support

For issues or questions:
- Check browser console for error messages
- Verify Unlimited Options app is installed and active
- Ensure attribute values have images uploaded

## Version

Current Version: 1.0.0
Compatible with: Unlimited Options App v41+
