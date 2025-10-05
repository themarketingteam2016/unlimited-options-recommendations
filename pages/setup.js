import { useState } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Setup() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const setupDatabase = async () => {
    setLoading(true);
    setStatus('Setting up database...');

    try {
      // The SQL to execute
      const sql = `
-- 1. ATTRIBUTES TABLE
CREATE TABLE IF NOT EXISTS attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ATTRIBUTE VALUES TABLE
CREATE TABLE IF NOT EXISTS attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  value VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(attribute_id, slug)
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_product_id VARCHAR(255) NOT NULL UNIQUE,
  shopify_handle VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  image_url TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PRODUCT ATTRIBUTES TABLE
CREATE TABLE IF NOT EXISTS product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, attribute_id)
);

-- 5. VARIANTS TABLE
CREATE TABLE IF NOT EXISTS variants (
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
);

-- 6. VARIANT OPTIONS TABLE
CREATE TABLE IF NOT EXISTS variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  attribute_value_id UUID NOT NULL REFERENCES attribute_values(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. PRODUCT RECOMMENDATIONS TABLE
CREATE TABLE IF NOT EXISTS product_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommended_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, recommended_product_id)
);

-- 8. VARIANT IMAGES TABLE
CREATE TABLE IF NOT EXISTS variant_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_value_id UUID NOT NULL REFERENCES attribute_values(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_attribute_values_attribute_id ON attribute_values(attribute_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_options_variant_id ON variant_options(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_recommendations_product_id ON product_recommendations(product_id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_attributes_updated_at BEFORE UPDATE ON attributes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attribute_values_updated_at BEFORE UPDATE ON attribute_values FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY
ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_images ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Allow all for service role" ON attributes FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON attribute_values FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON products FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON product_attributes FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON variants FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON variant_options FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON product_recommendations FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON variant_images FOR ALL USING (true);
      `.trim();

      setStatus('Please follow these steps:\n\n1. Copy the SQL below\n2. Go to Supabase Dashboard\n3. Open SQL Editor\n4. Paste and Run\n\nSQL is ready to copy! ⬇️');

    } catch (error) {
      setStatus('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copySQL = () => {
    const sql = document.getElementById('sql-content').textContent;
    navigator.clipboard.writeText(sql);
    alert('SQL copied to clipboard! Now go to Supabase SQL Editor and paste it.');
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Database Setup</title>
      </Head>

      <main className={styles.main}>
        <h1>🚀 Database Setup</h1>
        <p>Click the button below to get the SQL, then run it in Supabase</p>

        <button
          onClick={setupDatabase}
          disabled={loading}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            background: '#008060',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          {loading ? 'Preparing...' : 'Get Setup SQL'}
        </button>

        {status && (
          <div style={{ marginTop: '30px', whiteSpace: 'pre-line' }}>
            <p>{status}</p>
            {status.includes('ready to copy') && (
              <>
                <button
                  onClick={copySQL}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    background: '#008060',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginTop: '10px'
                  }}
                >
                  📋 Copy SQL to Clipboard
                </button>

                <div
                  id="sql-content"
                  style={{
                    marginTop: '20px',
                    padding: '20px',
                    background: '#f6f6f7',
                    borderRadius: '8px',
                    maxHeight: '400px',
                    overflow: 'auto',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre'
                  }}
                >
{`-- UNLIMITED VARIANTS DATABASE SCHEMA
CREATE TABLE IF NOT EXISTS attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  value VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(attribute_id, slug)
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_product_id VARCHAR(255) NOT NULL UNIQUE,
  shopify_handle VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  image_url TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, attribute_id)
);

CREATE TABLE IF NOT EXISTS variants (
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
);

CREATE TABLE IF NOT EXISTS variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  attribute_value_id UUID NOT NULL REFERENCES attribute_values(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommended_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, recommended_product_id)
);

CREATE TABLE IF NOT EXISTS variant_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_value_id UUID NOT NULL REFERENCES attribute_values(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attribute_values_attribute_id ON attribute_values(attribute_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_options_variant_id ON variant_options(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_recommendations_product_id ON product_recommendations(product_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_attributes_updated_at BEFORE UPDATE ON attributes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attribute_values_updated_at BEFORE UPDATE ON attribute_values FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON attributes FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON attribute_values FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON products FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON product_attributes FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON variants FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON variant_options FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON product_recommendations FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON variant_images FOR ALL USING (true);`}
                </div>

                <div style={{ marginTop: '20px', padding: '15px', background: '#d1f0e5', borderRadius: '6px' }}>
                  <h3>📝 Next Steps:</h3>
                  <ol style={{ marginLeft: '20px', marginTop: '10px' }}>
                    <li>Click "Copy SQL to Clipboard" above</li>
                    <li>Go to: <a href="https://supabase.com/dashboard/project/pfeqephnhlitzkgsilup" target="_blank" rel="noopener">Supabase Dashboard</a></li>
                    <li>Click "SQL Editor" in left sidebar</li>
                    <li>Click "New Query"</li>
                    <li>Paste the SQL and click "RUN"</li>
                    <li>Done! Return to the app</li>
                  </ol>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
