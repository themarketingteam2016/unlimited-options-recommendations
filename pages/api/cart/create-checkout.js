import { withOptionalAuth } from '../../../lib/auth-middleware';
import { supabaseAdmin } from '../../../lib/supabase';
import { handleCors } from '../../../lib/cors';

async function createCheckoutHandler(req, res) {
  console.log('[create-checkout] Handler started');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items } = req.body; // Array of {variantId, quantity}

    console.log('[create-checkout] Request received:', { itemCount: items?.length, items });

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('[create-checkout] Missing or invalid items');
      return res.status(400).json({ error: 'items array is required' });
    }

    // Check if Supabase is configured
    if (!supabaseAdmin) {
      console.error('[create-checkout] Supabase admin client not initialized');
      return res.status(500).json({
        error: 'Database not configured',
        message: 'Supabase admin client is not available'
      });
    }

    // Create Shopify client using server-side credentials
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN || 'joseph-asher.myshopify.com';
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!accessToken) {
      console.error('[create-checkout] Missing Shopify access token');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Shopify access token not configured'
      });
    }

    // Create Shopify GraphQL client
    const shopifyClient = {
      request: async (query, { variables }) => {
        const response = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
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
      }
    };
    const lineItems = [];

    // Fetch all variant details from database
    for (const item of items) {
      console.log('[create-checkout] Fetching variant:', item.variantId);

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
        .eq('id', item.variantId)
        .single();

      if (variantError || !variant) {
        console.error('[create-checkout] Variant not found:', item.variantId, variantError);
        return res.status(404).json({
          error: 'Variant not found',
          variantId: item.variantId
        });
      }

      // Validate product relationship
      if (!variant.product || !variant.product.shopify_product_id) {
        console.error('[create-checkout] Variant has no associated product:', {
          variantId: variant.id,
          product: variant.product
        });
        return res.status(400).json({
          error: 'Variant has no associated product',
          variantId: variant.id
        });
      }

      // Check stock
      if (variant.stock_quantity !== null && variant.stock_quantity !== undefined && variant.stock_quantity < item.quantity) {
        console.error('[create-checkout] Insufficient stock:', {
          variantId: item.variantId,
          requested: item.quantity,
          available: variant.stock_quantity
        });
        return res.status(400).json({
          error: 'Insufficient stock',
          variantId: item.variantId,
          available: variant.stock_quantity
        });
      }

      // Build variant title from options
      const optionValues = variant.variant_options?.map(opt =>
        opt.attribute_value?.value || 'Unknown'
      ).join(' / ') || 'Custom';

      const variantTitle = `${variant.product.title} - ${optionValues}`;

      // Build line item properties for reference
      const properties = [];
      variant.variant_options?.forEach(opt => {
        if (opt.attribute && opt.attribute_value) {
          properties.push({
            name: opt.attribute.name,
            value: opt.attribute_value.value
          });
        }
      });

      if (variant.sku) {
        properties.push({
          name: 'SKU',
          value: variant.sku
        });
      }

      lineItems.push({
        title: variantTitle,
        price: variant.price.toString(),
        quantity: item.quantity,
        sku: variant.sku || `CUSTOM-${variant.id}`,
        properties: properties,
        taxable: true,
        // Store variant ID for reference
        customAttributes: [
          {
            key: '_custom_variant_id',
            value: variant.id
          },
          {
            key: '_product_handle',
            value: variant.product.handle || ''
          }
        ]
      });

      console.log('[create-checkout] Added line item:', {
        title: variantTitle,
        price: variant.price,
        quantity: item.quantity
      });
    }

    // Create draft order via Shopify Admin API
    console.log('[create-checkout] Creating draft order with', lineItems.length, 'items');

    const draftOrderMutation = `
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            name
            invoiceUrl
            totalPrice
            subtotalPrice
            totalTax
            lineItems(first: 50) {
              edges {
                node {
                  id
                  title
                  quantity
                  originalUnitPrice
                }
              }
            }
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
        lineItems: lineItems.map(item => ({
          title: item.title,
          originalUnitPrice: item.price,
          quantity: item.quantity,
          taxable: item.taxable,
          customAttributes: item.customAttributes
        })),
        note: 'Order created via Unlimited Options & Recommendations app',
        useCustomerDefaultAddress: true
      }
    };

    console.log('[create-checkout] Draft order mutation variables:', JSON.stringify(variables, null, 2));

    const response = await shopifyClient.request(draftOrderMutation, { variables });

    console.log('[create-checkout] Shopify response:', JSON.stringify(response, null, 2));

    if (response.data?.draftOrderCreate?.userErrors?.length > 0) {
      console.error('[create-checkout] Shopify errors:', response.data.draftOrderCreate.userErrors);
      return res.status(400).json({
        error: 'Failed to create draft order',
        details: response.data.draftOrderCreate.userErrors
      });
    }

    const draftOrder = response.data?.draftOrderCreate?.draftOrder;

    if (!draftOrder || !draftOrder.invoiceUrl) {
      console.error('[create-checkout] No draft order or invoice URL returned');
      return res.status(500).json({
        error: 'Failed to create draft order',
        message: 'No invoice URL returned from Shopify'
      });
    }

    console.log('[create-checkout] Draft order created:', {
      id: draftOrder.id,
      name: draftOrder.name,
      totalPrice: draftOrder.totalPrice,
      invoiceUrl: draftOrder.invoiceUrl
    });

    // Return success with checkout URL
    res.status(200).json({
      success: true,
      checkoutUrl: draftOrder.invoiceUrl,
      draftOrder: {
        id: draftOrder.id,
        name: draftOrder.name,
        totalPrice: draftOrder.totalPrice,
        subtotalPrice: draftOrder.subtotalPrice,
        totalTax: draftOrder.totalTax
      }
    });

  } catch (error) {
    console.error('[create-checkout] Unexpected error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Wrap with optional auth first, then CORS
const authHandler = withOptionalAuth(createCheckoutHandler);

export default async function handler(req, res) {
  try {
    console.log('[create-checkout] Main handler called');
    return await handleCors(req, res, authHandler);
  } catch (error) {
    console.error('[create-checkout] Error in main handler:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({
      error: 'Handler error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
