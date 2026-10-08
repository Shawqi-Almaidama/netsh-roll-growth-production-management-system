import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, requireRoles, AuthenticatedRequest, createNotification } from '../auth.js';

const router = Router();

// -------------------------------------------------------------
// REQUISITION STATE MACHINE (Rules 9, 10, 11, 12, 13, 14, 15)
// -------------------------------------------------------------
export const ALLOWED_REQUISITION_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['COMPLETED'],
  REJECTED: [],
  COMPLETED: []
};

export function isValidRequisitionTransition(currentStatus: string, nextStatus: string): boolean {
  const allowed = ALLOWED_REQUISITION_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(nextStatus);
}

// Generate distinct Request Number: REQ-PREFIX-YYYYMMDD-XXXX (verified unique in DB)
function generateRequestNo(type: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefixMap: Record<string, string> = {
    CHICKS: 'CHK',
    FEED: 'FED',
    TREATMENT: 'TRT',
    SUPPLY: 'SUP'
  };
  const prefix = prefixMap[type] || 'REQ';
  const maxRecord = db.prepare('SELECT COALESCE(MAX(id), 0) as maxId FROM REQUISITIONS').get() as any;
  let nextNum = (maxRecord?.maxId || 0) + 1;
  const checkStmt = db.prepare('SELECT 1 FROM REQUISITIONS WHERE request_no = ?');
  while (true) {
    const candidate = `REQ-${prefix}-${dateStr}-${String(nextNum).padStart(4, '0')}`;
    if (!checkStmt.get(candidate)) {
      return candidate;
    }
    nextNum++;
  }
}

