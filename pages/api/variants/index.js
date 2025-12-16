import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { productId: shopifyProductId } = req.query;

  if (!shopifyProductId) {
    return res.status(400).json({ error: 'productId query parameter is required' });
  }

  if (req.method === 'GET') {
    try {
      // Try to get product by internal UUID first, then by shopify_product_id
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

      const { data, error } = await supabaseAdmin
        .from('variants')
        .select(`
          *,
          variant_options (
            id,
            attribute_id,
            attribute_value_id,
            attribute:attributes (
              id,
              name
            ),
            attribute_value:attribute_values (
              id,
              value,
              image_url
            )
          )
        `)
        .eq('product_id', product.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      res.status(200).json(data || []);
    } catch (error) {
      console.error('Failed to fetch variants:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { variants } = req.body;

      if (!variants || !Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({ error: 'No variants provided' });
      }

      console.log(`[Variants PUT] Updating ${variants.length} variants`);

      // For large batches (200+), use optimized bulk update
      const BATCH_SIZE = 50; // Larger batch size for efficiency
      const results = { success: 0, failed: 0, errors: [] };

      // Process in batches to avoid overwhelming the database
      for (let i = 0; i < variants.length; i += BATCH_SIZE) {
        const batch = variants.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(variants.length / BATCH_SIZE);

        console.log(`[Variants PUT] Processing batch ${batchNumber}/${totalBatches} (${batch.length} variants)`);

        // Process batch in parallel with Promise.allSettled for better error handling
        const batchPromises = batch.map(async (variant) => {
          try {
            // Prepare update data - only include fields that are defined
            const updateData = {};
            if (variant.price !== undefined) updateData.price = variant.price;
            if (variant.compare_at_price !== undefined) updateData.compare_at_price = variant.compare_at_price;
            if (variant.cost !== undefined) updateData.cost = variant.cost;
            if (variant.sku !== undefined) updateData.sku = variant.sku;
            if (variant.stock_quantity !== undefined) updateData.stock_quantity = variant.stock_quantity;
            if (variant.is_active !== undefined) updateData.is_active = variant.is_active;
            if (variant.image_url !== undefined) updateData.image_url = variant.image_url;

            // Skip if no fields to update
            if (Object.keys(updateData).length === 0) {
              return { success: true, id: variant.id, skipped: true };
            }

            const { error } = await supabaseAdmin
              .from('variants')
              .update(updateData)
              .eq('id', variant.id);

            if (error) {
              console.error(`[Variants PUT] Error updating variant ${variant.id}:`, error);
              return { success: false, id: variant.id, error: error.message };
            }

            return { success: true, id: variant.id };
          } catch (err) {
            console.error(`[Variants PUT] Exception updating variant ${variant.id}:`, err);
            return { success: false, id: variant.id, error: err.message };
          }
        });

        // Use allSettled to ensure all promises complete even if some reject
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              results.success++;
            } else {
              results.failed++;
              results.errors.push({ id: result.value.id, error: result.value.error });
            }
          } else {
            // Promise rejected
            results.failed++;
            results.errors.push({ id: batch[idx]?.id, error: result.reason?.message || 'Unknown error' });
          }
        });
      }

      console.log(`[Variants PUT] Completed: ${results.success} success, ${results.failed} failed`);

      if (results.failed > 0 && results.success === 0) {
        // All failed
        res.status(500).json({
          error: 'All variant updates failed',
          details: results.errors.slice(0, 10) // Limit error details to prevent huge response
        });
      } else if (results.failed > 0) {
        // Partial success
        res.status(207).json({
          success: true,
          partial: true,
          updated: results.success,
          failed: results.failed,
          errors: results.errors.slice(0, 10) // Limit error details
        });
      } else {
        // All succeeded
        res.status(200).json({
          success: true,
          updated: results.success
        });
      }
    } catch (error) {
      console.error('Failed to update variants:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { variantIds } = req.body;

      if (!variantIds || !Array.isArray(variantIds) || variantIds.length === 0) {
        return res.status(400).json({ error: 'variantIds array is required' });
      }

      console.log('[Variants DELETE] Deleting variants:', variantIds);

      // First delete variant_options (child records)
      const { error: optionsError } = await supabaseAdmin
        .from('variant_options')
        .delete()
        .in('variant_id', variantIds);

      if (optionsError) {
        console.error('[Variants DELETE] Error deleting variant_options:', optionsError);
        // Continue anyway - options might not exist
      }

      // Then delete the variants
      const { data: deleted, error } = await supabaseAdmin
        .from('variants')
        .delete()
        .in('id', variantIds)
        .select('id');

      if (error) throw error;

      console.log('[Variants DELETE] Deleted variants:', deleted?.length || 0);

      res.status(200).json({
        success: true,
        deleted: deleted?.length || 0
      });
    } catch (error) {
      console.error('Failed to delete variants:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
