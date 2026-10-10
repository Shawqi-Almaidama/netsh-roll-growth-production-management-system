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

// Helper to create deduplicated low-stock notifications for relevant operational roles
export function triggerLowStockNotifications(
  products: Array<{
    id?: number;
    product_code?: string;
    product_name: string;
    current_stock: number;
    min_stock_alert: number;
    unit?: string;
  }>,
  contextRef?: string
) {
  try {
    const lowItems = products.filter(p => Number(p.current_stock) <= Number(p.min_stock_alert));
    if (lowItems.length === 0) return;

    const targetRoles = ['WAREHOUSE_KEEPER', 'PROD_MANAGER', 'SALES_OFFICER', 'ADMIN'];
    const summaryText = lowItems
      .map(
        p =>
          `${p.product_name}${p.product_code ? ` (${p.product_code})` : ''}: الرصيد الحالي ${p.current_stock} ${p.unit || 'وحدة'} / حد الإنذار ${p.min_stock_alert} ${p.unit || 'وحدة'}`
      )
      .join(' — ');

    const hasZeroStock = lowItems.some(p => Number(p.current_stock) <= 0);
    const notifType: 'WARNING' | 'ALERT' = hasZeroStock ? 'ALERT' : 'WARNING';
    const title = hasZeroStock
      ? 'تنبيه حرج: نفاد أو انخفاض حاد في مخزون المنتجات'
      : 'تنبيه: انخفاض مخزون بعض المنتجات للحد الأدنى';
    const message = contextRef
      ? `بعد العملية (${contextRef})، وصلت الأصناف التالية إلى الحد الأدنى أو دونه: ${summaryText}`
      : `الأصناف التالية وصلت إلى حد الإنذار الأدنى للمخزون وتحتاج إلى توريد: ${summaryText}`;

    const checkUnreadProductStmt = db.prepare(`
      SELECT id FROM NOTIFICATIONS
      WHERE role_target = ? AND is_read = 0
        AND (title LIKE '%انخفاض مخزون%' OR title LIKE '%مخزون المنتجات%')
        AND message LIKE ?
      LIMIT 1
    `);

    for (const role of targetRoles) {
      // Check if all lowItems already have an active unread notification for this role
      const unnotifiedItems = lowItems.filter(p => {
        const key = p.product_code ? `%(${p.product_code})%` : `%${p.product_name}%`;
        return !checkUnreadProductStmt.get(role, key);
      });

      if (unnotifiedItems.length > 0) {
        createNotification({
          roleTarget: role,
          title,
          message,
          type: notifType,
          link: '/products-customers'
        });
      }
    }
  } catch (e) {
    console.error('Error triggering low stock notifications:', e);
  }
}

// Helper to resolve unread low-stock notifications when a product is restocked above min_stock_alert
export function resolveLowStockNotificationsIfRestocked(productId: number) {
  try {
    const prod = db
      .prepare('SELECT id, product_code, product_name, current_stock, min_stock_alert FROM PRODUCTS WHERE id = ?')
      .get(productId) as any;
    if (!prod) return;

    if (Number(prod.current_stock) > Number(prod.min_stock_alert)) {
      db.prepare(`
        UPDATE NOTIFICATIONS
        SET is_read = 1
        WHERE is_read = 0
          AND (title LIKE '%انخفاض مخزون%' OR title LIKE '%مخزون المنتجات%')
          AND (message LIKE ? OR message LIKE ?)
      `).run(`%${prod.product_name}%`, `%${prod.product_code}%`);
    }
  } catch (e) {
    console.error('Error resolving low stock notifications:', e);
  }
}