// -------------------------------------------------------------
// GET /requisitions - List with search and filtering
// -------------------------------------------------------------
router.get('/', authenticate, requireRoles('SUPERVISOR', 'PROD_MANAGER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { type, status, requesterId, farmId, startDate, endDate, search } = req.query;

  let query = `
    SELECT r.id, r.request_no, r.req_type, r.requester_id, r.farm_id, r.house_id, r.flock_id,
           r.request_date, r.urgency, r.status, r.reviewer_id, r.review_date, r.review_notes,
           r.notes, r.created_at,
           u.full_name as requester_name, u.role_code as requester_role,
           rev.full_name as reviewer_name,
           f.farm_name, h.house_name, fl.flock_code,
           (SELECT COUNT(*) FROM REQUISITION_ITEMS ri WHERE ri.requisition_id = r.id) as items_count,
           (SELECT SUM(quantity) FROM REQUISITION_ITEMS ri WHERE ri.requisition_id = r.id) as total_quantity
    FROM REQUISITIONS r
    JOIN USERS u ON r.requester_id = u.id
    LEFT JOIN USERS rev ON r.reviewer_id = rev.id
    LEFT JOIN FARMS f ON r.farm_id = f.id
    LEFT JOIN HOUSES h ON r.house_id = h.id
    LEFT JOIN FLOCKS fl ON r.flock_id = fl.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Object-level scope: SUPERVISOR only sees their own requisitions (VIEW_OWN_REQUISITIONS)
  if (req.user!.roleCode === 'SUPERVISOR') {
    query += ' AND r.requester_id = ?';
    params.push(req.user!.id);
  } else if (requesterId) {
    query += ' AND r.requester_id = ?';
    params.push(Number(requesterId));
  }

  if (type) {
    query += ' AND r.req_type = ?';
    params.push(String(type));
  }
  if (status) {
    query += ' AND r.status = ?';
    params.push(String(status));
  }
  if (farmId) {
    query += ' AND r.farm_id = ?';
    params.push(Number(farmId));
  }
  if (startDate) {
    query += ' AND r.request_date >= ?';
    params.push(String(startDate));
  }
  if (endDate) {
    query += ' AND r.request_date <= ?';
    params.push(String(endDate));
  }
  if (search) {
    query += ' AND (r.request_no LIKE ? OR r.notes LIKE ? OR u.full_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY r.id DESC LIMIT 200';

  const requisitions = db.prepare(query).all(...params);
  res.json({ success: true, requisitions });
});

// -------------------------------------------------------------
// GET /requisitions/:id - Get Details + Items (REQUISITION -> REQUISITION_ITEMS)
// -------------------------------------------------------------
router.get('/:id', authenticate, requireRoles('SUPERVISOR', 'PROD_MANAGER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const reqId = Number(req.params.id);
  if (!Number.isInteger(reqId) || reqId <= 0) {
    return res.status(400).json({ success: false, message: 'معرف طلب الاحتياج غير صالح' });
  }

  const requisition = db.prepare(`
    SELECT r.*,
           u.full_name as requester_name, u.email as requester_email, u.phone as requester_phone,
           rev.full_name as reviewer_name,
           f.farm_name, f.farm_code,
           h.house_name, h.house_code,
           fl.flock_code, fl.breed as flock_breed
    FROM REQUISITIONS r
    JOIN USERS u ON r.requester_id = u.id
    LEFT JOIN USERS rev ON r.reviewer_id = rev.id
    LEFT JOIN FARMS f ON r.farm_id = f.id
    LEFT JOIN HOUSES h ON r.house_id = h.id
    LEFT JOIN FLOCKS fl ON r.flock_id = fl.id
    WHERE r.id = ?
  `).get(reqId) as any;

  if (!requisition) {
    return res.status(404).json({ success: false, message: 'طلب الاحتياج غير موجود' });
  }

  // Object-level authorization for SUPERVISOR (BOLA / IDOR protection)
  if (req.user!.roleCode === 'SUPERVISOR' && requisition.requester_id !== req.user!.id) {
    return res.status(403).json({ success: false, message: 'غير مصرح لك بالاطلاع على طلب احتياج خاص بمستخدم آخر' });
  }

  const items = db.prepare(`
    SELECT id, item_type, item_ref_id, item_name, quantity, unit, specifications
    FROM REQUISITION_ITEMS
    WHERE requisition_id = ?
    ORDER BY id ASC
  `).all(reqId);

  res.json({ success: true, requisition: { ...requisition, items } });
});

// -------------------------------------------------------------
// POST /requisitions - Create Requisition (FR-03, FR-04, FR-05, FR-06)
// Bound to: Requester, Type, Date, Items, Quantities (BR-02)
// -------------------------------------------------------------
router.post('/', authenticate, requireRoles('SUPERVISOR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const {
    reqType,
    farmId,
    houseId,
    flockId,
    requestDate,
    urgency,
    status,
    notes,
    items
  } = req.body;

  // Validation
  if (!reqType || !['CHICKS', 'FEED', 'TREATMENT', 'SUPPLY'].includes(reqType)) {
    return res.status(400).json({ success: false, message: 'نوع الطلب غير صالح (يجب أن يكون CHICKS أو FEED أو TREATMENT أو SUPPLY)' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'يجب إضافة بند واحد على الأقل داخل الطلب (BR-02)' });
  }

  // Validate items
  for (let i = 0; i < items.length; i++) {
    const itm = items[i];
    const qty = Number(itm?.quantity);
    if (!itm || typeof itm.itemName !== 'string' || !itm.itemName.trim() || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: `البند رقم ${i + 1} غير مكتمل: الاسم والكمية الموجبة مطلوبان` });
    }
  }

  if (farmId !== undefined && farmId !== null && farmId !== '') {
    const f = db.prepare('SELECT id FROM FARMS WHERE id = ?').get(Number(farmId));
    if (!f) return res.status(400).json({ success: false, message: 'المزرعة المحددة غير موجودة' });
  }

  if (houseId !== undefined && houseId !== null && houseId !== '') {
    const h = db.prepare('SELECT id FROM HOUSES WHERE id = ?').get(Number(houseId));
    if (!h) return res.status(400).json({ success: false, message: 'الهنجر المحدد غير موجود' });
  }

  if (flockId !== undefined && flockId !== null && flockId !== '') {
    const fl = db.prepare('SELECT id FROM FLOCKS WHERE id = ?').get(Number(flockId));
    if (!fl) return res.status(400).json({ success: false, message: 'القطيع المحدد غير موجود' });
  }

  if (status && status !== 'DRAFT' && status !== 'SUBMITTED') {
    return res.status(400).json({
      success: false,
      message: 'لا يمكن إنشاء طلب بحالة مباشرة غير DRAFT أو SUBMITTED. يجب أن يمر الطلب عبر دورة العمل (Workflow)'
    });
  }

  if (urgency && !['LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'EMERGENCY'].includes(urgency)) {
    return res.status(400).json({ success: false, message: 'درجة الأهمية غير صالحة' });
  }

  const initialStatus = status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED';
  const finalDate = requestDate || new Date().toISOString().slice(0, 10);

  try {
    db.exec('BEGIN TRANSACTION;');
    const requestNo = generateRequestNo(reqType);

    const result = db.prepare(`
      INSERT INTO REQUISITIONS (
        request_no, req_type, requester_id, farm_id, house_id, flock_id,
        request_date, urgency, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      requestNo,
      reqType,
      req.user!.id,
      farmId || null,
      houseId || null,
      flockId || null,
      finalDate,
      urgency || 'NORMAL',
      initialStatus,
      notes || null
    );

    const requisitionId = Number(result.lastInsertRowid);

    const insertItem = db.prepare(`
      INSERT INTO REQUISITION_ITEMS (
        requisition_id, item_type, item_ref_id, item_name, quantity, unit, specifications
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const itm of items) {
      insertItem.run(
        requisitionId,
        itm.itemType || reqType,
        itm.itemRefId || null,
        String(itm.itemName).trim(),
        Number(itm.quantity),
        itm.unit || 'وحدة',
        itm.specifications || null
      );
    }

    db.exec('COMMIT;');

    // Trigger notification if submitted
    if (initialStatus === 'SUBMITTED') {
      const typeArabicMap: Record<string, string> = {
        CHICKS: 'كتاكيت',
        FEED: 'أعلاف',
        TREATMENT: 'علاجات وتحصينات',
        SUPPLY: 'مستلزمات تشغيلية'
      };
      createNotification({
        roleTarget: 'PROD_MANAGER',
        title: `طلب ${typeArabicMap[reqType]} جديد: ${requestNo}`,
        message: `تم تقديم طلب احتياج جديد بواسطة ${req.user!.fullName} بحاجة للمراجعة والاعتماد`,
        type: 'INFO',
        link: '/requisitions'
      });
    }

    res.status(201).json({
      success: true,
      message: `تم إنشاء طلب الاحتياج رقم ${requestNo} بنجاح`,
      requisitionId,
      requestNo
    });
  } catch (err: any) {
    try { db.exec('ROLLBACK;'); } catch {}
    console.error('Error creating requisition:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ طلب الاحتياج' });
  }
});

// -------------------------------------------------------------
// POST /requisitions/:id/submit - Submit a Draft Requisition (DRAFT -> SUBMITTED)
// -------------------------------------------------------------
router.post('/:id/submit', authenticate, requireRoles('SUPERVISOR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const reqId = Number(req.params.id);
  if (!Number.isInteger(reqId) || reqId <= 0) {
    return res.status(400).json({ success: false, message: 'معرف طلب الاحتياج غير صالح' });
  }

  const requisition = db.prepare('SELECT id, request_no, requester_id, status FROM REQUISITIONS WHERE id = ?').get(reqId) as any;
  if (!requisition) {
    return res.status(404).json({ success: false, message: 'طلب الاحتياج غير موجود' });
  }

  // Object-level check: only creator or ADMIN can submit draft
  if (requisition.requester_id !== req.user!.id && req.user!.roleCode !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'غير مصرح لك بتقديم هذا الطلب' });
  }

  if (!isValidRequisitionTransition(requisition.status, 'SUBMITTED')) {
    return res.status(400).json({
      success: false,
      error: 'انتقال حالة الطلب غير مسموح',
      message: `لا يمكن تغيير حالة الطلب من ${requisition.status} إلى SUBMITTED`
    });
  }

  db.prepare("UPDATE REQUISITIONS SET status = 'SUBMITTED' WHERE id = ?").run(reqId);

  createNotification({
    roleTarget: 'PROD_MANAGER',
    title: `طلب جديد تم تقديمه: ${requisition.request_no}`,
    message: `تم تقديم طلب احتياج بواسطة ${req.user!.fullName} بحاجة للمراجعة والاعتماد`,
    type: 'INFO',
    link: '/requisitions'
  });

  res.json({ success: true, message: 'تم تقديم طلب الاحتياج بنجاح للمراجعة والاعتماد', status: 'SUBMITTED' });
});

// -------------------------------------------------------------
// POST /requisitions/:id/review - Review Requisition (UC-08, FR-07)
// State Machine Enforced:
// SUBMITTED -> UNDER_REVIEW
// UNDER_REVIEW -> APPROVED | REJECTED
// APPROVED -> COMPLETED
// REJECTED -> terminal (no transitions)
// COMPLETED -> terminal (no transitions)
// Only PROD_MANAGER and ADMIN (ADMIN cannot bypass state integrity)
// -------------------------------------------------------------
router.post('/:id/review', authenticate, requireRoles('PROD_MANAGER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const reqId = Number(req.params.id);
  if (!Number.isInteger(reqId) || reqId <= 0) {
    return res.status(400).json({ success: false, message: 'معرف طلب الاحتياج غير صالح' });
  }

  const { decision, reviewNotes } = req.body; // decision: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED'

  if (!decision || typeof decision !== 'string' || !['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'].includes(decision)) {
    return res.status(400).json({ success: false, message: 'قرار المراجعة غير صالح (يجب أن يكون UNDER_REVIEW أو APPROVED أو REJECTED أو COMPLETED)' });
  }

  const requisition = db.prepare('SELECT id, request_no, requester_id, status FROM REQUISITIONS WHERE id = ?').get(reqId) as any;
  if (!requisition) {
    return res.status(404).json({ success: false, message: 'طلب الاحتياج غير موجود' });
  }

  // Enforce Requisition State Machine strictly for ALL roles including ADMIN
  if (!isValidRequisitionTransition(requisition.status, decision)) {
    return res.status(400).json({
      success: false,
      error: 'انتقال حالة الطلب غير مسموح',
      message: `لا يمكن تغيير حالة الطلب من ${requisition.status} إلى ${decision}`
    });
  }

  const reviewDate = new Date().toISOString().slice(0, 10);
  const cleanNotes = typeof reviewNotes === 'string' && reviewNotes.trim().length > 0 ? reviewNotes.trim() : null;

  try {
    db.exec('BEGIN TRANSACTION;');

    db.prepare(`
      UPDATE REQUISITIONS
      SET status = ?,
          reviewer_id = ?,
          review_date = ?,
          review_notes = COALESCE(?, review_notes)
      WHERE id = ?
    `).run(decision, req.user!.id, reviewDate, cleanNotes, reqId);

    db.exec('COMMIT;');
  } catch (err: any) {
    try { db.exec('ROLLBACK;'); } catch {}
    console.error('Error reviewing requisition:', err);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث حالة الطلب' });
  }

  // Notify Requester about the decision ONLY AFTER transaction commits
  const decisionText = decision === 'APPROVED' ? 'اعتماد' : decision === 'REJECTED' ? 'رفض' : decision === 'UNDER_REVIEW' ? 'قيد المراجعة' : 'اكتمال';
  const notifType = decision === 'APPROVED' ? 'SUCCESS' : decision === 'REJECTED' ? 'ALERT' : 'INFO';

  createNotification({
    userId: requisition.requester_id,
    title: `تحديث حالة طلبك: ${requisition.request_no}`,
    message: `تم ${decisionText} الطلب من قِبل ${req.user!.fullName}. ملاحظات: ${cleanNotes || 'لا توجد ملاحظات إضافية'}`,
    type: notifType,
    link: '/requisitions'
  });

  res.json({
    success: true,
    message: `تم تحديث حالة الطلب إلى (${decision}) بنجاح`,
    status: decision
  });
});

export default router;
