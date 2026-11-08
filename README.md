# front-test-and-real

หน้าเว็บ (frontend) ของระบบ **Student Identity** (Digital Campus · ทีม 01) แบ่งเป็น 2 ฉบับ

| โฟลเดอร์ | ฉบับ | ใช้ทำอะไร | Deploy |
|---|---|---|---|
| [`student_identity_frontend/`](student_identity_frontend/) | **ใช้งานจริง** | ต่อกับเซิร์ฟเวอร์จริง `https://student-identity.onrender.com` | ✅ ใช้โฟลเดอร์นี้ |
| [`student_identity_ui/`](student_identity_ui/) | **ทดสอบ** | ทดสอบในเครื่อง มีทางลัดเข้าระบบ, เปลี่ยนเซิร์ฟเวอร์ได้, backend จำลอง | ❌ ห้าม deploy |

Backend อยู่อีก repo หนึ่ง: [6731503032/student_identity](https://github.com/6731503032/student_identity) หน้าเว็บเรียกผ่าน HTTP อย่างเดียว ไม่ได้แก้โค้ด backend

## คู่มือ

- ฉบับจริง: [`student_identity_frontend/TEAM_GUIDE.md`](student_identity_frontend/TEAM_GUIDE.md) อธิบายการเตรียมเชื่อมต่อ, หน้าที่และข้อมูลของแต่ละหน้า, API, โค้ด และการ deploy
- ฉบับทดสอบ: [`student_identity_ui/TEAM_GUIDE.md`](student_identity_ui/TEAM_GUIDE.md) อธิบายวิธีตั้งค่าการทดสอบ, เครื่องมือทดสอบ และ checklist

## เริ่มต้นเร็วๆ

```bash
git clone https://github.com/nitiphum01/front-test-and-real.git
cd front-test-and-real
```

**เปิดฉบับจริง** (ต่อเซิร์ฟเวอร์จริง):

```bash
cd student_identity_frontend
npx serve .
```

**เปิดฉบับทดสอบพร้อม backend จำลอง** (ไม่แตะฐานข้อมูลจริง):

```bash
git clone https://github.com/6731503032/student_identity.git   # ครั้งแรกครั้งเดียว
cd student_identity && npm install && cd ..
node student_identity_ui/dev-tools/mock-backend.js ./student_identity
# เปิดอีก terminal:
node student_identity_ui/dev-tools/static-server.js            # → http://localhost:5500
```

## Deploy

ตั้ง static hosting ให้ชี้ที่ `student_identity_frontend` เช่น Render Static Site: Root Directory = `student_identity_frontend`, Build Command = (เว้นว่าง), Publish Directory = `.`

## ข้อตกลงในทีม

- แก้และทดสอบในฉบับทดสอบก่อน แล้วย้ายไปฉบับจริง (ดูหัวข้อ 10 ในคู่มือฉบับทดสอบ)
- ห้าม commit โฟลเดอร์ `student_identity/` (backend ที่ clone มาทดสอบ), `node_modules/` หรือไฟล์ `.env`
- ห้ามใส่ API key, token หรือ secret ใดๆ ในโค้ดหน้าเว็บ
