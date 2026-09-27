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

// Branches list
router.get('/branches', authenticate, (req, res) => {
  const branches = db.prepare('SELECT id, branch_code, branch_name, location FROM BRANCHES ORDER BY id ASC').all();
  res.json({ success: true, branches });
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

  // 1. Strict required fields and type validation
  if (!username || typeof username !== 'string' ||
      !password || typeof password !== 'string' ||
      !fullName || typeof fullName !== 'string' ||
      !roleCode || typeof roleCode !== 'string') {
    return res.status(400).json({ success: false, message: 'الحقول الإلزامية: اسم المستخدم، كلمة المرور، الاسم الكامل، والدور' });
  }

  const cleanFullName = fullName.trim();
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();
  const cleanRole = roleCode.trim();

  if (cleanFullName.length < 2 || cleanFullName.length > 100) {
    return res.status(400).json({ success: false, message: 'الاسم الكامل يجب أن يكون بين حرفين و100 حرف' });
  }

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
    return res.status(400).json({ success: false, message: 'اسم الدخول يجب أن يتكون من 3 إلى 30 حرفاً إنجليزياً أو رقماً دون مسافات' });
  }

  if (cleanPassword.length < 4 || cleanPassword.length > 100) {
    return res.status(400).json({ success: false, message: 'كلمة المرور يجب أن تكون بين 4 و100 خانة' });
  }

  // 2. Validate role exists in ROLES table
  const roleRecord = db.prepare('SELECT role_code FROM ROLES WHERE role_code = ?').get(cleanRole);
  if (!roleRecord) {
    return res.status(400).json({ success: false, message: 'الدور الوظيفي المحدد غير موجود في قائمة الأدوار المعتمدة' });
  }

  // 3. Validate branch exists in BRANCHES table
  const targetBranchId = branchId !== undefined && branchId !== null ? Number(branchId) : 1;
  const branchRecord = db.prepare('SELECT id FROM BRANCHES WHERE id = ?').get(targetBranchId);
  if (!branchRecord) {
    return res.status(400).json({ success: false, message: 'الفرع المحدد غير موجود في النظام' });
  }

  // 4. Check duplicate username
  const existing = db.prepare('SELECT id FROM USERS WHERE username = ?').get(cleanUsername);
  if (existing) {
    return res.status(400).json({ success: false, message: 'اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر' });
  }

  const { hash, salt } = hashPassword(cleanPassword);

  try {
    db.exec('BEGIN TRANSACTION;');

    const stmt = db.prepare(`
      INSERT INTO USERS (username, password_hash, salt, full_name, email, phone, role_code, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      cleanUsername,
      hash,
      salt,
      cleanFullName,
      email && typeof email === 'string' && email.trim().length > 0 ? email.trim() : null,
      phone && typeof phone === 'string' && phone.trim().length > 0 ? phone.trim() : null,
      cleanRole,
      targetBranchId
    );

    const userId = Number(result.lastInsertRowid);

    if (cleanRole === 'SUPERVISOR') {
      db.prepare('INSERT INTO SUPERVISORS (user_id, full_name, phone, specialization) VALUES (?, ?, ?, ?)')
        .run(userId, cleanFullName, phone && typeof phone === 'string' ? phone.trim() : null, 'مشرف إنتاج');
    }

    db.exec('COMMIT;');
    res.status(201).json({ success: true, message: 'تم إضافة المستخدم بنجاح', userId });
  } catch (err: any) {
    try { db.exec('ROLLBACK;'); } catch {}
    console.error('User creation error:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ المستخدم الجديد' });
  }
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
