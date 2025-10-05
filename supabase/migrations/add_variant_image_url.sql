-- Add image_url column to variants table
ALTER TABLE variants ADD COLUMN IF NOT EXISTS image_url TEXT;
