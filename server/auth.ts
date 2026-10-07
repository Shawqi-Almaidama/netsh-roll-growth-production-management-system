import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db, verifyPassword } from './db.js';

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.trim().length === 0 || secret.trim() === '<SET_IN_ENVIRONMENT>') {
    throw new Error('FATAL SECURITY ERROR: AUTH_SECRET environment variable is not defined.');
  }
  return secret.trim();
}

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  roleCode: string;
  branchId: number | null;
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Generate secure signed token
export function generateToken(user: AuthUser): string {
  const payload = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    roleCode: user.roleCode,
    branchId: user.branchId,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', getAuthSecret()).update(payloadStr).digest('base64url');
  return `${payloadStr}.${signature}`;
}

// Verify signed token
export function verifyToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadStr, signature] = parts;
    if (!payloadStr || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', getAuthSecret()).update(payloadStr).digest('base64url');
    const sigBuf = Buffer.from(signature, 'utf-8');
    const expectedBuf = Buffer.from(expectedSig, 'utf-8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }

    // Fetch user and permissions from DB
    const user = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.email, u.role_code, u.branch_id, u.is_active, r.permissions
      FROM USERS u
      JOIN ROLES r ON u.role_code = r.role_code
      WHERE u.id = ? AND u.is_active = 1
    `).get(payload.id) as any;

    if (!user) return null;

    let perms: string[] = [];
    try {
      perms = JSON.parse(user.permissions || '[]');
    } catch {
      perms = [];
    }

    return {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      roleCode: user.role_code,
      branchId: user.branch_id,
      permissions: perms
    };
  } catch (err) {
    return null;
  }
}

// Middleware: Authenticate user from Authorization header
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'يرجى تسجيل الدخول للوصول إلى هذا المورد' });
  }

  const token = authHeader.substring(7);
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'جلسة تسجيل الدخول منتهية أو غير صالحة' });
  }

  req.user = user;
  next();
}

// Middleware: Require specific role(s) - BR-06 Enforcement
export function requireRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح - يرجى تسجيل الدخول أولاً' });
    }

    // ADMIN always has full access
    if (req.user.roleCode === 'ADMIN') {
      return next();
    }

    const userRole = req.user.roleCode;
    const isAllowed = allowedRoles.includes(userRole);

    if (isAllowed) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `غير مصرح لك بتنفيذ هذه العملية. هذا الإجراء يتطلب صلاحية أحد الأدوار التالية: [${allowedRoles.join(', ')}] بينما دورك الحالي هو [${req.user.roleCode}]`
    });
  };
}

// Helper to record notification for user or role
export function createNotification(params: {
  userId?: number | null;
  roleTarget?: string | null;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  link?: string;
}) {
  try {
    db.prepare(`
      INSERT INTO NOTIFICATIONS (user_id, role_target, title, message, type, link, is_read)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(
      params.userId || null,
      params.roleTarget || null,
      params.title,
      params.message,
      params.type || 'INFO',
      params.link || null
    );
  } catch (e) {
    console.error('Error creating notification:', e);
  }
}
