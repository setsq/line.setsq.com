# คู่มือทดสอบ LINE Webhook

## 🧪 1. ทดสอบในเครื่อง (Local Testing)

### เตรียมระบบ
```bash
# 1. เริ่ม Redis
sudo service redis-server start

# 2. รัน migration (ครั้งแรก)
npm run db:migrate

# 3. เริ่มระบบ
./scripts/start-dev.sh
```

### ทดสอบ Webhook
```bash
# ส่ง test webhook
npm run test:webhook

# ตรวจสอบสถานะ
./scripts/check-status.sh
```

## 🌐 2. ทดสอบกับ LINE จริง (Production Testing)

### ใช้ ngrok สำหรับ Local Development
```bash
# 1. ติดตั้ง ngrok
# https://ngrok.com/download

# 2. เปิด tunnel
ngrok http 3002

# 3. Copy URL ที่ได้ เช่น https://abc123.ngrok.io
```

### ตั้งค่า LINE Webhook
1. เข้า LINE Developers Console
2. เลือก Channel ของคุณ
3. ไปที่ Messaging API settings
4. อัพเดท Webhook URL: `https://abc123.ngrok.io/api/chat/line/webhook`
5. เปิด "Use webhook"
6. คลิก "Verify" เพื่อทดสอบ

### ทดสอบโดยการส่งข้อความ
1. เพิ่มบอทเป็นเพื่อน
2. ส่งข้อความหาบอท
3. ดูผลที่ terminal และ database

## 📊 3. Monitor ระบบ

### ดู Queue Status
```bash
# ผ่าน API
curl http://localhost:3002/api/monitoring/queue | jq

# ผ่าน Script
./scripts/check-status.sh
```

### ดู Logs
```bash
# ดู worker logs
# จะแสดงในหน้าต่าง terminal ที่รัน worker

# ดู web server logs  
# จะแสดงในหน้าต่าง terminal ที่รัน web server
```

### Query Database โดยตรง
```bash
source .env.local && PGPASSWORD=$DB_PASSWORD psql -h 192.168.11.50 -U dhevin -d setsq

-- ดู events ล่าสุด
SELECT * FROM chat.line_webhook_events ORDER BY created_at DESC LIMIT 10;

-- ดู events ที่ยังไม่ประมวลผล
SELECT * FROM chat.line_webhook_events WHERE processed = false;

-- ดู events ที่ error
SELECT * FROM chat.line_webhook_events WHERE error_message IS NOT NULL;
```

## 🐛 4. Troubleshooting

### ปัญหาที่พบบ่อย

1. **Signature validation failed**
   - ตรวจสอบ LINE_CHANNEL_SECRET ใน .env.local
   - ตรวจสอบว่าใช้ channel secret ที่ถูกต้อง

2. **Cannot connect to PostgreSQL**
   - ตรวจสอบการเชื่อมต่อ: `ping 192.168.11.50`
   - ตรวจสอบ credentials ใน .env.local

3. **Redis connection error**
   - เริ่ม Redis: `sudo service redis-server start`
   - ตรวจสอบ: `redis-cli ping`

4. **Worker ไม่ประมวลผล events**
   - ตรวจสอบว่า worker กำลังทำงาน
   - ดู error ใน worker terminal
   - ตรวจสอบ queue status

## 🚀 5. Performance Testing

### ส่ง Multiple Events
```javascript
// สร้าง scripts/load-test.js
const count = 100;
for (let i = 0; i < count; i++) {
  setTimeout(() => {
    // ส่ง webhook
  }, i * 100); // ส่งทุก 100ms
}
```

### Monitor Performance
```sql
-- ดูเวลาประมวลผลเฉลี่ย
SELECT 
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_seconds,
  MIN(EXTRACT(EPOCH FROM (processed_at - created_at))) as min_seconds,
  MAX(EXTRACT(EPOCH FROM (processed_at - created_at))) as max_seconds
FROM chat.line_webhook_events
WHERE processed = true AND processed_at IS NOT NULL;
```