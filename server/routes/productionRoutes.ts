import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, requireRoles, AuthenticatedRequest, createNotification } from '../auth.js';

const router = Router();

function getSupervisorRecordId(userId: number): number | null {
  const row = db.prepare('SELECT id FROM SUPERVISORS WHERE user_id = ?').get(userId) as { id: number } | undefined;
  return row ? row.id : null;
}

// -------------------------------------------------------------
// FARMS (المزارع)
// -------------------------------------------------------------
router.get('/farms', authenticate, requireRoles('SUPERVISOR', 'PROD_MANAGER', 'ADMIN'), (req, res) => {
  const farms = db.prepare(`
    SELECT f.id, f.farm_code, f.farm_name, f.location, f.capacity, f.branch_id, f.status,
           b.branch_name, s.full_name as supervisor_name,
           (SELECT COUNT(*) FROM HOUSES h WHERE h.farm_id = f.id) as house_count,
           (SELECT SUM(capacity) FROM HOUSES h WHERE h.farm_id = f.id) as current_houses_capacity
    FROM FARMS f
    LEFT JOIN BRANCHES b ON f.branch_id = b.id
    LEFT JOIN SUPERVISORS s ON f.supervisor_id = s.id
    ORDER BY f.id ASC
  `).all();
  res.json({ success: true, farms });
});

