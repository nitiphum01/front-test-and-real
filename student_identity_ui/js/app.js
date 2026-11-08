// Entry point: registers every page with the roles allowed to see it.
// The first page a role can see becomes its home page.

import { register, registerLogin, start } from './router.js';
import { renderLogin } from './pages/login.js';
import { renderOverview, renderProfile, renderPrivacy } from './pages/student.js';
import { renderStudents } from './pages/students.js';
import { renderRoles } from './pages/roles.js';
import { renderClients } from './pages/clients.js';
import { renderTools } from './pages/tools.js';

registerLogin(renderLogin);

register('/overview', { title: 'ภาพรวม', icon: 'layout-dashboard', roles: ['student'], render: renderOverview });
register('/profile', { title: 'โปรไฟล์', icon: 'user', roles: ['student'], render: renderProfile });
register('/privacy', { title: 'ความเป็นส่วนตัว', icon: 'shield-lock', roles: ['student'], render: renderPrivacy });
register('/students', { title: 'นักศึกษา', icon: 'users', roles: ['staff', 'instructor'], render: renderStudents });
register('/roles', { title: 'สิทธิ์ผู้ใช้', icon: 'id-badge-2', roles: ['staff', 'instructor'], render: renderRoles });
register('/clients', { title: 'Service clients', icon: 'key', roles: ['staff'], render: renderClients });
register('/tools', { title: 'ทดสอบการเชื่อมต่อ', icon: 'plug-connected', roles: ['staff', 'service'], render: renderTools });

start();
