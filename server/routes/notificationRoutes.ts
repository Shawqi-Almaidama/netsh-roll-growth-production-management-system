import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, AuthenticatedRequest } from '../auth.js';

const router = Router();

// GET /api/notifications - List notifications for current user/role
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const roleCode = req.user!.roleCode;

  const notifications = db.prepare(`
    SELECT id, title, message, type, link, is_read, created_at
    FROM NOTIFICATIONS
    WHERE user_id = ? OR role_target = ? OR role_target = 'ALL'
    ORDER BY id DESC
    LIMIT 100
  `).all(userId, roleCode);

  const unreadCount = (db.prepare(`
    SELECT COUNT(*) as count
    FROM NOTIFICATIONS
    WHERE (user_id = ? OR role_target = ? OR role_target = 'ALL') AND is_read = 0
  `).get(userId, roleCode) as any)?.count || 0;

  res.json({ success: true, notifications, unreadCount });
});

// PUT /api/notifications/:id/read - Mark single as read
router.put('/:id/read', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const notifId = Number(req.params.id);
  db.prepare('UPDATE NOTIFICATIONS SET is_read = 1 WHERE id = ?').run(notifId);
  res.json({ success: true, message: 'تم تعليم الإشعار كمقروء' });
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const roleCode = req.user!.roleCode;

  db.prepare(`
    UPDATE NOTIFICATIONS
    SET is_read = 1
    WHERE (user_id = ? OR role_target = ? OR role_target = 'ALL') AND is_read = 0
  `).run(userId, roleCode);

  res.json({ success: true, message: 'تم تعليم جميع الإشعارات كمقروءة' });
});

export default router;
