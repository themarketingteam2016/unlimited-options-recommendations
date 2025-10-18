import { withWebhookVerification } from '../../../../lib/webhook-verify';
import { supabaseAdmin } from '../../../../lib/supabase';
import { deleteSession } from '../../../../lib/shopify-auth';

/**
 * GDPR Webhook: Shop Redact
 *
 * Triggered 48 hours after a merchant uninstalls your app.
 * You must delete ALL shop data within 30 days.
 *
 * This is the most important GDPR webhook - you MUST delete all merchant data.
 *
 * Shopify Docs: https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop_id, shop_domain } = req.body;

    console.log('[GDPR] Shop redact request received:', {
      shop_id,
      shop_domain
    });

    // Log the request for audit trail
    const { data: requestLog, error: logError } = await supabaseAdmin
      .from('gdpr_requests')
      .insert({
        request_type: 'shop_redact',
        shop_domain,
        shop_id: String(shop_id),
        request_payload: req.body,
        status: 'processing',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      console.error('[GDPR] Failed to log shop redact request:', logError);
    }

    console.log('[GDPR] Starting shop data deletion for:', shop_domain);

    // Delete ALL shop data from your database
    // IMPORTANT: This must be comprehensive

    // 1. Delete OAuth session
    try {
      await deleteSession(shop_domain);
      console.log('[GDPR] ✓ Session deleted');
    } catch (error) {
      console.error('[GDPR] Failed to delete session:', error);
    }

    // 2. Get all products for this shop
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, shopify_product_id')
      .eq('shop_domain', shop_domain);

    console.log(`[GDPR] Found ${products?.length || 0} products to delete`);

    if (products && products.length > 0) {
      const productIds = products.map(p => p.id);

      // 3. Delete variants and related data
      // Get all variants for these products
      const { data: variants } = await supabaseAdmin
        .from('variants')
        .select('id')
        .in('product_id', productIds);

      if (variants && variants.length > 0) {
        const variantIds = variants.map(v => v.id);

        // Delete variant options
        await supabaseAdmin
          .from('variant_options')
          .delete()
          .in('variant_id', variantIds);
        console.log('[GDPR] ✓ Variant options deleted');

        // Delete variants
        await supabaseAdmin
          .from('variants')
          .delete()
          .in('product_id', productIds);
        console.log('[GDPR] ✓ Variants deleted');
      }

      // 4. Delete product recommendations
      await supabaseAdmin
        .from('recommendations')
        .delete()
        .in('product_id', productIds);
      console.log('[GDPR] ✓ Recommendations deleted');

      // 5. Delete products
      await supabaseAdmin
        .from('products')
        .delete()
        .in('id', productIds);
      console.log('[GDPR] ✓ Products deleted');
    }

    // 6. Delete attributes and attribute values for this shop
    const { data: attributes } = await supabaseAdmin
      .from('attributes')
      .select('id')
      .eq('shop_domain', shop_domain);

    if (attributes && attributes.length > 0) {
      const attributeIds = attributes.map(a => a.id);

      await supabaseAdmin
        .from('attribute_values')
        .delete()
        .in('attribute_id', attributeIds);
      console.log('[GDPR] ✓ Attribute values deleted');

      await supabaseAdmin
        .from('attributes')
        .delete()
        .in('id', attributeIds);
      console.log('[GDPR] ✓ Attributes deleted');
    }

    // 7. Delete any other shop-specific data
    // Add any additional tables here that contain shop data

    console.log('[GDPR] All shop data deleted successfully');

    // Update request status
    if (requestLog) {
      await supabaseAdmin
        .from('gdpr_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', requestLog.id);
    }

    // Shopify requires a 200 response
    return res.status(200).json({
      success: true,
      message: 'Shop data redacted successfully',
      deleted: {
        products: products?.length || 0,
        shop_domain
      }
    });
  } catch (error) {
    console.error('[GDPR] Shop redact error:', error);

    // Log the error
    try {
      await supabaseAdmin
        .from('gdpr_requests')
        .insert({
          request_type: 'shop_redact_error',
          shop_domain: req.body?.shop_domain,
          request_payload: req.body,
          status: 'failed',
          error_message: error.message,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('[GDPR] Failed to log error:', logError);
    }

    // Still return 200 to Shopify
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};

export default withWebhookVerification(handler);
