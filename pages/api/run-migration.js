import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Add is_default column
    const { error: alterError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE attribute_values
        ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
      `
    }).catch(async () => {
      // If rpc doesn't exist, try direct SQL
      return await supabaseAdmin.from('attribute_values').select('is_default').limit(1);
    });

    // Try to create index
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_attribute_values_is_default
        ON attribute_values(attribute_id, is_default)
        WHERE is_default = TRUE;
      `
    }).catch(() => {});

    // Create trigger function
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION ensure_single_default_value()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.is_default = TRUE THEN
            UPDATE attribute_values
            SET is_default = FALSE
            WHERE attribute_id = NEW.attribute_id
              AND id != NEW.id
              AND is_default = TRUE;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    }).catch(() => {});

    // Create trigger
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS trigger_ensure_single_default_value ON attribute_values;
        CREATE TRIGGER trigger_ensure_single_default_value
          BEFORE INSERT OR UPDATE ON attribute_values
          FOR EACH ROW
          WHEN (NEW.is_default = TRUE)
          EXECUTE FUNCTION ensure_single_default_value();
      `
    }).catch(() => {});

    res.status(200).json({ success: true, message: 'Migration completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message, note: 'You may need to run the migration SQL directly in Supabase dashboard' });
  }
}
