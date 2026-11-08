# คู่มือทีม: Student Identity UI (ฉบับทดสอบ)

เอกสารนี้อธิบายโฟลเดอร์ `student_identity_ui` ซึ่งเป็น **ฉบับสำหรับพัฒนาและทดสอบ** ของหน้าเว็บ Student Identity ใช้ลองระบบในเครื่องได้โดยไม่แตะข้อมูลจริง

> **ห้าม deploy โฟลเดอร์นี้ขึ้น production** เพราะมีทางลัดเข้าระบบโดยไม่ใช้รหัสผ่าน ฉบับใช้งานจริงอยู่ที่ `student_identity_frontend` (มีคู่มือแยก)
>
> ทั้งสองฉบับเก็บใน repo เดียวกัน: https://github.com/nitiphum01/front-test-and-real (ตั้งค่า deploy ให้ชี้ที่ `student_identity_frontend` เท่านั้น)

---

## สารบัญ

1. [ฉบับทดสอบต่างจากฉบับจริงอย่างไร](#1-ฉบับทดสอบต่างจากฉบับจริงอย่างไร)
2. [เตรียมเครื่องและเชื่อมต่อ](#2-เตรียมเครื่องและเชื่อมต่อ)
3. [เครื่องมือเฉพาะฉบับทดสอบ](#3-เครื่องมือเฉพาะฉบับทดสอบ)
4. [ชุดทดสอบแนะนำ (checklist)](#4-ชุดทดสอบแนะนำ-checklist)
5. [โครงสร้างไฟล์](#5-โครงสร้างไฟล์)
6. [อธิบายโค้ดส่วนกลาง](#6-อธิบายโค้ดส่วนกลาง)
7. [อธิบายทีละหน้า: หน้าที่และข้อมูลที่ดึง](#7-อธิบายทีละหน้า-หน้าที่และข้อมูลที่ดึง)
8. [ตาราง API](#8-ตาราง-api)
9. [ข้อจำกัดของ backend](#9-ข้อจำกัดของ-backend)
10. [ย้ายการแก้ไขไปฉบับจริง](#10-ย้ายการแก้ไขไปฉบับจริง)
11. [แก้ปัญหาที่พบบ่อย](#11-แก้ปัญหาที่พบบ่อย)

---

## 1. ฉบับทดสอบต่างจากฉบับจริงอย่างไร

| เรื่อง | ฉบับทดสอบ (`student_identity_ui`) | ฉบับจริง (`student_identity_frontend`) |
|---|---|---|
| เซิร์ฟเวอร์ | เลือกอัตโนมัติ: เปิดจาก localhost → `http://localhost:3000` ไม่งั้น → Render และ**เปลี่ยนได้จากหน้าเว็บ** | ตายตัวที่ `https://student-identity.onrender.com` ใน `config.js` |
| ทางลัดนักพัฒนา | มี: เข้าเป็นเจ้าหน้าที่/อาจารย์/service ได้โดยไม่ใช้รหัสผ่าน (`POST /dev/issue-token`) | ไม่มี |
| จำลอง AI ล่ม | มี ในหน้าทดสอบการเชื่อมต่อ (`/dev/break-ai`, `/dev/fix-ai`) | ไม่มี |
| การ์ดเปลี่ยนเซิร์ฟเวอร์ | มี ในหน้า login และหน้าทดสอบการเชื่อมต่อ | ไม่มี |
| ตัวอย่างในช่องกรอก | `6731503032` | ข้อความกลางๆ เช่น "รหัสนักศึกษา 10 หลัก" |
| สคริปต์ช่วยทดสอบ | มี `dev-tools/mock-backend.js`, `dev-tools/static-server.js` | ไม่มี |
| หน้าและดีไซน์อื่น | เหมือนกัน | เหมือนกัน |

---

## 2. เตรียมเครื่องและเชื่อมต่อ

ต้องมี Node.js 18 ขึ้นไป

### ดึงโค้ด

หน้าเว็บทั้งสองฉบับอยู่ใน repo [nitiphum01/front-test-and-real](https://github.com/nitiphum01/front-test-and-real) ส่วน backend อยู่ใน repo ของเพื่อน ([6731503032/student_identity](https://github.com/6731503032/student_identity)) ถ้าจะใช้ backend จำลอง (วิธี A) หรือรัน backend ในเครื่อง (วิธี B) ให้ clone backend ไว้**ข้างใน** repo หน้าเว็บ:

```bash
git clone https://github.com/nitiphum01/front-test-and-real.git
cd front-test-and-real
git clone https://github.com/6731503032/student_identity.git
```

จะได้โครงแบบนี้:

```
front-test-and-real/
├── student_identity/          ← backend (clone เพิ่มเอง, .gitignore กันไม่ให้ถูก commit)
├── student_identity_ui/       ← ฉบับทดสอบ (โฟลเดอร์นี้)
└── student_identity_frontend/ ← ฉบับจริง
```

> โฟลเดอร์ `student_identity/` เป็น repo ของเพื่อน อย่า commit เข้า repo หน้าเว็บ (`.gitignore` ที่ root ของ repo กันไว้แล้ว) และอย่าแก้ไฟล์ข้างใน ถ้าจะอัปเดต backend ให้เข้าไปสั่ง `git pull` ในโฟลเดอร์นั้น

คำสั่งด้านล่างทั้งหมดรันจาก root ของ `front-test-and-real/`

มี 3 วิธีให้เลือกตามสิ่งที่จะทดสอบ:

| วิธี | ข้อมูลไปที่ไหน | ใช้เมื่อ |
|---|---|---|
| **A. Backend จำลอง** (แนะนำ) | หน่วยความจำ หายเมื่อปิด | ทดสอบหน้าเว็บทั่วไปโดยไม่กระทบใคร |
| **B. Backend จริงในเครื่อง** | Supabase จริงของทีม | ทดสอบกับข้อมูลจริง (ระวัง เขียนลงฐานข้อมูลจริง) |
| **C. Render** | Supabase จริงของทีม | ทดสอบกับเซิร์ฟเวอร์ที่ deploy แล้ว |

### วิธี A: Backend จำลอง (ไม่แตะ Supabase)

ใช้ backend ตัวจริง แต่สลับฐานข้อมูลเป็นแบบในหน่วยความจำที่มากับเทสต์ของ backend (`test/helpers.js`) ไม่ต้องแก้โค้ดของ backend

```bash
# 1) ติดตั้ง dependency ของ backend (ครั้งแรกครั้งเดียว)
cd student_identity
npm install
cd ..

# 2) เปิด backend จำลองที่ http://localhost:3000
node student_identity_ui/dev-tools/mock-backend.js ./student_identity
```

เปิดอีกหน้าต่าง terminal:

```bash
# 3) เปิดหน้าเว็บที่ http://localhost:5500
node student_identity_ui/dev-tools/static-server.js
```

แล้วเปิด http://localhost:5500 หน้าเว็บจะต่อ `localhost:3000` ให้อัตโนมัติ

**ข้อมูลตั้งต้นใน backend จำลอง:**
- นักศึกษา `6731500001` (Ann Lee) ยังไม่มีรหัสผ่าน ถ้าจะเข้าเป็นคนนี้ต้องสมัครด้วยอีเมล `ann@lamduan.mfu.ac.th`
- service client `internship-service` ยังไม่มี key และไม่มี scope ถ้าจะทดสอบ claims ให้สร้างบริการใหม่จากหน้า Service clients แทน

**สิ่งที่ `test/helpers.js` ตั้งให้:** `NODE_ENV=test` (เปิด `/dev/*`), `JWT_SECRET=test-secret`, webhook ชี้ไปที่ port ที่ปิดอยู่ (จึงไม่ส่งออกอินเทอร์เน็ต) และซ่อน log `[audit]`

เปลี่ยน port ได้ด้วย env `PORT` เช่น `PORT=4000 node ...` (ถ้าเปลี่ยน port ของ backend ต้องเปลี่ยนเซิร์ฟเวอร์ในหน้าเว็บด้วย ดูข้อ 3.2)

### วิธี B: Backend จริงในเครื่อง

```bash
cd student_identity
npm install
npm start          # ใช้ .env ของ backend → เขียนลง Supabase จริง
```

> ข้อมูลที่สร้างระหว่างทดสอบ (บัญชี, นักศึกษา, service client) จะอยู่ในฐานข้อมูลจริงของทีม ใช้รหัสทดสอบที่ไม่ชนกับนักศึกษาจริง และลบทิ้งหลังทดสอบ

### วิธี C: Render

เปิดหน้าเว็บ แล้วเปลี่ยนเซิร์ฟเวอร์เป็น "Render (ออนไลน์)" (ข้อ 3.2) ถ้า Render รันแบบ production ทางลัดนักพัฒนาและปุ่มจำลอง AI จะใช้ไม่ได้ และหน้าเว็บจะแจ้งว่าปิดอยู่

---

## 3. เครื่องมือเฉพาะฉบับทดสอบ

### 3.1 ทางลัดนักพัฒนา (หน้า login)

กด "สำหรับนักพัฒนา: เข้าใช้โดยไม่ใช้รหัสผ่าน" ใต้ฟอร์ม:

| ปุ่ม | เข้าเป็น |
|---|---|
| เจ้าหน้าที่ | `staff-1`, role `staff` |
| อาจารย์ | `instructor-1`, role `instructor` |
| Service | `internship-service`, role `service`, scope `profile:read` |
| ช่องกำหนดเอง | subject และ role ตามที่กรอก (ถ้าเลือก service จะได้ scope `profile:read`) |

ทำงานผ่าน `POST /dev/issue-token` ซึ่ง backend เปิดเฉพาะเมื่อ `NODE_ENV` ไม่ใช่ `production` ถ้าได้ 404 หน้าเว็บจะแจ้งว่า "ทางลัดนี้ปิดอยู่"

> บัญชีเจ้าหน้าที่จากทางลัดไม่มีข้อมูลนักศึกษา จึงไม่มีหน้าโปรไฟล์ เป็นพฤติกรรมปกติ

### 3.2 เปลี่ยนเซิร์ฟเวอร์

- หน้า login: กดที่อยู่เซิร์ฟเวอร์ใต้การ์ด
- หน้าทดสอบการเชื่อมต่อ: การ์ด "เซิร์ฟเวอร์" → "เปลี่ยนเซิร์ฟเวอร์"

ค่าจะถูกจำใน `localStorage` key `si.apiBase` ของเบราว์เซอร์นั้น ถ้าเลือกค่าเดียวกับค่าเริ่มต้น จะลบค่าที่จำไว้

### 3.3 จำลอง AI ล่ม (หน้าทดสอบการเชื่อมต่อ, เฉพาะเจ้าหน้าที่)

| ปุ่ม | API | ผลในหน้าภาพรวมของนักศึกษา |
|---|---|---|
| จำลอง AI ล่ม | `POST /dev/break-ai` | การ์ดความครบของโปรไฟล์เปลี่ยนเป็น checklist พร้อมข้อความว่า AI ไม่พร้อม |
| ให้ AI กลับมา | `POST /dev/fix-ai` | กลับมาแสดงคำแนะนำจาก AI โดยไม่ต้องรีสตาร์ต |

ใช้พิสูจน์ว่าระบบมีทางสำรองเมื่อ AI ล่ม (degradation)

### 3.4 สคริปต์ใน `dev-tools/`

| ไฟล์ | หน้าที่ |
|---|---|
| `mock-backend.js` | โหลด `test/helpers.js` ของ backend (สลับฐานข้อมูลเป็นแบบในหน่วยความจำ) แล้วเปิด `server.js` ที่ port 3000 รับ path ของโฟลเดอร์ backend เป็น argument |
| `static-server.js` | web server เล็กๆ เสิร์ฟโฟลเดอร์นี้ที่ port 5500 ไม่ต้อง `npm install` |

---

## 4. ชุดทดสอบแนะนำ (checklist)

ใช้วิธี A ทดสอบตามลำดับ (ทุกข้อเคยทดสอบผ่านแล้วกับ backend จำลอง)

**นักศึกษา**
- [ ] แท็บ "สร้างบัญชี" กดส่งโดยไม่กรอก → มีข้อความภาษาไทยใต้ทุกช่อง
- [ ] สมัคร `6700000001` / ชื่อ / อีเมล / รหัสผ่าน 8 ตัวขึ้นไป → เข้าหน้าภาพรวม ความครบ 100% และคำแนะนำจาก AI
- [ ] โปรไฟล์: อายุ 500 → "อายุต้องเป็นจำนวนเต็ม 1–119" · อายุ 21 → "บันทึกโปรไฟล์แล้ว"
- [ ] ความเป็นส่วนตัว: เปิดสวิตช์ของบริการ → "อนุญาตให้ ... แล้ว" ป้ายเปลี่ยนเป็น "อนุญาตแล้ว"
- [ ] ออกจากระบบแล้วเข้าใหม่ด้วยรหัสผ่านเดิม → สำเร็จ · รหัสผ่านผิด → "รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง"

**เจ้าหน้าที่ (ทางลัด)**
- [ ] หน้านักศึกษาแสดงทั้ง 2 คน ค้นหาได้ ดูรายละเอียดได้
- [ ] เพิ่มนักศึกษาใหม่ → ปรากฏในตาราง · เพิ่มรหัสซ้ำ → "รหัสนักศึกษาหรืออีเมลนี้มีในระบบแล้ว"
- [ ] สิทธิ์ผู้ใช้: เปลี่ยน `6700000001` เป็นอาจารย์ → เข้าระบบใหม่ด้วยบัญชีนั้นแล้วเห็นเมนูของอาจารย์
- [ ] Service clients: ลงทะเบียน `job-board` → หน้าต่างแสดง key `sik_...` → คัดลอกได้
- [ ] ทดสอบการเชื่อมต่อ: ใช้ key ของ `job-board` กับ `6700000001`
  - ก่อนนักศึกษาอนุญาต → **403** "นักศึกษายังไม่ได้อนุญาต..."
  - หลังนักศึกษาเปิดสวิตช์ `job-board` → **200** "นักศึกษาอนุญาตแล้ว ..."
- [ ] จำลอง AI ล่ม → หน้าภาพรวมของนักศึกษาแสดง checklist → ให้ AI กลับมา → กลับเป็นคำแนะนำจาก AI

**อาจารย์ (ทางลัด)**
- [ ] เห็นแค่เมนูนักศึกษาและสิทธิ์ผู้ใช้ ไม่มีปุ่มเพิ่ม/ลบ และไม่มี dropdown เปลี่ยน role

**ทั่วไป**
- [ ] จอมือถือ (กว้าง 375px): เมนูเลื่อนแนวนอน ไม่มีการเลื่อนหน้าออกด้านข้าง
- [ ] โหมดมืดและโหมดสว่างอ่านได้ทุกหน้า
- [ ] Console ไม่มี error นอกจาก 403/404 ที่ตั้งใจทดสอบ

---

## 5. โครงสร้างไฟล์

```
student_identity_ui/
├── index.html            โครงหน้า: ฟอนต์, ไอคอน, CSS, แถบรอเซิร์ฟเวอร์, toast แล้วโหลด js/app.js
├── config.js             เลือกเซิร์ฟเวอร์ (อัตโนมัติ + ค่าที่จำใน localStorage)
├── css/style.css         ดีไซน์แบบ shadcn/ui (Neutral, โหมดมืด, มือถือ)
├── js/
│   ├── app.js            ลงทะเบียนหน้าและ role ที่เข้าได้
│   ├── router.js         สลับหน้าตาม #hash, sidebar, แถบบน, นาฬิกา session
│   ├── api.js            ฟังก์ชันกลางเรียก backend
│   ├── session.js        เก็บ/อ่าน/ล้าง token
│   ├── ui.js             ตัวช่วยสร้าง HTML, toast, dialog, ฟอร์ม
│   ├── server.js         ตรวจสถานะเซิร์ฟเวอร์ + หน้าต่างเปลี่ยนเซิร์ฟเวอร์
│   └── pages/
│       ├── login.js      เข้าสู่ระบบ / สร้างบัญชี / ทางลัดนักพัฒนา
│       ├── student.js    ภาพรวม, โปรไฟล์, ความเป็นส่วนตัว
│       ├── students.js   รายชื่อนักศึกษา
│       ├── roles.js      สิทธิ์ผู้ใช้
│       ├── clients.js    Service clients
│       └── tools.js      ทดสอบการเชื่อมต่อ + เซิร์ฟเวอร์ + จำลอง AI
├── dev-tools/
│   ├── mock-backend.js   เปิด backend พร้อมฐานข้อมูลจำลอง
│   └── static-server.js  เสิร์ฟหน้าเว็บนี้
├── README.md
└── TEAM_GUIDE.md         เอกสารนี้
```

ลำดับเมื่อเปิดหน้า: `index.html` → `js/app.js` ลงทะเบียนทุกหน้า → `router.start()` → ถ้าไม่มี token แสดงหน้า login, ถ้ามีจะสร้าง sidebar แล้วเรียก `render()` ของหน้านั้น

---

## 6. อธิบายโค้ดส่วนกลาง

### `config.js`
- `DEFAULT_API_BASE`: ถ้าหน้าเว็บเปิดจาก `localhost`, `127.0.0.1` หรือ `file` → `http://localhost:3000` นอกนั้น → Render
- `apiBase()`: คืนค่าที่จำไว้ใน `localStorage['si.apiBase']` ถ้ามี ไม่งั้นคืนค่าเริ่มต้น
- `setApiBase(url)`: บันทึกค่าที่เลือก (ใช้ใน `server.js`)
- `PRESET_SERVERS`: ปุ่มลัดในหน้าต่างเปลี่ยนเซิร์ฟเวอร์

### `js/session.js`
เก็บ token ใน `sessionStorage['si.session']` เป็น `{ token, sub, role, scopes, exp }` โดยถอด payload ของ JWT เพื่ออ่าน role และเวลาหมดอายุ (ไม่ได้ตรวจลายเซ็น backend เป็นผู้ตรวจ) token หมดอายุจะถูกล้างอัตโนมัติ `setFlash`/`takeFlash` ใช้ฝากข้อความข้ามหน้า

### `js/api.js`
`api(method, path, { body, headers, auth, timeout })` คืน `{ ok, status, data }` เสมอโดยไม่ throw
- แนบ `Authorization: Bearer <token>` อัตโนมัติ (ปิดได้ด้วย `auth: false`)
- รอเกิน 3.5 วินาที → แสดงแถบ "กำลังรอเซิร์ฟเวอร์ตอบกลับ…"
- timeout 70 วินาที
- ได้ 401 ระหว่างใช้ token ผู้ใช้ → ล้าง session แล้วกลับหน้า login
- `errorText()` แปล error ภาษาอังกฤษของ backend เป็นภาษาไทย

### `js/router.js`
- `register(path, { title, icon, roles, render })` และ `homeFor(role)`
- ตรวจ session → ตรวจสิทธิ์ของหน้า → แสดง loading → `render(view, session, { isCurrent })`
- สร้าง sidebar (เมนูตาม role + บัญชีผู้ใช้และปุ่มออกจากระบบ) และแถบบน (ชื่อหน้า, role, นาฬิกา)
- นาฬิกาเตือนตอนเหลือ 2 นาที และออกจากระบบเมื่อหมดเวลา

### `js/ui.js`
`h(tag, props, ...children)` สร้าง HTML ด้วย `createElement` + `textContent` (กัน XSS) และมีตัวช่วย `card`, `pageHeader`, `badge`, `notice`, `loading`, `emptyState`, `errorState`, `field`, `setFieldErrors`, `busy`, `toast`, `openDialog`, `confirmDialog`, `copyText`, `formatDate`

### `js/server.js`
- `serverStatus()`: จุดสถานะใต้หน้า login (ping ด้วย `POST /tokens/verify`)
- `openServerDialog()` / `serverLine()`: หน้าต่างและลิงก์เปลี่ยนเซิร์ฟเวอร์ (มีเฉพาะฉบับทดสอบ)

### `css/style.css`
ตัวแปรสีแบบ shadcn อยู่บนสุด (ชุดสว่าง + ชุดมืด) ตามด้วย component ต่างๆ และ responsive ท้ายไฟล์

---

## 7. อธิบายทีละหน้า: หน้าที่และข้อมูลที่ดึง

| หน้า | URL | Role | หน้าที่ | API |
|---|---|---|---|---|
| เข้าสู่ระบบ / สร้างบัญชี | `#/login` | ทุกคน | เข้าระบบ, สมัครบัญชีนักศึกษา, ทางลัดนักพัฒนา, สถานะและเปลี่ยนเซิร์ฟเวอร์ | `POST /auth/login`, `POST /auth/signup`, `POST /dev/issue-token`, `POST /tokens/verify` |
| ภาพรวม | `#/overview` | นักศึกษา | สรุปรหัส, ความครบของโปรไฟล์ (คำนวณจาก ชื่อ/นามสกุล/อีเมล), คำแนะนำ AI หรือ checklist, บริการที่อนุญาต | `GET /me`, `GET /me/profile-completeness`, `GET /me/consents` |
| โปรไฟล์ | `#/profile` | นักศึกษา | แก้ชื่อ, นามสกุล, อีเมล, อายุ (ส่งเฉพาะช่องที่เปลี่ยน) | `GET /me`, `PATCH /me` |
| ความเป็นส่วนตัว | `#/privacy` | นักศึกษา | เปิด/ปิดการอนุญาตให้แต่ละบริการดูข้อมูล | `GET /me/consents`, `PUT/DELETE /me/consents/{granteeId}` |
| นักศึกษา | `#/students` | เจ้าหน้าที่ (จัดการได้), อาจารย์ (อ่าน) | รายชื่อ, ค้นหา, ดูรายละเอียด, เพิ่ม, ลบ | `GET /students`, `GET /students/{id}`, `POST /students`, `DELETE /students/{id}` |
| สิทธิ์ผู้ใช้ | `#/roles` | เจ้าหน้าที่ (เปลี่ยนได้), อาจารย์ (อ่าน) | ดู role ทุกคน, ค้นหา, กำหนด role (มีผลเมื่อเข้าระบบใหม่) | `GET /roles`, `GET /roles/{subject}`, `PUT /roles/{subject}` |
| Service clients | `#/clients` | เจ้าหน้าที่ | ลงทะเบียนบริการของทีมอื่น, คัดลอก key, ออก key ใหม่ | `GET /dev/service-clients`, `POST /service-clients` (+`Idempotency-Key`), `GET /service-clients/{id}/key`, `POST /service-clients/{id}/keys` |
| ทดสอบการเชื่อมต่อ | `#/tools` | เจ้าหน้าที่, service | ทดสอบ claims ด้วย API key หรือ token, ตรวจ token, เปลี่ยนเซิร์ฟเวอร์, จำลอง AI ล่ม | `GET /students/{id}/claims`, `POST /tokens/verify`, `POST /dev/break-ai`, `POST /dev/fix-ai` |

รายละเอียดเชิงลึกของแต่ละหน้า (body ที่ส่ง, response ที่ใช้, กรณี error) เหมือนฉบับจริงทุกประการ ดูหัวข้อ 6 ใน `student_identity_frontend/TEAM_GUIDE.md`

จุดที่ควรรู้:
- **โปรไฟล์:** backend ตอบ 404 ทุกครั้งที่อัปเดตไม่สำเร็จ (ส่วนใหญ่เพราะอีเมลซ้ำ) และแนบ `_webhookDebug` มาด้วยเมื่อไม่ใช่ production หน้าเว็บตัดทิ้ง
- **นักศึกษา:** เจ้าหน้าที่เพิ่มข้อมูลได้โดยยังไม่มีรหัสผ่าน นักศึกษาต้องสมัครด้วยรหัสและอีเมลเดียวกันจึงจะผูกบัญชีได้
- **Service clients:** ใน backend จำลองหรือ backend ที่ไม่ใช่ production จะเห็นรายการครบจาก `/dev/service-clients` ใน production จะเห็นเฉพาะรายการที่สร้างจากเบราว์เซอร์นั้น และไม่มีปุ่มลบเพราะ backend ไม่มี API สำหรับลบ
- **ทดสอบ claims:** API key ส่งผ่าน `Authorization: Bearer sik_...` เพราะ CORS ของ backend ไม่อนุญาต `X-API-Key` จากเบราว์เซอร์

---

## 8. ตาราง API

| Method | Path | ต้อง login | หมายเหตุ |
|---|---|---|---|
| POST | `/auth/login` | ไม่ | |
| POST | `/auth/signup` | ไม่ | |
| POST | `/tokens/verify` | ไม่ | ตอบ 200 เสมอ |
| DELETE | `/sessions/{sub}` | ใช่ | บันทึก log อย่างเดียว |
| GET / PATCH | `/me` | นักศึกษา | |
| GET | `/me/profile-completeness` | นักศึกษา | |
| GET | `/me/consents` | นักศึกษา | |
| PUT / DELETE | `/me/consents/{granteeId}` | นักศึกษา | |
| GET / POST | `/students` | GET: เจ้าหน้าที่, อาจารย์ · POST: เจ้าหน้าที่ | |
| GET / DELETE | `/students/{id}` | GET: เจ้าหน้าที่, อาจารย์ · DELETE: เจ้าหน้าที่ | |
| GET | `/roles`, `/roles/{subject}` | เจ้าหน้าที่, อาจารย์ | |
| PUT | `/roles/{subject}` | เจ้าหน้าที่ | |
| POST | `/service-clients` | เจ้าหน้าที่ | รองรับ `Idempotency-Key` |
| GET | `/service-clients/{id}/key` | เจ้าหน้าที่ | |
| POST | `/service-clients/{id}/keys` | เจ้าหน้าที่ | key เดิมใช้ไม่ได้ทันที |
| GET | `/students/{id}/claims` | service + consent | |
| POST | `/dev/issue-token` | ไม่ | **เฉพาะ backend ที่ไม่ใช่ production** |
| GET | `/dev/service-clients` | ไม่ | **เฉพาะ backend ที่ไม่ใช่ production** |
| POST | `/dev/break-ai`, `/dev/fix-ai` | ไม่ | **เฉพาะ backend ที่ไม่ใช่ production** |

---

## 9. ข้อจำกัดของ backend

| ข้อจำกัด | วิธีที่หน้าเว็บรับมือ |
|---|---|
| Token อายุ 15 นาที ไม่มี refresh | นับถอยหลัง, เตือนตอนเหลือ 2 นาที, กลับหน้า login อัตโนมัติ |
| Render free tier หลับ (ตื่นช้าประมาณ 1 นาที) | แถบรอเซิร์ฟเวอร์, timeout 70 วินาที, ping ตั้งแต่หน้า login |
| ไม่มีหน้าสมัครเจ้าหน้าที่ | ใช้ทางลัดนักพัฒนา (ฉบับทดสอบ) หรือตั้ง role ในตาราง `roles` |
| ไม่มี API รายการ/ลบ service client ฉบับ production | ใช้ `/dev/service-clients` ถ้ามี ไม่งั้นแสดงรายการจากเบราว์เซอร์นี้ · ไม่มีปุ่มลบ |
| Sign out ไม่ยกเลิก token ที่เซิร์ฟเวอร์ | ลบ token ในเครื่อง |
| CORS ไม่อนุญาต `X-API-Key` | ส่ง key ผ่าน `Authorization: Bearer` |
| ไม่มี API ดู audit log | ดูใน Supabase ตาราง `audit_events` |

---

## 10. ย้ายการแก้ไขไปฉบับจริง

ทั้งสองโฟลเดอร์ใช้โค้ดชุดเดียวกัน ต่างกันแค่ไฟล์เหล่านี้:

| ไฟล์ | ส่วนที่ต่าง |
|---|---|
| `config.js` | ฉบับทดสอบเลือกเซิร์ฟเวอร์ได้ / ฉบับจริงตายตัว |
| `js/server.js` | ฉบับทดสอบมี `openServerDialog`, `serverLine` |
| `js/pages/login.js` | ฉบับทดสอบมี `devShortcuts()` และลิงก์เปลี่ยนเซิร์ฟเวอร์ |
| `js/pages/tools.js` | ฉบับทดสอบมี `serverCard()`, `aiCard()` |
| `js/pages/login.js`, `students.js`, `roles.js`, `tools.js` | placeholder ของช่องกรอก |
| `dev-tools/` | มีเฉพาะฉบับทดสอบ |

ขั้นตอนแนะนำ: แก้และทดสอบในฉบับทดสอบก่อน → คัดลอกไฟล์ที่แก้ไปฉบับจริง (ไฟล์ที่ไม่อยู่ในตารางข้างบนคัดลอกทับได้เลย ส่วนไฟล์ในตารางให้ย้ายเฉพาะส่วนที่แก้) → เปิดฉบับจริงตรวจอีกครั้ง

ตรวจความต่างได้ด้วย:

```bash
diff -rq student_identity_ui student_identity_frontend
```

---

## 11. แก้ปัญหาที่พบบ่อย

| อาการ | วิธีแก้ |
|---|---|
| `mock-backend.js` ขึ้น "Could not load the backend" | ตรวจ path ของโฟลเดอร์ backend และรัน `npm install` ใน `student_identity` ก่อน |
| port 3000 หรือ 5500 ถูกใช้อยู่ | ปิดโปรแกรมที่ใช้อยู่ หรือกำหนด `PORT=...` (ถ้าเปลี่ยน port ของ backend ให้เปลี่ยนเซิร์ฟเวอร์ในหน้าเว็บด้วย) |
| เปิด `index.html` ตรงๆ แล้วหน้าขาว | ต้องเปิดผ่าน `static-server.js`, `npx serve .` หรือ Live Server |
| ทางลัดนักพัฒนาขึ้น "ปิดอยู่" | เซิร์ฟเวอร์ที่เลือกรันแบบ production เปลี่ยนเป็น localhost (วิธี A) |
| หน้าเว็บยังต่อเซิร์ฟเวอร์เก่า | เปลี่ยนเซิร์ฟเวอร์จากลิงก์ใต้หน้า login หรือล้าง `localStorage` ของเว็บ |
| ข้อมูลทดสอบหายหมด | backend จำลองเก็บในหน่วยความจำ รีสตาร์ตแล้วข้อมูลหาย เป็นพฤติกรรมปกติ |
| claims ของ `internship-service` ได้ 403 "Missing required scope" | ข้อมูลตั้งต้นของ backend จำลองไม่มี scope ให้สร้างบริการใหม่แล้วใช้ key ของบริการนั้น |
