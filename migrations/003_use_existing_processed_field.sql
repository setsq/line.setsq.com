-- Migration to use existing 'processed' field instead of creating new 'processing_status'

-- Check current table structure
\d chat.line_webhook_events

-- Add any missing columns (but not processing_status since we'll use 'processed' instead)
ALTER TABLE chat.line_webhook_events 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

ALTER TABLE chat.line_webhook_events 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_webhook_processed ON chat.line_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_created ON chat.line_webhook_events(created_at);

-- Show updated structure
\d chat.line_webhook_events