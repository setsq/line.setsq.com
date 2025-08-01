-- Migration to add missing columns to existing table

-- Add processing_status column if it doesn't exist
ALTER TABLE chat.line_webhook_events 
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'pending';

-- Add other potentially missing columns
ALTER TABLE chat.line_webhook_events 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE chat.line_webhook_events 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

ALTER TABLE chat.line_webhook_events 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_webhook_status ON chat.line_webhook_events(processing_status);

-- Add any missing constraints
ALTER TABLE chat.line_webhook_events 
ADD CONSTRAINT IF NOT EXISTS check_processing_status 
CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));

-- Show updated table structure
\d chat.line_webhook_events