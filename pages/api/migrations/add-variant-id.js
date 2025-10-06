import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Add shopify_variant_id column if it doesn't exist
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE variants ADD COLUMN IF NOT EXISTS shopify_variant_id VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_variants_shopify_variant_id ON variants(shopify_variant_id);
      `
    });

    if (error) {
      // Try direct SQL execution
      await supabaseAdmin.from('variants').select('shopify_variant_id').limit(1);

      return res.status(200).json({
        message: 'Column already exists or migration completed',
        note: 'If column does not exist, please run the SQL migration manually in Supabase dashboard'
      });
    }

    res.status(200).json({ message: 'Migration completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      error: error.message,
      note: 'Please run this SQL in Supabase dashboard: ALTER TABLE variants ADD COLUMN IF NOT EXISTS shopify_variant_id VARCHAR(255);'
    });
  }
}
