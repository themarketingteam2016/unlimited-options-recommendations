import { withAuth } from '../../../lib/auth-middleware';
import { supabaseAdmin } from '../../../lib/supabase';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productId, variants } = req.body;
    const { shop, shopifyClient } = req.session;

    if (!productId || !variants || variants.length === 0) {
      return res.status(400).json({ error: 'productId and variants are required' });
    }

    console.log(`[Variants Save] Saving ${variants.length} variants for product ${productId}`);

    // Get internal product ID from Shopify product ID
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_product_id', productId)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found in database' });
    }

    const internalProductId = product.id;

    // Save each variant to database
    for (const variant of variants) {
      const { combination, price, stock_quantity, sku, shopify_variant_id } = variant;

      // Create combination key for uniqueness
      const combinationKey = combination
        .map(c => `${c.attribute_name}:${c.value}`)
        .sort()
        .join('|');

      // Upsert variant
      const { data: savedVariant, error: variantError } = await supabaseAdmin
        .from('variants')
        .upsert({
          product_id: internalProductId,
          combination_key: combinationKey,
          price: price || 0,
          stock_quantity: stock_quantity || 0,
          sku: sku || null,
          shopify_variant_id: shopify_variant_id || null,
          is_active: true
        }, {
          onConflict: 'product_id,combination_key'
        })
        .select()
        .single();

      if (variantError) {
        console.error('[Variants Save] Error saving variant:', variantError);
        throw variantError;
      }

      // Delete existing variant options
      await supabaseAdmin
        .from('variant_options')
        .delete()
        .eq('variant_id', savedVariant.id);

      // Insert new variant options
      const optionInserts = combination.map(c => ({
        variant_id: savedVariant.id,
        attribute_id: c.attribute_id,
        attribute_value_id: c.attribute_value_id
      }));

      const { error: optionsError } = await supabaseAdmin
        .from('variant_options')
        .insert(optionInserts);

      if (optionsError) {
        console.error('[Variants Save] Error saving variant options:', optionsError);
        throw optionsError;
      }
    }

    // Optionally save to Shopify metafields for backup
    try {
      const mutation = `
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
              metafields(first: 10) {
                edges {
                  node {
                    key
                    value
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
          id: productId,
          metafields: [
            {
              namespace: 'unlimited_options',
              key: 'variants',
              value: JSON.stringify(variants),
              type: 'json'
            }
          ]
        }
      };

      await shopifyClient.graphql(mutation, variables);
      console.log('[Variants Save] Saved to Shopify metafields');
    } catch (metafieldError) {
      console.warn('[Variants Save] Failed to save to metafields:', metafieldError.message);
      // Continue even if metafield save fails
    }

    res.status(200).json({ success: true, count: variants.length });
  } catch (error) {
    console.error('[Variants Save] Failed to save variants:', error);
    res.status(500).json({ error: error.message });
  }
}

export default withAuth(handler);
