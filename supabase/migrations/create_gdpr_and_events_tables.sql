-- Create GDPR requests table for audit trail
CREATE TABLE IF NOT EXISTS gdpr_requests (
  id BIGSERIAL PRIMARY KEY,
  request_type VARCHAR(50) NOT NULL, -- 'customer_data_request', 'customer_redact', 'shop_redact', etc.
  shop_domain VARCHAR(255) NOT NULL,
  shop_id VARCHAR(255),
  customer_id VARCHAR(255),
  customer_email VARCHAR(255),
  request_payload JSONB,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_shop_domain ON gdpr_requests(shop_domain);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type ON gdpr_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_created_at ON gdpr_requests(created_at);

-- Add RLS
ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage GDPR requests"
  ON gdpr_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create app_events table for tracking app lifecycle events
CREATE TABLE IF NOT EXISTS app_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL, -- 'app_installed', 'app_uninstalled', etc.
  shop_domain VARCHAR(255) NOT NULL,
  shop_id VARCHAR(255),
  event_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_events_shop_domain ON app_events(shop_domain);
CREATE INDEX IF NOT EXISTS idx_app_events_type ON app_events(event_type);
CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON app_events(created_at);

-- Add RLS
ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage app events"
  ON app_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add is_active and uninstalled_at columns to shopify_sessions table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='shopify_sessions' AND column_name='is_active') THEN
    ALTER TABLE shopify_sessions ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='shopify_sessions' AND column_name='uninstalled_at') THEN
    ALTER TABLE shopify_sessions ADD COLUMN uninstalled_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add shop_domain column to products table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='products' AND column_name='shop_domain') THEN
    ALTER TABLE products ADD COLUMN shop_domain VARCHAR(255);
    CREATE INDEX idx_products_shop_domain ON products(shop_domain);
  END IF;
END $$;

-- Add shop_domain column to attributes table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='attributes' AND column_name='shop_domain') THEN
    ALTER TABLE attributes ADD COLUMN shop_domain VARCHAR(255);
    CREATE INDEX idx_attributes_shop_domain ON attributes(shop_domain);
  END IF;
END $$;
