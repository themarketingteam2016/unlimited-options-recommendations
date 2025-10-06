-- Add shopify_variant_id column to variants table
ALTER TABLE variants ADD COLUMN IF NOT EXISTS shopify_variant_id VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_variants_shopify_variant_id ON variants(shopify_variant_id);