router.post('/farms', authenticate, requireRoles('PROD_MANAGER', 'ADMIN'), (req, res) => {
  const { farmCode, farmName, location, capacity, branchId, supervisorId } = req.body;

  if (!farmCode || !farmName || !location || !capacity) {
    return res.status(400).json({ success: false, message: 'كود المزرعة، اسمها، موقعها، وطاقتها الاستيعابية حقول إلزامية' });
  }

  const numCapacity = Number(capacity);
  if (!Number.isFinite(numCapacity) || numCapacity <= 0) {
    return res.status(400).json({ success: false, message: 'الطاقة الاستيعابية للمزرعة يجب أن تكون رقماً موجباً أكبر من صفر' });
  }

  const existing = db.prepare('SELECT id FROM FARMS WHERE farm_code = ?').get(String(farmCode).trim());
  if (existing) {
    return res.status(400).json({ success: false, message: 'كود المزرعة مسجل مسبقاً' });
  }

  const result = db.prepare(`
    INSERT INTO FARMS (farm_code, farm_name, location, capacity, branch_id, supervisor_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(String(farmCode).trim(), String(farmName).trim(), String(location).trim(), numCapacity, branchId || 1, supervisorId || null);

  res.status(201).json({ success: true, message: 'تم تسجيل بيانات المزرعة بنجاح', farmId: result.lastInsertRowid });
});

// -------------------------------------------------------------
// HOUSES (الهناجر) - FR-01, UC-02
// -------------------------------------------------------------
router.get('/houses', authenticate, requireRoles('SUPERVISOR', 'PROD_MANAGER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const isSupervisor = req.user!.roleCode === 'SUPERVISOR';
  const supId = isSupervisor ? (getSupervisorRecordId(req.user!.id) ?? -1) : null;

  const houses = db.prepare(`
    SELECT h.id, h.farm_id, h.house_code, h.house_name, h.house_type, h.capacity, h.current_status, h.supervisor_id, h.notes,
           f.farm_name, f.farm_code,
           s.full_name as supervisor_name,
           fl.id as active_flock_id, fl.flock_code as active_flock_code, fl.breed as active_flock_breed,
           fl.current_count as active_flock_count
    FROM HOUSES h
    JOIN FARMS f ON h.farm_id = f.id
    LEFT JOIN SUPERVISORS s ON h.supervisor_id = s.id
    LEFT JOIN FLOCKS fl ON fl.id = (
      SELECT id FROM FLOCKS
      WHERE house_id = h.id AND status = 'ACTIVE'
      ORDER BY id DESC LIMIT 1
    )
    ${isSupervisor ? 'WHERE h.supervisor_id = ?' : ''}
    GROUP BY h.id
    ORDER BY h.farm_id, h.house_code
  `).all(...(isSupervisor ? [supId] : []));
  res.json({ success: true, houses });
});

router.post('/houses', authenticate, requireRoles('PROD_MANAGER', 'ADMIN'), (req, res) => {
  const { farmId, houseCode, houseName, houseType, capacity, supervisorId, notes } = req.body;

  if (!farmId || !houseCode || !houseName || !houseType || !capacity) {
    return res.status(400).json({ success: false, message: 'جميع بيانات الهنجر الأساسية مطلوبة (المزرعة، الكود، الاسم، النوع، الطاقة)' });
  }

  const numCapacity = Number(capacity);
  if (!Number.isFinite(numCapacity) || numCapacity <= 0) {
    return res.status(400).json({ success: false, message: 'الطاقة الاستيعابية للهنجر يجب أن تكون رقماً موجباً أكبر من صفر' });
  }

  const farmExists = db.prepare('SELECT id FROM FARMS WHERE id = ?').get(Number(farmId));
  if (!farmExists) {
    return res.status(404).json({ success: false, message: 'المزرعة المحددة غير موجودة' });
  }

  const existing = db.prepare('SELECT id FROM HOUSES WHERE farm_id = ? AND house_code = ?').get(Number(farmId), String(houseCode).trim());
  if (existing) {
    return res.status(400).json({ success: false, message: 'كود الهنجر مسجل مسبقاً في هذه المزرعة' });
  }

  const result = db.prepare(`
    INSERT INTO HOUSES (farm_id, house_code, house_name, house_type, capacity, current_status, supervisor_id, notes)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `).run(Number(farmId), String(houseCode).trim(), String(houseName).trim(), String(houseType).trim(), numCapacity, supervisorId || null, notes || null);

  res.status(201).json({ success: true, message: 'تم إضافة الهنجر بنجاح', houseId: result.lastInsertRowid });
});

router.put('/houses/:id', authenticate, requireRoles('PROD_MANAGER', 'ADMIN'), (req, res) => {
  const houseId = Number(req.params.id);
  if (!Number.isInteger(houseId) || houseId <= 0) {
    return res.status(400).json({ success: false, message: 'معرف الهنجر غير صالح' });
  }

  const { houseName, houseType, capacity, currentStatus, supervisorId, notes } = req.body;

  const current = db.prepare('SELECT id FROM HOUSES WHERE id = ?').get(houseId);
  if (!current) {
    return res.status(404).json({ success: false, message: 'الهنجر غير موجود' });
  }

  if (capacity !== undefined && (!Number.isFinite(Number(capacity)) || Number(capacity) <= 0)) {
    return res.status(400).json({ success: false, message: 'الطاقة الاستيعابية يجب أن تكون رقماً موجباً أكبر من صفر' });
  }

  if (currentStatus && !['ACTIVE', 'CLEANING', 'MAINTENANCE', 'INACTIVE'].includes(currentStatus)) {
    return res.status(400).json({ success: false, message: 'حالة الهنجر غير صالحة' });
  }

  db.prepare(`
    UPDATE HOUSES
    SET house_name = COALESCE(?, house_name),
        house_type = COALESCE(?, house_type),
        capacity = COALESCE(?, capacity),
        current_status = COALESCE(?, current_status),
        supervisor_id = COALESCE(?, supervisor_id),
        notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(houseName || null, houseType || null, capacity ? Number(capacity) : null, currentStatus || null, supervisorId || null, notes || null, houseId);

  res.json({ success: true, message: 'تم تحديث بيانات الهنجر بنجاح' });
});

// -------------------------------------------------------------
// FLOCKS (القطعان) - FR-01, UC-02
// -------------------------------------------------------------
router.get('/flocks', authenticate, requireRoles('SUPERVISOR', 'PROD_MANAGER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const isSupervisor = req.user!.roleCode === 'SUPERVISOR';
  const supId = isSupervisor ? (getSupervisorRecordId(req.user!.id) ?? -1) : null;

  const flocks = db.prepare(`
    SELECT fl.id, fl.house_id, fl.flock_code, fl.breed, fl.initial_count, fl.current_count,
           fl.total_mortality, fl.entry_date, fl.target_weight_g, fl.status, fl.notes,
           h.house_name, h.house_code, h.house_type, h.supervisor_id,
           f.farm_name, f.farm_code
    FROM FLOCKS fl
    JOIN HOUSES h ON fl.house_id = h.id
    JOIN FARMS f ON h.farm_id = f.id
    ${isSupervisor ? 'WHERE h.supervisor_id = ?' : ''}
    ORDER BY fl.status ASC, fl.entry_date DESC
  `).all(...(isSupervisor ? [supId] : []));
  res.json({ success: true, flocks });
});

router.post('/flocks', authenticate, requireRoles('SUPERVISOR', 'PROD_MANAGER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { houseId, flockCode, breed, initialCount, entryDate, targetWeightG, notes } = req.body;

  if (!houseId || !flockCode || !breed || !initialCount || !entryDate) {
    return res.status(400).json({ success: false, message: 'الهنجر، كود القطيع، السلالة، العدد الابتدائي، وتاريخ التسكين حقول إلزامية' });
  }

  const numInitialCount = Number(initialCount);
  if (!Number.isInteger(numInitialCount) || numInitialCount <= 0) {
    return res.status(400).json({ success: false, message: 'يجب أن يكون العدد الابتدائي عدداً صحيحاً موجباً أكبر من صفر' });
  }

  const house = db.prepare('SELECT id, capacity, current_status, supervisor_id FROM HOUSES WHERE id = ?').get(Number(houseId)) as any;
  if (!house) {
    return res.status(404).json({ success: false, message: 'الهنجر المحدد غير موجود' });
  }

  // Enforce supervisor assignment scope
  if (req.user!.roleCode === 'SUPERVISOR') {
    const supId = getSupervisorRecordId(req.user!.id);
    if (!supId || house.supervisor_id !== supId) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتسكين قطيع في هنجر غير مسند إليك' });
    }
  }

  if (['CLEANING', 'MAINTENANCE', 'INACTIVE'].includes(house.current_status)) {
    return res.status(400).json({ success: false, message: 'الهنجر المحدد غير متاح للتسكين حالياً (في حالة تطهير أو صيانة أو غير نشط)' });
  }

  if (numInitialCount > house.capacity) {
    return res.status(400).json({ success: false, message: `العدد الابتدائي للقطيع (${numInitialCount}) يتجاوز الطاقة الاستيعابية للهنجر (${house.capacity})` });
  }

  // Check active flock in house
  const activeInHouse = db.prepare("SELECT id FROM FLOCKS WHERE house_id = ? AND status = 'ACTIVE'").get(Number(houseId));
  if (activeInHouse) {
    return res.status(400).json({ success: false, message: 'يوجد قطيع نشط بالفعل في هذا الهنجر، يجب تسوية القطيع الحالي أولاً' });
  }

  const existingCode = db.prepare('SELECT id FROM FLOCKS WHERE flock_code = ?').get(String(flockCode).trim());
  if (existingCode) {
    return res.status(400).json({ success: false, message: 'كود القطيع مسجل مسبقاً' });
  }

  const result = db.prepare(`
    INSERT INTO FLOCKS (house_id, flock_code, breed, initial_count, current_count, total_mortality, entry_date, target_weight_g, status, notes)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'ACTIVE', ?)
  `).run(Number(houseId), String(flockCode).trim(), String(breed).trim(), numInitialCount, numInitialCount, entryDate, targetWeightG ? Number(targetWeightG) : 2100, notes || null);

  // Set house status to ACTIVE
  db.prepare("UPDATE HOUSES SET current_status = 'ACTIVE' WHERE id = ?").run(Number(houseId));

  res.status(201).json({ success: true, message: 'تم تسكين القطيع الجديد بنجاح', flockId: result.lastInsertRowid });
});

