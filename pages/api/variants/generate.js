import { supabaseAdmin } from '../../../lib/supabase';

// Generate variant combinations
function generateCombinations(attributes) {
  if (attributes.length === 0) return [];

  const result = [];

  function combine(current, index) {
    if (index === attributes.length) {
      result.push([...current]);
      return;
    }

    const attr = attributes[index];
    for (const value of attr.attribute_values) {
      current.push({
        attribute_id: attr.id,
        attribute_value_id: value.id,
        attribute_name: attr.name,
        value: value.value
      });
      combine(current, index + 1);
      current.pop();
    }
  }

  combine([], 0);
  return result;
}

export default async function handler(req, res) {
  const { productId: shopifyProductId } = req.query;

  if (!shopifyProductId) {
    return res.status(400).json({ error: 'productId query parameter is required' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { mode, selectedValues } = req.body; // mode: 'scratch' or 'modify'

    // Get internal product ID - try UUID first, then shopify_product_id
    let product = null;

    // Check if productId is a UUID (has dashes)
    if (shopifyProductId.includes('-')) {
      const { data } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('id', shopifyProductId)
        .single();
      product = data;
    }

    // If not found or not a UUID, try shopify_product_id
    if (!product) {
      const { data } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('shopify_product_id', shopifyProductId)
        .single();
      product = data;
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productId = product.id;

    // If selectedValues provided, assign those attributes to the product first
    if (selectedValues && Object.keys(selectedValues).length > 0) {
      const attributeIds = Object.keys(selectedValues);

      console.log('Assigning attributes to product:', attributeIds);

      // Delete existing product attributes
      await supabaseAdmin
        .from('product_attributes')
        .delete()
        .eq('product_id', productId);

      // Insert new product attributes
      const attrInserts = attributeIds.map(attrId => ({
        product_id: productId,
        attribute_id: attrId
      }));

      await supabaseAdmin
        .from('product_attributes')
        .insert(attrInserts);

      console.log('Attributes assigned successfully');
    }

    // Get product attributes with values
    const { data: productAttrs, error: attrError } = await supabaseAdmin
      .from('product_attributes')
      .select(`
        attribute:attributes (
          id,
          name,
          attribute_values (
            id,
            value
          )
        )
      `)
      .eq('product_id', productId);

    if (attrError) throw attrError;

    const attributes = productAttrs
      .map(pa => pa.attribute)
      .filter(attr => attr && attr.attribute_values && attr.attribute_values.length > 0);

    console.log('Product attributes found:', attributes.length);

    if (attributes.length === 0) {
      return res.status(400).json({ error: 'No attributes with values found for this product. Please select attributes and their values first.' });
    }

    // Filter attributes based on selected values if provided
    let filteredAttributes = attributes;
    if (selectedValues && Object.keys(selectedValues).length > 0) {
      console.log('Filtering attributes with selectedValues:', selectedValues);
      filteredAttributes = attributes.map(attr => {
        const filteredValues = attr.attribute_values.filter(val =>
          selectedValues[attr.id]?.includes(val.id)
        );
        console.log(`Attribute ${attr.name} (${attr.id}): ${attr.attribute_values.length} values -> ${filteredValues.length} filtered`);
        return {
          ...attr,
          attribute_values: filteredValues
        };
      }).filter(attr => attr.attribute_values.length > 0);

      console.log('Filtered attributes count:', filteredAttributes.length);
    }

    if (filteredAttributes.length === 0) {
      return res.status(400).json({ error: 'No attribute values selected. Please select at least one value for each attribute.' });
    }

    // Generate combinations
    const combinations = generateCombinations(filteredAttributes);

    console.log(`[Generate] Mode: ${mode}, Total combinations: ${combinations.length}`);

    if (mode === 'scratch') {
      // Delete all existing variant_options first (child records)
      const { data: existingVariants } = await supabaseAdmin
        .from('variants')
        .select('id')
        .eq('product_id', productId);

      if (existingVariants && existingVariants.length > 0) {
        const variantIds = existingVariants.map(v => v.id);
        await supabaseAdmin
          .from('variant_options')
          .delete()
          .in('variant_id', variantIds);
      }

      // Delete existing variants
      await supabaseAdmin
        .from('variants')
        .delete()
        .eq('product_id', productId);

      console.log('[Generate] Scratch mode: deleted existing variants');
    }

    // Get all existing combination keys for this product (for modify mode)
    let existingKeys = new Set();
    if (mode === 'modify') {
      const { data: existingVariants } = await supabaseAdmin
        .from('variants')
        .select('combination_key')
        .eq('product_id', productId);

      if (existingVariants) {
        existingKeys = new Set(existingVariants.map(v => v.combination_key));
      }
      console.log(`[Generate] Modify mode: found ${existingKeys.size} existing variants`);
    }

    // Insert only new variants
    const newVariants = [];
    let skippedCount = 0;

    for (const combo of combinations) {
      const combinationKey = combo
        .map(c => `${c.attribute_name}:${c.value}`)
        .sort()
        .join('|');

      // Skip if variant already exists (modify mode)
      if (mode === 'modify' && existingKeys.has(combinationKey)) {
        skippedCount++;
        continue;
      }

      // Create new variant
      const { data: variant, error: variantError } = await supabaseAdmin
        .from('variants')
        .insert({
          product_id: productId,
          combination_key: combinationKey,
          price: 0,
          stock_quantity: 0,
          is_active: true
        })
        .select()
        .single();

      if (!variantError && variant) {
        // Insert variant options
        const optionInserts = combo.map(c => ({
          variant_id: variant.id,
          attribute_id: c.attribute_id,
          attribute_value_id: c.attribute_value_id
        }));

        await supabaseAdmin
          .from('variant_options')
          .insert(optionInserts);

        newVariants.push(variant);
      }
    }

    console.log(`[Generate] Created ${newVariants.length} new variants, skipped ${skippedCount} existing`);

    res.status(200).json({
      success: true,
      variants: newVariants,
      created: newVariants.length,
      skipped: skippedCount,
      total: combinations.length
    });
  } catch (error) {
    console.error('Failed to generate variants:', error);
    res.status(500).json({ error: error.message });
  }
}
