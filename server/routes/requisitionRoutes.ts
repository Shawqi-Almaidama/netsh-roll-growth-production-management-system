import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, requireRoles, AuthenticatedRequest, createNotification } from '../auth.js';

const router = Router();

// Generate distinct Request Number: REQ-YYYYMMDD-XXXX
function generateRequestNo(type: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefixMap: Record<string, string> = {
    CHICKS: 'CHK',
    FEED: 'FED',
    TREATMENT: 'TRT',
    SUPPLY: 'SUP'
  };
  const prefix = prefixMap[type] || 'REQ';
  const countRecord = db.prepare(`SELECT COUNT(*) as count FROM REQUISITIONS WHERE request_date LIKE ?`).get(`${new Date().toISOString().slice(0, 7)}%`) as any;
  const seq = String((countRecord?.count || 0) + 1).padStart(4, '0');
  return `REQ-${prefix}-${dateStr}-${seq}`;
}

// -------------------------------------------------------------
// GET /requisitions - List with search and filtering
// -------------------------------------------------------------
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
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

  // If user is SUPERVISOR, by default show all or restrict if needed (we allow supervisor to view all or own)
  if (type) {
    query += ' AND r.req_type = ?';
    params.push(String(type));
  }
  if (status) {
    query += ' AND r.status = ?';
    params.push(String(status));
  }
  if (requesterId) {
    query += ' AND r.requester_id = ?';
    params.push(Number(requesterId));
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
router.get('/:id', authenticate, (req, res) => {
  const reqId = Number(req.params.id);

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
router.post('/', authenticate, requireRoles('SUPERVISOR', 'PROD_MANAGER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
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
    if (!itm.itemName || !itm.quantity || Number(itm.quantity) <= 0) {
      return res.status(400).json({ success: false, message: `البند رقم ${i + 1} غير مكتمل: الاسم والكمية الموجبة مطلوبان` });
    }
  }

  const initialStatus = status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED';
  const requestNo = generateRequestNo(reqType);
  const finalDate = requestDate || new Date().toISOString().slice(0, 10);

  try {
    db.exec('BEGIN TRANSACTION;');

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
        itm.itemName.trim(),
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
    db.exec('ROLLBACK;');
    console.error('Error creating requisition:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ الطلب: ' + err.message });
  }
});

// -------------------------------------------------------------
// POST /requisitions/:id/review - Review Requisition (UC-08, FR-07)
// Transition: SUBMITTED / UNDER_REVIEW -> APPROVED / REJECTED
// Only PROD_MANAGER and ADMIN
// -------------------------------------------------------------
router.post('/:id/review', authenticate, requireRoles('PROD_MANAGER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const reqId = Number(req.params.id);
  const { decision, reviewNotes } = req.body; // decision: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED'

  if (!decision || !['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'].includes(decision)) {
    return res.status(400).json({ success: false, message: 'قرار المراجعة غير صالح (يجب أن يكون UNDER_REVIEW أو APPROVED أو REJECTED أو COMPLETED)' });
  }

  const requisition = db.prepare('SELECT id, request_no, requester_id, status FROM REQUISITIONS WHERE id = ?').get(reqId) as any;
  if (!requisition) {
    return res.status(404).json({ success: false, message: 'طلب الاحتياج غير موجود' });
  }

  // Validate status transition integrity (Rule 38)
  if (requisition.status === 'REJECTED' && decision === 'APPROVED') {
    return res.status(400).json({
      success: false,
      message: 'لا يمكن اعتماد طلب مرفوض مباشرة. يجب إعادة تقديم الطلب أو مراجعته أولاً'
    });
  }

  const reviewDate = new Date().toISOString().slice(0, 10);

  db.prepare(`
    UPDATE REQUISITIONS
    SET status = ?,
        reviewer_id = ?,
        review_date = ?,
        review_notes = COALESCE(?, review_notes)
    WHERE id = ?
  `).run(decision, req.user!.id, reviewDate, reviewNotes || null, reqId);

  // Notify Requester about the decision
  const decisionText = decision === 'APPROVED' ? 'اعتماد' : decision === 'REJECTED' ? 'رفض' : decision === 'UNDER_REVIEW' ? 'قيد المراجعة' : 'اكتمال';
  const notifType = decision === 'APPROVED' ? 'SUCCESS' : decision === 'REJECTED' ? 'ALERT' : 'INFO';

  createNotification({
    userId: requisition.requester_id,
    title: `تحديث حالة طلبك: ${requisition.request_no}`,
    message: `تم ${decisionText} الطلب من قِبل ${req.user!.fullName}. ملاحظات: ${reviewNotes || 'لا توجد ملاحظات إضافية'}`,
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
