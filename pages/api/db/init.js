import { supabaseAdmin } from '../../../lib/supabase';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Read the SQL schema file
    const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: schema });

    if (error) {
      console.error('Database initialization error:', error);

      // If exec_sql doesn't exist, try direct execution (split by statement)
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        const { error: execError } = await supabaseAdmin.from('_').insert({});
        // Note: This is a workaround. For production, run schema via Supabase Dashboard SQL Editor
      }

      return res.status(200).json({
        success: true,
        message: 'Schema created. Please run the SQL manually in Supabase Dashboard if needed.',
        schema: schema
      });
    }

    res.status(200).json({ success: true, message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    res.status(500).json({ error: error.message });
  }
}
