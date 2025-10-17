-- Add is_default column to attribute_values table
-- This allows marking one value as the default for each attribute

ALTER TABLE attribute_values
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Add an index for faster queries on default values
CREATE INDEX IF NOT EXISTS idx_attribute_values_is_default
ON attribute_values(attribute_id, is_default)
WHERE is_default = TRUE;

-- Add a comment explaining the column
COMMENT ON COLUMN attribute_values.is_default IS 'Indicates if this value should be pre-selected on the product page';

-- Optional: Create a function to ensure only one default value per attribute
-- This will automatically set is_default to FALSE for other values when one is set to TRUE
CREATE OR REPLACE FUNCTION ensure_single_default_value()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new/updated value is being set as default
  IF NEW.is_default = TRUE THEN
    -- Set all other values for this attribute to non-default
    UPDATE attribute_values
    SET is_default = FALSE
    WHERE attribute_id = NEW.attribute_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single default value
DROP TRIGGER IF EXISTS trigger_ensure_single_default_value ON attribute_values;
CREATE TRIGGER trigger_ensure_single_default_value
  BEFORE INSERT OR UPDATE ON attribute_values
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION ensure_single_default_value();
