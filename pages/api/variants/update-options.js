import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { productId: shopifyProductId } = req.query;

  if (!shopifyProductId) {
    return res.status(400).json({ error: 'productId query parameter is required' });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { variantId, options, combinationKey } = req.body;

    if (!variantId || !options || !combinationKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Updating variant options for:', variantId);
    console.log('New combination key:', combinationKey);

    // Get internal product ID from shopify_product_id
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_product_id', shopifyProductId)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if variant with this combination already exists (excluding current variant)
    const { data: existing } = await supabaseAdmin
      .from('variants')
      .select('id')
      .eq('product_id', product.id)
      .eq('combination_key', combinationKey)
      .neq('id', variantId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'A variant with this combination already exists' });
    }

    // Update variant combination key
    const { error: variantError } = await supabaseAdmin
      .from('variants')
      .update({ combination_key: combinationKey })
      .eq('id', variantId);

    if (variantError) throw variantError;

    // Delete existing variant options
    await supabaseAdmin
      .from('variant_options')
      .delete()
      .eq('variant_id', variantId);

    // Insert new variant options
    const optionInserts = options.map(opt => ({
      variant_id: variantId,
      attribute_id: opt.attribute_id,
      attribute_value_id: opt.attribute_value_id
    }));

    const { error: optionsError } = await supabaseAdmin
      .from('variant_options')
      .insert(optionInserts);

    if (optionsError) throw optionsError;

    console.log('Variant options updated successfully');

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to update variant options:', error);
    res.status(500).json({ error: error.message });
  }
}
