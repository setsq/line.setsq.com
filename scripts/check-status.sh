#!/bin/bash

echo "🔍 LINE Webhook System Status Check"
echo "===================================="

# Load environment
source .env.local

# 1. Check Queue Status
echo -e "\n📊 Queue Status:"
curl -s http://localhost:3002/api/monitoring/queue | jq '.'

# 2. Check Database
echo -e "\n🗄️  Recent Events in Database:"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT 
    id,
    webhook_event_id,
    event_type,
    processed,
    processed_at,
    error_message,
    created_at
FROM chat.line_webhook_events 
ORDER BY created_at DESC 
LIMIT 5;
"

# 3. Check Processing Stats
echo -e "\n📈 Processing Statistics (Last 24 hours):"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT 
    CASE 
        WHEN processed = true AND error_message IS NULL THEN 'completed'
        WHEN processed = true AND error_message IS NOT NULL THEN 'failed'
        WHEN processed = false THEN 'pending'
    END as status,
    COUNT(*) as count
FROM chat.line_webhook_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;
"