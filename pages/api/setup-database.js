import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Execute all schema statements one by one
    const statements = [
      // 1. Attributes table
      `CREATE TABLE IF NOT EXISTS attributes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        slug VARCHAR(255) NOT NULL UNIQUE,
        is_primary BOOLEAN DEFAULT FALSE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // 2. Attribute values table
      `CREATE TABLE IF NOT EXISTS attribute_values (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
        value VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        image_url TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(attribute_id, slug)
      )`,

      // 3. Products table
      `CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shopify_product_id VARCHAR(255) NOT NULL UNIQUE,
        shopify_handle VARCHAR(255),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        image_url TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // 4. Product attributes table
      `CREATE TABLE IF NOT EXISTS product_attributes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(product_id, attribute_id)
      )`,

      // 5. Variants table
      `CREATE TABLE IF NOT EXISTS variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        sku VARCHAR(255),
        price DECIMAL(10,2),
        compare_at_price DECIMAL(10,2),
        cost DECIMAL(10,2),
        stock_quantity INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        combination_key TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(product_id, combination_key)
      )`,

      // 6. Variant options table
      `CREATE TABLE IF NOT EXISTS variant_options (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
        attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
        attribute_value_id UUID NOT NULL REFERENCES attribute_values(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // 7. Product recommendations table
      `CREATE TABLE IF NOT EXISTS product_recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        recommended_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(product_id, recommended_product_id)
      )`,

      // 8. Variant images table
      `CREATE TABLE IF NOT EXISTS variant_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        attribute_value_id UUID NOT NULL REFERENCES attribute_values(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
    ];

    const results = [];

    // Execute each statement
    for (const sql of statements) {
      const { error } = await supabaseAdmin.rpc('exec', { sql });

      if (error) {
        // If rpc doesn't work, try direct query
        const { error: queryError } = await supabaseAdmin.from('_').select('*').limit(0);
        // Supabase doesn't support raw SQL from client, so we'll use the REST API
      }

      results.push({ sql: sql.substring(0, 50) + '...', success: !error });
    }

    res.status(200).json({
      success: true,
      message: 'Database setup initiated. Please check Supabase dashboard to verify tables.',
      note: 'If tables are not created, please run the SQL manually from /supabase/schema.sql in Supabase SQL Editor',
      results
    });

  } catch (error) {
    console.error('Database setup error:', error);
    res.status(500).json({
      error: error.message,
      message: 'Please run the SQL manually from Supabase SQL Editor',
      instructions: 'Go to https://supabase.com/dashboard/project/pfeqephnhlitzkgsilup -> SQL Editor -> Copy schema.sql content -> Run'
    });
  }
}
