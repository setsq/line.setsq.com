  วิธีการเข้า psql

  1. ข้อมูลการเชื่อมต่อ:

  - Host: 192.168.11.50 (ไม่ใช่ localhost)
  - Port: 5432
  - Database: setsq
  - User: dhevin

  2. คำสั่งเข้า psql:

  # โหลด environment variables และเชื่อมต่อ
  source .env.local && PGPASSWORD=$DB_PASSWORD psql -h 192.168.11.50 -U dhevin -d setsq

  3. คำสั่ง psql ที่ใช้บ่อย:

  - \dt chat.* - แสดงตารางทั้งหมดใน schema chat
  - \d chat.message_attachments - แสดงโครงสร้างตาราง
  - \q - ออกจาก psql

  4. ข้อควรระวัง:

  สำคัญมาก: ห้ามใช้ psql โดยไม่มี -h flag เพราะจะพยายามเชื่อมต่อกับ localhost และจะ fail