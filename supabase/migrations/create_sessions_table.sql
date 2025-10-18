-- Create shopify_sessions table for storing OAuth sessions
CREATE TABLE IF NOT EXISTS shopify_sessions (
  id BIGSERIAL PRIMARY KEY,
  shop VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  scopes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on shop for faster lookups
CREATE INDEX IF NOT EXISTS idx_shopify_sessions_shop ON shopify_sessions(shop);

-- Add RLS (Row Level Security) policies
ALTER TABLE shopify_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role can manage sessions"
  ON shopify_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_shopify_sessions_updated_at ON shopify_sessions;
CREATE TRIGGER update_shopify_sessions_updated_at
  BEFORE UPDATE ON shopify_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
