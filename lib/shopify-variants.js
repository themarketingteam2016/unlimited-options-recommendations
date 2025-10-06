import { shopifyAdmin } from './shopify-client';
import { supabaseAdmin } from './supabase';

/**
 * Create or update a Shopify variant for a custom variant
 */
export async function syncVariantToShopify(variantData, productGid) {
  try {
    const productId = productGid.split('/').pop();

    // Build option values array from variant options
    const optionValues = variantData.variant_options?.map(opt => ({
      optionName: opt.attribute?.name || 'Option',
      name: opt.attribute_value?.value || 'Value'
    })) || [];

    // Create variant in Shopify
    const mutation = `
      mutation productVariantCreate($input: ProductVariantInput!) {
        productVariantCreate(input: $input) {
          productVariant {
            id
            title
            sku
            price
            inventoryQuantity
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
        productId: productGid,
        price: String(variantData.price || '0.00'),
        sku: variantData.sku || '',
        inventoryQuantities: [{
          availableQuantity: variantData.stock_quantity || 0,
          locationId: 'gid://shopify/Location/94761009404' // You'll need to get this dynamically
        }],
        options: optionValues.map(opt => opt.name)
      }
    };

    const response = await shopifyAdmin.request(mutation, { variables });

    if (response.data?.productVariantCreate?.userErrors?.length > 0) {
      const errors = response.data.productVariantCreate.userErrors;
      throw new Error(`Shopify variant creation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    const shopifyVariantId = response.data?.productVariantCreate?.productVariant?.id;

    if (shopifyVariantId) {
      // Update our database with the Shopify variant ID
      await supabaseAdmin
        .from('variants')
        .update({
          shopify_variant_id: shopifyVariantId
        })
        .eq('id', variantData.id);

      return shopifyVariantId;
    }

    throw new Error('No variant ID returned from Shopify');
  } catch (error) {
    console.error('Error syncing variant to Shopify:', error);
    throw error;
  }
}

/**
 * Bulk sync all variants for a product to Shopify
 */
export async function bulkSyncVariantsToShopify(productGid) {
  try {
    // Get internal product ID
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_product_id', productGid)
      .single();

    if (!product) {
      throw new Error('Product not found');
    }

    // Get all variants without shopify_variant_id
    const { data: variants } = await supabaseAdmin
      .from('variants')
      .select(`
        *,
        variant_options (
          attribute:attributes (name),
          attribute_value:attribute_values (value)
        )
      `)
      .eq('product_id', product.id)
      .is('shopify_variant_id', null)
      .eq('is_active', true)
      .limit(100); // Shopify limit

    if (!variants || variants.length === 0) {
      return { synced: 0, message: 'No variants to sync' };
    }

    const results = [];
    for (const variant of variants) {
      try {
        const shopifyVariantId = await syncVariantToShopify(variant, productGid);
        results.push({ success: true, variantId: variant.id, shopifyVariantId });
      } catch (error) {
        results.push({ success: false, variantId: variant.id, error: error.message });
      }
    }

    return {
      synced: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      total: variants.length,
      results
    };
  } catch (error) {
    console.error('Bulk sync error:', error);
    throw error;
  }
}

/**
 * Create a Shopify variant on-demand when adding to cart
 */
export async function createVariantOnDemand(variantId) {
  try {
    // Get variant details
    const { data: variant } = await supabaseAdmin
      .from('variants')
      .select(`
        *,
        product:products!inner(shopify_product_id),
        variant_options (
          attribute:attributes (name),
          attribute_value:attribute_values (value)
        )
      `)
      .eq('id', variantId)
      .single();

    if (!variant) {
      throw new Error('Variant not found');
    }

    if (variant.shopify_variant_id) {
      return variant.shopify_variant_id; // Already exists
    }

    const productGid = variant.product.shopify_product_id;
    return await syncVariantToShopify(variant, productGid);
  } catch (error) {
    console.error('Error creating variant on demand:', error);
    throw error;
  }
}
