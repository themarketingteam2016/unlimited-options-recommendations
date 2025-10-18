import { withWebhookVerification } from '../../../lib/webhook-verify';
import { supabaseAdmin } from '../../../lib/supabase';

/**
 * App Uninstalled Webhook
 *
 * Triggered when a merchant uninstalls your app.
 * Use this to clean up resources and mark the shop as inactive.
 *
 * NOTE: Shop data deletion happens via the shop/redact GDPR webhook (48 hours later).
 * This webhook is for immediate cleanup and status updates.
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: shop_id, domain: shop_domain, name } = req.body;

    console.log('[App Uninstalled] Webhook received:', {
      shop_id,
      shop_domain,
      name
    });

    // 1. Mark session as inactive (don't delete yet - wait for GDPR webhook)
    const { error: sessionError } = await supabaseAdmin
      .from('shopify_sessions')
      .update({
        is_active: false,
        uninstalled_at: new Date().toISOString()
      })
      .eq('shop', shop_domain);

    if (sessionError) {
      console.error('[App Uninstalled] Failed to update session:', sessionError);
    } else {
      console.log('[App Uninstalled] ✓ Session marked as inactive');
    }

    // 2. Log the uninstall event
    const { error: logError } = await supabaseAdmin
      .from('app_events')
      .insert({
        event_type: 'app_uninstalled',
        shop_domain,
        shop_id: String(shop_id),
        event_data: req.body,
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error('[App Uninstalled] Failed to log event:', logError);
    }

    // 3. Cancel any scheduled jobs or background tasks for this shop
    // TODO: Implement if you have background jobs

    // 4. Send notification to your team (optional)
    console.log(`[App Uninstalled] Shop ${shop_domain} uninstalled the app`);

    // 5. Analytics tracking (optional)
    // Track why shops are uninstalling, retention metrics, etc.

    console.log('[App Uninstalled] Cleanup completed successfully');

    // Shopify requires a 200 response
    return res.status(200).json({
      success: true,
      message: 'App uninstall processed successfully'
    });
  } catch (error) {
    console.error('[App Uninstalled] Error:', error);

    // Log the error
    try {
      await supabaseAdmin
        .from('app_events')
        .insert({
          event_type: 'app_uninstalled_error',
          shop_domain: req.body?.domain,
          event_data: req.body,
          error_message: error.message,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('[App Uninstalled] Failed to log error:', logError);
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
