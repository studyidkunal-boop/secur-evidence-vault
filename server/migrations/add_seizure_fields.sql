-- Migration: Add legal seizure requirement fields to evidence table
-- Applied to: evidence table
-- Date: 2026-11-15

ALTER TABLE evidence ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS seizure_address TEXT;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS witness_name VARCHAR(255);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS witness_contact VARCHAR(100);

-- Backfill any existing records with sensible defaults
UPDATE evidence SET category = 'Digital' WHERE category IS NULL;
UPDATE evidence SET seizure_address = 'Location Not Recorded (Legacy Ingestion)' WHERE seizure_address IS NULL;
UPDATE evidence SET witness_name = 'Official Police Witness (Legacy Ingestion)' WHERE witness_name IS NULL;

