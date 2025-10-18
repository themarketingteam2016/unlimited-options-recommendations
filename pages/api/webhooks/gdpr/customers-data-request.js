import { withWebhookVerification } from '../../../../lib/webhook-verify';
import { supabaseAdmin } from '../../../../lib/supabase';

/**
 * GDPR Webhook: Customer Data Request
 *
 * Triggered when a merchant requests customer data.
 * You must respond with customer data within 30 days.
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
      orders_requested,
      customer,
      data_request
    } = req.body;

    console.log('[GDPR] Customer data request received:', {
      shop: shop_domain,
      customer_id: customer?.id,
      email: customer?.email,
      request_id: data_request?.id
    });

    // Store the data request for processing
    const { data, error } = await supabaseAdmin
      .from('gdpr_requests')
      .insert({
        request_type: 'customer_data_request',
        shop_domain,
        shop_id: String(shop_id),
        customer_id: customer?.id ? String(customer.id) : null,
        customer_email: customer?.email,
        request_payload: req.body,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[GDPR] Failed to store data request:', error);
      // Still return 200 to Shopify even if storage fails
    } else {
      console.log('[GDPR] Data request stored:', data.id);
    }

    // TODO: Implement actual data collection and email sending
    // For now, we acknowledge the request
    // In production, you should:
    // 1. Collect all customer data from your database
    // 2. Format it according to GDPR requirements
    // 3. Send it to the customer's email within 30 days
    // 4. Update the request status to 'completed'

    // Log for manual processing (temporary)
    console.warn('[GDPR] Manual processing required for customer data request');
    console.warn('[GDPR] Customer email:', customer?.email);
    console.warn('[GDPR] Shop domain:', shop_domain);

    // Shopify requires a 200 response
    return res.status(200).json({
      success: true,
      message: 'Customer data request received and queued for processing'
    });
  } catch (error) {
    console.error('[GDPR] Customer data request error:', error);
    // Still return 200 to Shopify to prevent retries
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
}

// Disable body parser to get raw body for HMAC verification
export const config = {
  api: {
    bodyParser: true, // We can use parsed body since withWebhookVerification handles it
  },
};

export default withWebhookVerification(handler);
