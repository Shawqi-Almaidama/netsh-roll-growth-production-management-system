import { Router, Response } from 'express';
import { db, verifyPassword, hashPassword } from '../db.js';
import { generateToken, authenticate, requireRoles, AuthenticatedRequest } from '../auth.js';

const router = Router();

// UC-01: تسجيل الدخول (Login)
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  const user = db.prepare(`
    SELECT u.id, u.username, u.password_hash, u.salt, u.full_name, u.email, u.role_code, u.branch_id, u.is_active, r.role_name_ar, r.permissions
    FROM USERS u
    JOIN ROLES r ON u.role_code = r.role_code
    WHERE u.username = ?
  `).get(username.trim()) as any;

  if (!user) {
    return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة (اسم المستخدم غير موجود)' });
  }

  if (user.is_active !== 1) {
    return res.status(403).json({ success: false, message: 'هذا الحساب معطل، يرجى مراجعة مدير النظام' });
  }

  const isMatch = verifyPassword(password, user.password_hash, user.salt);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
  }

  let perms: string[] = [];
  try {
    perms = JSON.parse(user.permissions || '[]');
  } catch {
    perms = [];
  }

  const authUser = {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    email: user.email,
    roleCode: user.role_code,
    branchId: user.branch_id,
    permissions: perms
  };

  const token = generateToken(authUser);

  res.json({
    success: true,
    message: `مرحباً بك، ${user.full_name}`,
    token,
    user: {
      ...authUser,
      roleNameAr: user.role_name_ar
    }
  });
});

// UC-01: التحقق من الجلسة الحالية
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.email, u.role_code, u.branch_id, r.role_name_ar, r.permissions, b.branch_name
    FROM USERS u
    JOIN ROLES r ON u.role_code = r.role_code
    LEFT JOIN BRANCHES b ON u.branch_id = b.id
    WHERE u.id = ?
  `).get(req.user!.id) as any;

  if (!user) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  let perms: string[] = [];
  try {
    perms = JSON.parse(user.permissions || '[]');
  } catch {
    perms = [];
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      roleCode: user.role_code,
      roleNameAr: user.role_name_ar,
      branchId: user.branch_id,
      branchName: user.branch_name,
      permissions: perms
    }
  });
});

// Roles list
router.get('/roles', authenticate, (req, res) => {
  const roles = db.prepare('SELECT role_code, role_name_ar, description FROM ROLES').all();
  res.json({ success: true, roles });
});

// Users management (A-06 ADMIN only)
router.get('/users', authenticate, requireRoles('ADMIN'), (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.email, u.phone, u.role_code, r.role_name_ar, u.is_active, u.created_at, b.branch_name
    FROM USERS u
    JOIN ROLES r ON u.role_code = r.role_code
    LEFT JOIN BRANCHES b ON u.branch_id = b.id
    ORDER BY u.id ASC
  `).all();
  res.json({ success: true, users });
});

router.post('/users', authenticate, requireRoles('ADMIN'), (req, res) => {
  const { username, password, fullName, email, phone, roleCode, branchId } = req.body;

  if (!username || !password || !fullName || !roleCode) {
    return res.status(400).json({ success: false, message: 'الحقول الإلزامية: اسم المستخدم، كلمة المرور، الاسم الكامل، والدور' });
  }

  const existing = db.prepare('SELECT id FROM USERS WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(400).json({ success: false, message: 'اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر' });
  }

  const { hash, salt } = hashPassword(password);
  const stmt = db.prepare(`
    INSERT INTO USERS (username, password_hash, salt, full_name, email, phone, role_code, branch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(username.trim(), hash, salt, fullName.trim(), email || null, phone || null, roleCode, branchId || 1);

  if (roleCode === 'SUPERVISOR') {
    db.prepare('INSERT INTO SUPERVISORS (user_id, full_name, phone, specialization) VALUES (?, ?, ?, ?)')
      .run(Number(result.lastInsertRowid), fullName.trim(), phone || null, 'مشرف إنتاج');
  }

  res.status(201).json({ success: true, message: 'تم إضافة المستخدم بنجاح', userId: result.lastInsertRowid });
});

router.put('/users/:id/toggle', authenticate, requireRoles('ADMIN'), (req, res) => {
  const userId = Number(req.params.id);
  const user = db.prepare('SELECT is_active FROM USERS WHERE id = ?').get(userId) as any;
  if (!user) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  const newStatus = user.is_active === 1 ? 0 : 1;
  db.prepare('UPDATE USERS SET is_active = ? WHERE id = ?').run(newStatus, userId);

  res.json({ success: true, message: `تم ${newStatus === 1 ? 'تفعيل' : 'تعطيل'} حساب المستخدم بنجاح`, newStatus });
});

export default router;
