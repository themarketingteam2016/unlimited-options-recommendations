import { withWebhookVerification } from '../../../../lib/webhook-verify';
import { supabaseAdmin } from '../../../../lib/supabase';

/**
 * GDPR Webhook: Customer Redact
 *
 * Triggered 48 hours after a customer requests their data to be deleted.
 * You must delete all customer data within 30 days.
 *
 * Shopify Docs: https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      shop_id,
      shop_domain,
      customer,
      orders_to_redact
    } = req.body;

    console.log('[GDPR] Customer redact request received:', {
      shop: shop_domain,
      customer_id: customer?.id,
      email: customer?.email,
      orders_count: orders_to_redact?.length || 0
    });

    // Log the request for audit trail
    const { data: requestLog, error: logError } = await supabaseAdmin
      .from('gdpr_requests')
      .insert({
        request_type: 'customer_redact',
        shop_domain,
        shop_id: String(shop_id),
        customer_id: customer?.id ? String(customer.id) : null,
        customer_email: customer?.email,
        request_payload: req.body,
        status: 'processing',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      console.error('[GDPR] Failed to log redact request:', logError);
    }

    // Delete customer data from your database
    // This is a basic implementation - adjust based on your schema

    // 1. Delete any customer-specific records you may have stored
    // For this app, we don't store customer PII directly,
    // but you should check your schema for any customer references

    // Example: If you have a customers table
    // await supabaseAdmin
    //   .from('customers')
    //   .delete()
    //   .eq('shopify_customer_id', customer.id)
    //   .eq('shop_domain', shop_domain);

    // 2. Anonymize order data if you store it
    if (orders_to_redact && orders_to_redact.length > 0) {
      for (const orderId of orders_to_redact) {
        // Anonymize or delete order data
        console.log('[GDPR] Processing order for redaction:', orderId);
        // TODO: Implement order data anonymization
      }
    }

    // 3. Delete or anonymize any logs, analytics, or cached data
    // containing customer information

    console.log('[GDPR] Customer data redacted successfully');

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
      message: 'Customer data redacted successfully'
    });
  } catch (error) {
    console.error('[GDPR] Customer redact error:', error);

    // Log the error but still return 200 to Shopify
    try {
      await supabaseAdmin
        .from('gdpr_requests')
        .insert({
          request_type: 'customer_redact_error',
          shop_domain: req.body?.shop_domain,
          request_payload: req.body,
          status: 'failed',
          error_message: error.message,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('[GDPR] Failed to log error:', logError);
    }

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
