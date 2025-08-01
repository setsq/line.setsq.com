-- Check current table structure
\d chat.line_webhook_events

-- Check existing indexes
\di chat.*webhook*

-- Show first few rows to understand the data
SELECT * FROM chat.line_webhook_events LIMIT 5;