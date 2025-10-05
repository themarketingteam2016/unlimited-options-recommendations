import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req, res) {
  try {
    // Check each table
    const tables = [
      'attributes',
      'attribute_values',
      'products',
      'product_attributes',
      'variants',
      'variant_options',
      'product_recommendations',
      'variant_images'
    ];

    const results = {};

    for (const table of tables) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .limit(1);

      results[table] = {
        exists: !error,
        error: error?.message || null,
        hasData: data && data.length > 0
      };
    }

    res.status(200).json({
      success: true,
      tables: results,
      message: 'Database check complete'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
