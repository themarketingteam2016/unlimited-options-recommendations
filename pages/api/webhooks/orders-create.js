import { supabaseAdmin } from '../../../lib/supabase';
import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Verify Shopify webhook signature
function verifyWebhook(req, body) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const secret = process.env.SHOPIFY_API_SECRET;

  if (!hmac || !secret) {
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}

// Get raw body
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await getRawBody(req);

    // Verify webhook signature
    if (!verifyWebhook(req, rawBody)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const order = JSON.parse(rawBody);
    console.log('Order created:', order.id, order.name);

    // Process each line item
    for (const lineItem of order.line_items) {
      const variantGid = `gid://shopify/ProductVariant/${lineItem.variant_id}`;

      // Find our variant by shopify_variant_id
      const { data: variant } = await supabaseAdmin
        .from('variants')
        .select('id, stock_quantity')
        .eq('shopify_variant_id', variantGid)
        .single();

      if (variant) {
        // Decrease stock
        const newStock = Math.max(0, variant.stock_quantity - lineItem.quantity);

        await supabaseAdmin
          .from('variants')
          .update({ stock_quantity: newStock })
          .eq('id', variant.id);

        console.log(`Updated stock for variant ${variant.id}: ${variant.stock_quantity} → ${newStock}`);
      } else {
        console.log(`Variant not found in database: ${variantGid}`);
      }
    }

    // Store order reference (optional)
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_product_id', `gid://shopify/Product/${order.line_items[0]?.product_id}`)
      .single();

    if (product) {
      // You could store order details here for reporting
      console.log('Order processed successfully for product:', product.id);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Order webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}
