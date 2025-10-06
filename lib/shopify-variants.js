import { shopifyAdmin } from './shopify-client';
import { supabaseAdmin } from './supabase';

/**
 * Create or update a Shopify variant for a custom variant
 */
export async function syncVariantToShopify(variantData, productGid) {
  try {
    console.log('[syncVariantToShopify] Starting sync for variant:', variantData.id);
    const productId = productGid.split('/').pop();

    // Build option values array from variant options
    const optionValues = variantData.variant_options?.map(opt => ({
      optionName: opt.attribute?.name || 'Option',
      name: opt.attribute_value?.value || 'Value'
    })) || [];

    console.log('[syncVariantToShopify] Option values:', optionValues);

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

    console.log('[syncVariantToShopify] Mutation variables:', JSON.stringify(variables, null, 2));

    const response = await shopifyAdmin.request(mutation, { variables });

    console.log('[syncVariantToShopify] Shopify response:', JSON.stringify(response, null, 2));

    if (response.data?.productVariantCreate?.userErrors?.length > 0) {
      const errors = response.data.productVariantCreate.userErrors;
      console.error('[syncVariantToShopify] Shopify user errors:', errors);
      throw new Error(`Shopify variant creation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    const shopifyVariantId = response.data?.productVariantCreate?.productVariant?.id;

    if (shopifyVariantId) {
      console.log('[syncVariantToShopify] Created variant with ID:', shopifyVariantId);

      // Update our database with the Shopify variant ID
      const { error: updateError } = await supabaseAdmin
        .from('variants')
        .update({
          shopify_variant_id: shopifyVariantId
        })
        .eq('id', variantData.id);

      if (updateError) {
        console.error('[syncVariantToShopify] Database update error:', updateError);
        throw new Error(`Failed to update database: ${updateError.message}`);
      }

      console.log('[syncVariantToShopify] Database updated successfully');
      return shopifyVariantId;
    }

    console.error('[syncVariantToShopify] No variant ID in response');
    throw new Error('No variant ID returned from Shopify');
  } catch (error) {
    console.error('[syncVariantToShopify] Error:', error.message);
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
    console.log('[createVariantOnDemand] Starting for variant:', variantId);

    // Get variant details
    const { data: variant, error: fetchError } = await supabaseAdmin
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

    if (fetchError || !variant) {
      console.error('[createVariantOnDemand] Variant not found:', fetchError);
      throw new Error('Variant not found in database');
    }

    console.log('[createVariantOnDemand] Variant data:', {
      id: variant.id,
      productId: variant.product?.shopify_product_id,
      existingShopifyId: variant.shopify_variant_id,
      optionsCount: variant.variant_options?.length
    });

    if (variant.shopify_variant_id) {
      console.log('[createVariantOnDemand] Variant already has Shopify ID');
      return variant.shopify_variant_id; // Already exists
    }

    const productGid = variant.product.shopify_product_id;
    console.log('[createVariantOnDemand] Syncing to Shopify product:', productGid);

    const result = await syncVariantToShopify(variant, productGid);
    console.log('[createVariantOnDemand] Sync completed:', result);

    return result;
  } catch (error) {
    console.error('[createVariantOnDemand] Error:', error.message);
    throw error;
  }
}
