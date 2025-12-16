import { withOptionalAuth } from '../../../lib/auth-middleware';
import { supabaseAdmin } from '../../../lib/supabase';

async function handler(req, res) {
  const { productId: shopifyProductId } = req.query;

  if (!shopifyProductId) {
    return res.status(400).json({ error: 'productId query parameter is required' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { combination } = req.body;

    if (!combination || combination.length === 0) {
      return res.status(400).json({ error: 'Combination is required' });
    }

    console.log('Creating manual variant for:', shopifyProductId);
    console.log('Combination:', combination);

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

    // Create combination key
    const combinationKey = combination
      .map(c => `${c.attribute_name}:${c.value}`)
      .sort()
      .join('|');

    console.log('Combination key:', combinationKey);

    // Check if variant already exists
    const { data: existing } = await supabaseAdmin
      .from('variants')
      .select('id')
      .eq('product_id', productId)
      .eq('combination_key', combinationKey)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'This variant combination already exists' });
    }

    // Create the variant
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

    if (variantError) throw variantError;

    console.log('Variant created:', variant.id);

    // Insert variant options
    const optionInserts = combination.map(c => ({
      variant_id: variant.id,
      attribute_id: c.attribute_id,
      attribute_value_id: c.attribute_value_id
    }));

    const { error: optionsError } = await supabaseAdmin
      .from('variant_options')
      .insert(optionInserts);

    if (optionsError) throw optionsError;

    console.log('Variant options created successfully');

    res.status(200).json({ success: true, variant });
  } catch (error) {
    console.error('Failed to create variant:', error);
    res.status(500).json({ error: error.message });
  }
}

export default withOptionalAuth(handler);
