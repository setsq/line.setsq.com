-- Schema: chat
CREATE SCHEMA IF NOT EXISTS chat;

-- Table: chat.line_webhook_events (ถ้ายังไม่มี)
CREATE TABLE IF NOT EXISTS chat.line_webhook_events (
  id SERIAL PRIMARY KEY,
  webhook_event_id VARCHAR(255) UNIQUE NOT NULL,  -- LINE's unique ID
  event_type VARCHAR(100) NOT NULL,               -- message, follow, etc.
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,    -- Event timestamp from LINE
  source JSONB NOT NULL,                          -- User/group/room info
  raw_data JSONB NOT NULL,                        -- Complete webhook payload
  processed BOOLEAN DEFAULT false,                 -- ใช้ field นี้แทน processing_status
  processed_at TIMESTAMP WITH TIME ZONE,          -- When we processed it
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_event_type ON chat.line_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_processed ON chat.line_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_created ON chat.line_webhook_events(created_at);