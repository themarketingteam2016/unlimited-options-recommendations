import { withOptionalAuth } from '../../../lib/auth-middleware';
import { supabaseAdmin } from '../../../lib/supabase';
import { handleCors } from '../../../lib/cors';

/**
 * Create Draft Order checkout from existing cart
 * This allows customers to add items to cart and checkout with correct custom pricing
 */
async function checkoutFromCartHandler(req, res) {
  console.log('[checkout-from-cart] Handler started');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cartItems } = req.body; // Cart items from Shopify cart

    console.log('[checkout-from-cart] Request received:', { itemCount: cartItems?.length });

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      console.error('[checkout-from-cart] Missing or invalid cart items');
      return res.status(400).json({ error: 'cartItems array is required' });
    }

    // Check if Supabase is configured
    if (!supabaseAdmin) {
      console.error('[checkout-from-cart] Supabase admin client not initialized');
      return res.status(500).json({
        error: 'Database not configured',
        message: 'Supabase admin client is not available'
      });
    }

    // Create Shopify client using server-side credentials
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || 'joseph-asher.myshopify.com';
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!accessToken) {
      console.error('[checkout-from-cart] Missing Shopify access token');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Shopify access token not configured'
      });
    }

    const lineItems = [];

    // Process each cart item
    for (const cartItem of cartItems) {
      const customVariantId = cartItem.properties?._custom_variant_id;

      // If it's a custom variant, fetch details from database
      if (customVariantId) {
        console.log('[checkout-from-cart] Processing custom variant:', customVariantId);

        const { data: variant, error: variantError } = await supabaseAdmin
          .from('variants')
          .select(`
            *,
            product:products(shopify_product_id, title, handle),
            variant_options (
              attribute:attributes (name),
              attribute_value:attribute_values (value)
            )
          `)
          .eq('id', customVariantId)
          .single();

        if (variantError || !variant) {
          console.error('[checkout-from-cart] Custom variant not found:', customVariantId);
          // Skip this item or use cart price
          continue;
        }

        // Build variant title from options
        const optionValues = variant.variant_options?.map(opt =>
          opt.attribute_value?.value || 'Unknown'
        ).join(' / ') || 'Custom';

        const variantTitle = `${variant.product.title} - ${optionValues}`;

        lineItems.push({
          title: variantTitle,
          originalUnitPrice: variant.price.toString(),
          quantity: cartItem.quantity,
          taxable: true,
          customAttributes: [
            {
              key: '_custom_variant_id',
              value: variant.id
            }
          ]
        });

        console.log('[checkout-from-cart] Added custom variant:', {
          title: variantTitle,
          price: variant.price,
          quantity: cartItem.quantity
        });

      } else {
        // Regular Shopify product - use cart price
        lineItems.push({
          title: cartItem.product_title,
          originalUnitPrice: (cartItem.price / 100).toString(), // Convert cents to dollars
          quantity: cartItem.quantity,
          taxable: true
        });

        console.log('[checkout-from-cart] Added regular product:', {
          title: cartItem.product_title,
          price: cartItem.price / 100,
          quantity: cartItem.quantity
        });
      }
    }

    if (lineItems.length === 0) {
      return res.status(400).json({
        error: 'No valid items to checkout',
        message: 'Cart contains no processable items'
      });
    }

    // Create draft order via Shopify Admin API
    console.log('[checkout-from-cart] Creating draft order with', lineItems.length, 'items');

    const draftOrderMutation = `
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            name
            invoiceUrl
            totalPrice
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        lineItems: lineItems,
        note: 'Order created via Unlimited Options app from cart',
        useCustomerDefaultAddress: true
      }
    };

    console.log('[checkout-from-cart] Creating draft order...');

    const response = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({ query: draftOrderMutation, variables })
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    console.log('[checkout-from-cart] Shopify response:', JSON.stringify(data, null, 2));

    if (data.data?.draftOrderCreate?.userErrors?.length > 0) {
      console.error('[checkout-from-cart] Shopify errors:', data.data.draftOrderCreate.userErrors);
      return res.status(400).json({
        error: 'Failed to create draft order',
        details: data.data.draftOrderCreate.userErrors
      });
    }

    const draftOrder = data.data?.draftOrderCreate?.draftOrder;

    if (!draftOrder || !draftOrder.invoiceUrl) {
      console.error('[checkout-from-cart] No invoice URL returned');
      return res.status(500).json({
        error: 'Failed to create checkout',
        message: 'No invoice URL returned from Shopify'
      });
    }

    console.log('[checkout-from-cart] Success:', {
      id: draftOrder.id,
      invoiceUrl: draftOrder.invoiceUrl,
      totalPrice: draftOrder.totalPrice
    });

    // Return success with checkout URL
    res.status(200).json({
      success: true,
      checkoutUrl: draftOrder.invoiceUrl,
      draftOrder: {
        id: draftOrder.id,
        name: draftOrder.name,
        totalPrice: draftOrder.totalPrice
      }
    });

  } catch (error) {
    console.error('[checkout-from-cart] Unexpected error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Wrap with optional auth first, then CORS
const authHandler = withOptionalAuth(checkoutFromCartHandler);

export default async function handler(req, res) {
  try {
    console.log('[checkout-from-cart] Main handler called');
    return await handleCors(req, res, authHandler);
  } catch (error) {
    console.error('[checkout-from-cart] Error in main handler:', error.message);
    return res.status(500).json({
      error: 'Handler error',
      message: error.message
    });
  }
}