router.put('/flocks/:id/status', authenticate, requireRoles('PROD_MANAGER', 'ADMIN'), (req, res) => {
  const flockId = Number(req.params.id);
  if (!Number.isInteger(flockId) || flockId <= 0) {
    return res.status(400).json({ success: false, message: 'معرف القطيع غير صالح' });
  }

  const { status, notes } = req.body;

  if (!['ACTIVE', 'HARVESTED', 'TRANSFERRED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'حالة القطيع غير صالحة' });
  }

  const flock = db.prepare('SELECT house_id FROM FLOCKS WHERE id = ?').get(flockId) as any;
  if (!flock) {
    return res.status(404).json({ success: false, message: 'القطيع غير موجود' });
  }

  db.prepare('UPDATE FLOCKS SET status = ?, notes = COALESCE(?, notes) WHERE id = ?').run(status, notes || null, flockId);

  if (status !== 'ACTIVE') {
    db.prepare("UPDATE HOUSES SET current_status = 'CLEANING' WHERE id = ?").run(flock.house_id);
  }

  res.json({ success: true, message: `تم تحديث حالة القطيع إلى (${status}) بنجاح` });
});

// -------------------------------------------------------------
// DAILY PRODUCTION (الإنتاج اليومي) - FR-02, UC-03
// -------------------------------------------------------------
router.get('/daily', authenticate, requireRoles('SUPERVISOR', 'PROD_MANAGER', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { flockId, houseId, startDate, endDate } = req.query;

  let query = `
    SELECT dp.id, dp.flock_id, dp.house_id, dp.record_date, dp.production_quantity, dp.unit,
           dp.mortality_count, dp.feed_consumed_kg, dp.water_consumed_liters, dp.avg_weight_g,
           dp.temperature_c, dp.humidity_pct, dp.supervisor_id, dp.notes, dp.created_at,
           fl.flock_code, fl.breed, fl.current_count,
           h.house_name, h.house_code, h.house_type,
           f.farm_name,
           u.full_name as supervisor_name
    FROM DAILY_PRODUCTION dp
    JOIN FLOCKS fl ON dp.flock_id = fl.id
    JOIN HOUSES h ON dp.house_id = h.id
    JOIN FARMS f ON h.farm_id = f.id
    JOIN USERS u ON dp.supervisor_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user!.roleCode === 'SUPERVISOR') {
    const supId = getSupervisorRecordId(req.user!.id) ?? -1;
    query += ' AND h.supervisor_id = ?';
    params.push(supId);
  }

  if (flockId) {
    query += ' AND dp.flock_id = ?';
    params.push(Number(flockId));
  }
  if (houseId) {
    query += ' AND dp.house_id = ?';
    params.push(Number(houseId));
  }
  if (startDate) {
    query += ' AND dp.record_date >= ?';
    params.push(String(startDate));
  }
  if (endDate) {
    query += ' AND dp.record_date <= ?';
    params.push(String(endDate));
  }

  query += ' ORDER BY dp.record_date DESC, dp.id DESC LIMIT 300';

  const records = db.prepare(query).all(...params);
  res.json({ success: true, records });
});

// POST /daily: Record daily production (SUPERVISOR, ADMIN)
// Updates flock count and mortality in an atomic transaction
router.post('/daily', authenticate, requireRoles('SUPERVISOR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const {
    flockId,
    recordDate,
    productionQuantity,
    unit,
    mortalityCount,
    feedConsumedKg,
    waterConsumedLiters,
    waterConsumedL,
    avgWeightG,
    temperatureC,
    humidityPct,
    notes
  } = req.body;

  const rawWater = waterConsumedLiters !== undefined ? waterConsumedLiters : waterConsumedL;

  if (!flockId || !recordDate) {
    return res.status(400).json({ success: false, message: 'القطيع وتاريخ التسجيل حقلان إلزاميان' });
  }

  const flock = db.prepare(`
    SELECT fl.id, fl.house_id, fl.current_count, fl.total_mortality, fl.flock_code, fl.status, h.supervisor_id
    FROM FLOCKS fl
    JOIN HOUSES h ON fl.house_id = h.id
    WHERE fl.id = ?
  `).get(Number(flockId)) as any;
  if (!flock) {
    return res.status(404).json({ success: false, message: 'القطيع غير موجود' });
  }

  if (req.user!.roleCode === 'SUPERVISOR') {
    const supId = getSupervisorRecordId(req.user!.id);
    if (!supId || flock.supervisor_id !== supId) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتسجيل الإنتاج اليومي لقطيع في هنجر غير مسند إليك' });
    }
  }

  if (flock.status !== 'ACTIVE') {
    return res.status(400).json({ success: false, message: 'لا يمكن تسجيل إنتاج يومي لقطيع غير نشط' });
  }

  if (
    (mortalityCount !== undefined && (!Number.isInteger(Number(mortalityCount)) || Number(mortalityCount) < 0)) ||
    (productionQuantity !== undefined && (!Number.isFinite(Number(productionQuantity)) || Number(productionQuantity) < 0)) ||
    (feedConsumedKg !== undefined && (!Number.isFinite(Number(feedConsumedKg)) || Number(feedConsumedKg) < 0)) ||
    (rawWater !== undefined && rawWater !== null && rawWater !== '' && (!Number.isFinite(Number(rawWater)) || Number(rawWater) < 0)) ||
    (avgWeightG !== undefined && avgWeightG !== null && avgWeightG !== '' && (!Number.isFinite(Number(avgWeightG)) || Number(avgWeightG) < 0)) ||
    (humidityPct !== undefined && humidityPct !== null && humidityPct !== '' && (!Number.isFinite(Number(humidityPct)) || Number(humidityPct) < 0 || Number(humidityPct) > 100)) ||
    (temperatureC !== undefined && temperatureC !== null && temperatureC !== '' && !Number.isFinite(Number(temperatureC)))
  ) {
    return res.status(400).json({ success: false, message: 'القيم الرقمية للإنتاج والوفيات والأعلاف والمياه والوزن والرطوبة والحرارة يجب أن تكون أرقاماً صالحة وغير سالبة' });
  }

  const mortCount = Math.floor(Number(mortalityCount) || 0);
  const prodQty = Number(productionQuantity) || 0;
  const feedKg = Number(feedConsumedKg) || 0;

  if (mortCount > flock.current_count) {
    return res.status(400).json({
      success: false,
      message: `عدد الوفيات المسجل (${mortCount}) يتجاوز العدد الحالي للقطيع (${flock.current_count})`
    });
  }

  // Check if duplicate entry for flock on same date
  const existingDay = db.prepare('SELECT id FROM DAILY_PRODUCTION WHERE flock_id = ? AND record_date = ?').get(Number(flockId), String(recordDate));
  if (existingDay) {
    return res.status(400).json({
      success: false,
      message: `تم تسجيل بيانات هذا القطيع لتاريخ (${recordDate}) مسبقاً. لتعديلها يرجى مراجعة مدير الإنتاج`
    });
  }

  // ATOMIC TRANSACTION: Record Daily Production + Decrement Flock Count + Update Mortality
  try {
    db.exec('BEGIN TRANSACTION;');

    const insertStmt = db.prepare(`
      INSERT INTO DAILY_PRODUCTION (
        flock_id, house_id, record_date, production_quantity, unit,
        mortality_count, feed_consumed_kg, water_consumed_liters, avg_weight_g,
        temperature_c, humidity_pct, supervisor_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      Number(flockId),
      flock.house_id,
      String(recordDate),
      prodQty,
      unit || 'طبق',
      mortCount,
      feedKg,
      rawWater ? Math.max(0, Number(rawWater)) : 0,
      avgWeightG ? Math.max(0, Number(avgWeightG)) : 0,
      temperatureC !== undefined && temperatureC !== null && temperatureC !== '' ? Number(temperatureC) : null,
      humidityPct !== undefined && humidityPct !== null && humidityPct !== '' ? Number(humidityPct) : null,
      req.user!.id,
      notes || null
    );

    // Update Flock statistics
    db.prepare(`
      UPDATE FLOCKS
      SET current_count = current_count - ?,
          total_mortality = total_mortality + ?
      WHERE id = ?
    `).run(mortCount, mortCount, Number(flockId));

    db.exec('COMMIT;');

    // Trigger Notification if high mortality (> 15)
    if (mortCount >= 15) {
      createNotification({
        roleTarget: 'PROD_MANAGER',
        title: 'تنبيه: ارتفاع معدل الوفيات في القطيع',
        message: `تم تسجيل ${mortCount} حالة وفاة في القطيع ${flock.flock_code} بتاريخ ${recordDate}. يرجى الفحص والمتابعة`,
        type: 'ALERT',
        link: '/production'
      });
    }

    res.status(201).json({
      success: true,
      message: 'تم تسجيل بيانات الإنتاج اليومي وتحديث حالة القطيع بنجاح',
      recordId: result.lastInsertRowid
    });
  } catch (err: any) {
    try { db.exec('ROLLBACK;'); } catch {}
    console.error('Error recording daily production:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ سجل الإنتاج اليومي' });
  }
});

// Supervisors list for select options
router.get('/supervisors', authenticate, requireRoles('SUPERVISOR', 'PROD_MANAGER', 'ADMIN'), (req, res) => {
  const list = db.prepare(`
    SELECT s.id, s.full_name, s.phone, s.specialization, u.username
    FROM SUPERVISORS s
    JOIN USERS u ON s.user_id = u.id
    WHERE u.is_active = 1
  `).all();
  res.json({ success: true, supervisors: list });
});

export default router;
