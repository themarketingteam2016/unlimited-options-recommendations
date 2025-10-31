-- Add default_value_id column to product_attributes table
-- This allows each product to have its own default value for each attribute

ALTER TABLE product_attributes
ADD COLUMN IF NOT EXISTS default_value_id UUID REFERENCES attribute_values(id) ON DELETE SET NULL;

-- Add an index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_attributes_default_value
ON product_attributes(default_value_id)
WHERE default_value_id IS NOT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN product_attributes.default_value_id IS 'The default attribute value for this product. Overrides the global is_default flag on attribute_values.';

-- Optional: Create a function to validate that the default_value_id belongs to the correct attribute
CREATE OR REPLACE FUNCTION validate_product_attribute_default()
RETURNS TRIGGER AS $$
BEGIN
  -- If a default_value_id is being set
  IF NEW.default_value_id IS NOT NULL THEN
    -- Verify that the value belongs to the attribute
    IF NOT EXISTS (
      SELECT 1 FROM attribute_values
      WHERE id = NEW.default_value_id
      AND attribute_id = NEW.attribute_id
    ) THEN
      RAISE EXCEPTION 'default_value_id must reference a value that belongs to the specified attribute';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce validation
DROP TRIGGER IF EXISTS trigger_validate_product_attribute_default ON product_attributes;
CREATE TRIGGER trigger_validate_product_attribute_default
  BEFORE INSERT OR UPDATE ON product_attributes
  FOR EACH ROW
  WHEN (NEW.default_value_id IS NOT NULL)
  EXECUTE FUNCTION validate_product_attribute_default();
