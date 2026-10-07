import { Router, Response } from 'express';
import { db, verifyPassword, hashPassword } from '../db.js';
import { generateToken, authenticate, requireRoles, AuthenticatedRequest } from '../auth.js';

const router = Router();

// Brute-force protection: track failed login attempts per IP + username
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 15;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DUMMY_SALT = '0123456789abcdef0123456789abcdef';
const DUMMY_HASH = '0'.repeat(128);

// UC-01: تسجيل الدخول (Login)
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  const cleanUsername = username.trim();
  if (!cleanUsername || !password) {
    return res.status(400).json({ success: false, message: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const rateKey = `${clientIp}:${cleanUsername.toLowerCase()}`;
  const now = Date.now();
  const attemptRecord = loginAttempts.get(rateKey);

  if (attemptRecord) {
    if (now > attemptRecord.resetAt) {
      loginAttempts.delete(rateKey);
    } else if (attemptRecord.count >= MAX_LOGIN_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: 'تم تجاوز الحد المسموح لمحاولات تسجيل الدخول، يرجى الانتظار والمحاولة لاحقاً'
      });
    }
  }

  const user = db.prepare(`
    SELECT u.id, u.username, u.password_hash, u.salt, u.full_name, u.email, u.role_code, u.branch_id, u.is_active, r.role_name_ar, r.permissions
    FROM USERS u
    JOIN ROLES r ON u.role_code = r.role_code
    WHERE u.username = ?
  `).get(cleanUsername) as any;

  if (!user) {
    // Perform dummy hash verification to mitigate timing-based user enumeration
    verifyPassword(password, DUMMY_HASH, DUMMY_SALT);
    const prev = loginAttempts.get(rateKey);
    loginAttempts.set(rateKey, { count: (prev?.count || 0) + 1, resetAt: prev?.resetAt || now + LOGIN_WINDOW_MS });
    return res.status(401).json({ success: false, message: 'بيانات تسجيل الدخول غير صحيحة' });
  }

  const isMatch = verifyPassword(password, user.password_hash, user.salt);
  if (!isMatch) {
    const prev = loginAttempts.get(rateKey);
    loginAttempts.set(rateKey, { count: (prev?.count || 0) + 1, resetAt: prev?.resetAt || now + LOGIN_WINDOW_MS });
    return res.status(401).json({ success: false, message: 'بيانات تسجيل الدخول غير صحيحة' });
  }

  if (user.is_active !== 1) {
    return res.status(403).json({ success: false, message: 'هذا الحساب معطل، يرجى مراجعة مدير النظام' });
  }

  // Clear failed attempts on successful login
  loginAttempts.delete(rateKey);

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

// Roles list (ADMIN only)
router.get('/roles', authenticate, requireRoles('ADMIN'), (req, res) => {
  const roles = db.prepare('SELECT role_code, role_name_ar, description FROM ROLES').all();
  res.json({ success: true, roles });
});

// Branches list (ADMIN only)
router.get('/branches', authenticate, requireRoles('ADMIN'), (req, res) => {
  const branches = db.prepare('SELECT id, branch_code, branch_name, location FROM BRANCHES ORDER BY id ASC').all();
  res.json({ success: true, branches });
});

// Users management (A-06 ADMIN only)
router.get('/users', authenticate, requireRoles('ADMIN'), (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.email, u.phone, u.role_code, r.role_name_ar, u.is_active, u.created_at, u.branch_id, b.branch_name
    FROM USERS u
    JOIN ROLES r ON u.role_code = r.role_code
    LEFT JOIN BRANCHES b ON u.branch_id = b.id
    ORDER BY u.id ASC
  `).all();
  res.json({ success: true, users });
});

router.post('/users', authenticate, requireRoles('ADMIN'), (req, res) => {
  const { username, password, fullName, email, phone, roleCode, branchId, isActive } = req.body || {};

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

  if (cleanPassword.length < 8 || cleanPassword.length > 100) {
    return res.status(400).json({ success: false, message: 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل (بين 8 و100 خانة)' });
  }

  // 2. Validate role exists in ROLES table
  const roleRecord = db.prepare('SELECT role_code FROM ROLES WHERE role_code = ?').get(cleanRole);
  if (!roleRecord) {
    return res.status(400).json({ success: false, message: 'الدور الوظيفي المحدد غير موجود في قائمة الأدوار المعتمدة' });
  }

  // 3. Validate branch exists in BRANCHES table
  const targetBranchId = branchId !== undefined && branchId !== null && branchId !== '' ? Number(branchId) : 1;
  if (!Number.isInteger(targetBranchId) || targetBranchId <= 0) {
    return res.status(400).json({ success: false, message: 'معرف الفرع غير صالح' });
  }
  const branchRecord = db.prepare('SELECT id FROM BRANCHES WHERE id = ?').get(targetBranchId);
  if (!branchRecord) {
    return res.status(400).json({ success: false, message: 'الفرع المحدد غير موجود في النظام' });
  }

  // 4. Validate active status
  let targetIsActive = 1;
  if (isActive !== undefined && isActive !== null) {
    if (isActive === 0 || isActive === '0' || isActive === false) {
      targetIsActive = 0;
    } else if (isActive === 1 || isActive === '1' || isActive === true) {
      targetIsActive = 1;
    } else {
      return res.status(400).json({ success: false, message: 'قيمة حالة الحساب غير صالحة' });
    }
  }

  // 5. Check duplicate username
  const existing = db.prepare('SELECT id FROM USERS WHERE username = ?').get(cleanUsername);
  if (existing) {
    return res.status(400).json({ success: false, message: 'اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر' });
  }

  const { hash, salt } = hashPassword(cleanPassword);

  try {
    db.exec('BEGIN TRANSACTION;');

    const stmt = db.prepare(`
      INSERT INTO USERS (username, password_hash, salt, full_name, email, phone, role_code, branch_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      cleanUsername,
      hash,
      salt,
      cleanFullName,
      email && typeof email === 'string' && email.trim().length > 0 ? email.trim() : null,
      phone && typeof phone === 'string' && phone.trim().length > 0 ? phone.trim() : null,
      cleanRole,
      targetBranchId,
      targetIsActive
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

router.put('/users/:id/toggle', authenticate, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
  }

  const user = db.prepare('SELECT id, is_active, role_code FROM USERS WHERE id = ?').get(userId) as any;
  if (!user) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  if (userId === req.user!.id && user.is_active === 1) {
    return res.status(400).json({ success: false, message: 'لا يمكن لمدير النظام تعطيل حسابه الشخصي النشط لمنع قفل النظام' });
  }

  if (user.role_code === 'ADMIN' && user.is_active === 1) {
    const activeAdmins = (db.prepare("SELECT COUNT(*) as c FROM USERS WHERE role_code = 'ADMIN' AND is_active = 1").get() as any)?.c || 0;
    if (activeAdmins <= 1) {
      return res.status(400).json({ success: false, message: 'لا يمكن تعطيل آخر حساب مدير نظام (ADMIN) نشط في المنظومة لمنع فقدان القدرة على الإدارة' });
    }
  }

  const newStatus = user.is_active === 1 ? 0 : 1;
  db.prepare('UPDATE USERS SET is_active = ? WHERE id = ?').run(newStatus, userId);

  res.json({ success: true, message: `تم ${newStatus === 1 ? 'تفعيل' : 'تعطيل'} حساب المستخدم بنجاح`, newStatus });
});

// Reset User Password (ADMIN ONLY - FR-15, UC-01)
const handleResetPassword = (req: AuthenticatedRequest, res: Response) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
  }

  const { newPassword, password } = req.body || {};
  const rawPassword = newPassword !== undefined ? newPassword : password;

  if (!rawPassword || typeof rawPassword !== 'string') {
    return res.status(400).json({ success: false, message: 'يرجى إدخال كلمة المرور الجديدة' });
  }

  const cleanPassword = rawPassword.trim();
  if (cleanPassword.length < 8 || cleanPassword.length > 100) {
    return res.status(400).json({ success: false, message: 'كلمة المرور الجديدة يجب أن تتكون من 8 أحرف على الأقل (بين 8 و100 خانة)' });
  }

  const user = db.prepare('SELECT id, username, full_name FROM USERS WHERE id = ?').get(userId) as any;
  if (!user) {
    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
  }

  const { hash, salt } = hashPassword(cleanPassword);
  db.prepare('UPDATE USERS SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, userId);

  res.json({
    success: true,
    message: `تم إعادة تعيين كلمة المرور للمستخدم (${user.full_name}) بنجاح`
  });
};

router.put('/users/:id/reset-password', authenticate, requireRoles('ADMIN'), handleResetPassword);
router.post('/users/:id/reset-password', authenticate, requireRoles('ADMIN'), handleResetPassword);

export default router;
