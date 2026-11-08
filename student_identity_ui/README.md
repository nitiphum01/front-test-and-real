# Student Identity UI (ฉบับทดสอบ)

หน้าเว็บ Student Identity ฉบับสำหรับพัฒนาและทดสอบ (backend: https://github.com/6731503032/student_identity)
HTML/CSS/JavaScript ธรรมดา ไม่ต้อง build ดีไซน์แบบ shadcn/ui

> **ห้าม deploy ขึ้น production** เพราะมีทางลัดเข้าระบบโดยไม่ใช้รหัสผ่าน ฉบับใช้งานจริงอยู่ที่ `student_identity_frontend`

> **คู่มือฉบับละเอียดสำหรับทีม:** [TEAM_GUIDE.md](TEAM_GUIDE.md) อธิบายวิธีตั้งค่าการทดสอบ, เครื่องมือเฉพาะฉบับทดสอบ, checklist การทดสอบ, หน้าที่ของแต่ละหน้า และโค้ด

## เริ่มทดสอบเร็วๆ (backend จำลอง ไม่แตะ Supabase)

รันจาก root ของ repo [front-test-and-real](https://github.com/nitiphum01/front-test-and-real):

```bash
git clone https://github.com/6731503032/student_identity.git
cd student_identity && npm install && cd ..
node student_identity_ui/dev-tools/mock-backend.js ./student_identity
```

(clone backend ครั้งแรกครั้งเดียว `.gitignore` ของ repo กันไม่ให้โฟลเดอร์นี้ถูก commit)

อีก terminal หนึ่ง:

```bash
node student_identity_ui/dev-tools/static-server.js
```

เปิด http://localhost:5500 แล้วใช้ "สำหรับนักพัฒนา" ใต้ฟอร์มเพื่อเข้าเป็นเจ้าหน้าที่, อาจารย์ หรือ service

## สิ่งที่มีเพิ่มจากฉบับจริง

- ทางลัดเข้าระบบโดยไม่ใช้รหัสผ่าน (`POST /dev/issue-token`)
- เปลี่ยนเซิร์ฟเวอร์ได้จากหน้าเว็บ (localhost ↔ Render)
- ปุ่มจำลอง AI ล่ม/กลับมา ในหน้าทดสอบการเชื่อมต่อ
- สคริปต์ `dev-tools/` สำหรับเปิด backend จำลองและเสิร์ฟหน้าเว็บ
