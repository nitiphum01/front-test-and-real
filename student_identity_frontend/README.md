# Student Identity — Frontend

หน้าเว็บสำหรับใช้งานระบบ Student Identity (backend: https://github.com/6731503032/student_identity)
เขียนด้วย HTML/CSS/JavaScript ธรรมดา ไม่ต้อง build ใช้ดีไซน์แบบ shadcn/ui

เชื่อมกับเซิร์ฟเวอร์จริง `https://student-identity.onrender.com` ตามค่าใน `config.js`

> **คู่มือฉบับละเอียดสำหรับทีม:** [TEAM_GUIDE.md](TEAM_GUIDE.md) อธิบายการเตรียมเชื่อมต่อ, หน้าที่และข้อมูลของแต่ละหน้า, API ที่เรียก และการทำงานของโค้ด

## เปิดใช้งานในเครื่อง

ต้องเปิดผ่าน web server (เปิดไฟล์ `index.html` ตรงๆ ไม่ได้ เพราะใช้ ES modules)

```bash
npx serve .
```

หรือใช้ส่วนขยาย Live Server ใน VS Code แล้วเปิดไฟล์ `index.html`

## Deploy

โค้ดอยู่ใน repo https://github.com/nitiphum01/front-test-and-real ในโฟลเดอร์ `student_identity_frontend` (ไม่มีขั้นตอน build)

- **Render Static Site:** เลือก repo `nitiphum01/front-test-and-real`, Root Directory = `student_identity_frontend`, Build Command = (เว้นว่าง), Publish Directory = `.`
- **Netlify / Vercel:** ตั้ง base/root directory เป็น `student_identity_frontend`
- **GitHub Pages:** ต้องใช้ GitHub Actions เพราะโฟลเดอร์นี้ไม่ได้อยู่ที่ root ของ repo

> ตั้ง root ให้ชี้ที่ `student_identity_frontend` เท่านั้น อย่าชี้ root ของ repo หรือ `student_identity_ui` (ฉบับทดสอบ)

รายละเอียดและ checklist ก่อน push อยู่ในหัวข้อ 3 ของ [TEAM_GUIDE.md](TEAM_GUIDE.md)

## เปลี่ยนเซิร์ฟเวอร์

แก้ `API_BASE` ใน `config.js` เช่นตอนรัน backend ในเครื่องให้เปลี่ยนเป็น `http://localhost:3000`

## หน้าต่างๆ ตาม role

| Role | หน้า |
|---|---|
| นักศึกษา | ภาพรวม · โปรไฟล์ · ความเป็นส่วนตัว (อนุญาตหรือยกเลิกให้แต่ละบริการดูข้อมูล) |
| อาจารย์ | นักศึกษา (อ่านอย่างเดียว) · สิทธิ์ผู้ใช้ (อ่านอย่างเดียว) |
| เจ้าหน้าที่ | นักศึกษา (เพิ่ม/ลบ) · สิทธิ์ผู้ใช้ (กำหนด role) · Service clients (ออกและคัดลอก API key) · ทดสอบการเชื่อมต่อ |

บัญชีเจ้าหน้าที่หรืออาจารย์: สมัครเป็นนักศึกษาก่อน แล้วให้เจ้าหน้าที่ที่มีอยู่ตั้ง role ให้ในหน้า "สิทธิ์ผู้ใช้" จากนั้นเข้าสู่ระบบใหม่

## โครงสร้าง

```
index.html        โครงหน้า + ฟอนต์และไอคอน
config.js         ที่อยู่ backend
css/style.css     ดีไซน์ (shadcn Neutral, รองรับโหมดมืดและมือถือ)
js/app.js         รายการหน้าและ role ที่เข้าได้
js/api.js         ตัวเรียก API กลาง (แนบ token, timeout, แจ้งเมื่อเซิร์ฟเวอร์ตื่นช้า, 401 → ออกจากระบบ)
js/session.js     เก็บ token ใน sessionStorage และนับเวลาหมดอายุ
js/router.js      สลับหน้าด้วย #hash, sidebar, กันสิทธิ์ตาม role
js/ui.js          ตัวช่วยสร้าง DOM (ไม่ใช้ innerHTML กับข้อมูลจากเซิร์ฟเวอร์), toast, dialog
js/server.js      ตรวจว่าเซิร์ฟเวอร์พร้อม
js/pages/*.js     หน้าละไฟล์
```

## ข้อจำกัดที่มาจาก backend

- Token มีอายุ 15 นาที ไม่มีการต่ออายุ หน้าเว็บจะนับถอยหลังและพากลับไปหน้าเข้าสู่ระบบเมื่อหมดเวลา
- เซิร์ฟเวอร์ Render แบบฟรีจะหลับเมื่อไม่มีคนใช้ คำขอแรกอาจใช้เวลาประมาณ 1 นาที หน้าเว็บจะแสดงข้อความระหว่างรอ
- หน้า Service clients แสดงรายการทั้งหมดได้เฉพาะเมื่อ backend เปิด `/dev/service-clients` ถ้าไม่เปิด จะแสดงเฉพาะรายการที่สร้างจากเบราว์เซอร์นั้น
- ยังไม่มีการลบ service client เพราะ backend ไม่มี API สำหรับลบ
- ออกจากระบบแล้ว token เดิมยังไม่ถูกยกเลิกที่เซิร์ฟเวอร์ หน้าเว็บลบ token ในเครื่องแทน
