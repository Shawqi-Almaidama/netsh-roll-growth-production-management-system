import { Router, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { db } from '../db.js';
import { authenticate, requireRoles, AuthenticatedRequest } from '../auth.js';
import { runFullAcademicTestSuite } from '../testRunner.js';

const router = Router();

// Directory for safe backup storage
const backupsDir = path.join(process.cwd(), 'data', 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// -------------------------------------------------------------
// GET /api/system/audit-test - Academic Verification Runner (ADMIN ONLY)
// -------------------------------------------------------------
router.get('/audit-test', authenticate, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const testSummary = runFullAcademicTestSuite();
  res.json({
    success: true,
    suiteName: 'Natural Growth Academic Requirements & Rules Verification Suite (T-01 to T-23)',
    ...testSummary
  });
});

// -------------------------------------------------------------
// POST /api/system/backup - Create Transactional Safe Backup (ADMIN ONLY)
// -------------------------------------------------------------
router.post('/backup', authenticate, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const timestamp = Date.now();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-natural_growth-${dateStr}-${timestamp}.sqlite`;
    const targetPath = path.join(backupsDir, filename);

    // Use SQLite's native VACUUM INTO for consistent, zero-risk, live transaction snapshot
    db.exec(`VACUUM INTO '${targetPath}';`);

    const stats = fs.statSync(targetPath);
    const usersCount = (db.prepare('SELECT COUNT(*) as c FROM USERS').get() as any)?.c || 0;
    const invCount = (db.prepare('SELECT COUNT(*) as c FROM SALES_INVOICES').get() as any)?.c || 0;
    const prodCount = (db.prepare('SELECT COUNT(*) as c FROM DAILY_PRODUCTION').get() as any)?.c || 0;

    res.status(201).json({
      success: true,
      message: 'تم إنشاء نسخة احتياطية آمنة لقاعدة البيانات بنجاح',
      backup: {
        filename,
        sizeBytes: stats.size,
        sizeKb: Math.round(stats.size / 1024),
        createdAt: new Date().toISOString(),
        recordsSummary: {
          usersCount,
          invoicesCount: invCount,
          productionRecords: prodCount
        }
      }
    });
  } catch (err: any) {
    console.error('Backup creation error:', err);
    res.status(500).json({ success: false, message: 'فشل إنشاء النسخة الاحتياطية: ' + err.message });
  }
});

// -------------------------------------------------------------
// GET /api/system/backups - List Available Backups (ADMIN ONLY)
// -------------------------------------------------------------
router.get('/backups', authenticate, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!fs.existsSync(backupsDir)) {
      return res.json({ success: true, backups: [] });
    }

    const files = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith('.sqlite'))
      .map(filename => {
        const fullPath = path.join(backupsDir, filename);
        const stats = fs.statSync(fullPath);
        return {
          filename,
          sizeBytes: stats.size,
          sizeKb: Math.round(stats.size / 1024),
          createdAt: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => b.filename.localeCompare(a.filename));

    res.json({ success: true, backups: files });
  } catch (err: any) {
    console.error('List backups error:', err);
    res.status(500).json({ success: false, message: 'فشل استرجاع قائمة النسخ الاحتياطية' });
  }
});

// -------------------------------------------------------------
// POST /api/system/restore - Restore Database Safely (ADMIN ONLY)
// -------------------------------------------------------------
router.post('/restore', authenticate, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { filename } = req.body;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ success: false, message: 'اسم ملف النسخة الاحتياطية مطلوب' });
  }

  // Strict validation against path traversal
  const safeFilename = path.basename(filename);
  if (!/^[a-zA-Z0-9_\-\.]+\.sqlite$/.test(safeFilename)) {
    return res.status(400).json({ success: false, message: 'اسم الملف غير صالح أو يحتوي على رموز غير مسموحة' });
  }

  const backupFilePath = path.join(backupsDir, safeFilename);
  if (!fs.existsSync(backupFilePath)) {
    return res.status(404).json({ success: false, message: 'ملف النسخة الاحتياطية غير موجود' });
  }

  try {
    // 1. Verify backup file integrity by reading table count and USERS table
    const testDb = new DatabaseSync(backupFilePath);
    const verifyUsers = testDb.prepare('SELECT COUNT(*) as c FROM USERS').get() as any;
    testDb.close();

    if (!verifyUsers || verifyUsers.c < 1) {
      return res.status(400).json({ success: false, message: 'الملف لا يحتوي على بيانات مستخدمين صالحة' });
    }

    // 2. Take automatic pre-restore safety snapshot of CURRENT database
    const safetyFilename = `safety-pre-restore-${Date.now()}.sqlite`;
    const safetyPath = path.join(backupsDir, safetyFilename);
    db.exec(`VACUUM INTO '${safetyPath}';`);

    // 3. Atomically restore all application tables from backup database
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec(`ATTACH DATABASE '${backupFilePath}' AS backup_source;`);

    const tables = db.prepare(`
      SELECT name FROM backup_source.sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).all() as { name: string }[];

    db.exec('BEGIN TRANSACTION;');
    for (const { name } of tables) {
      db.exec(`DELETE FROM main.${name};`);
      db.exec(`INSERT INTO main.${name} SELECT * FROM backup_source.${name};`);
    }
    db.exec('COMMIT;');

    db.exec('DETACH DATABASE backup_source;');
    db.exec('PRAGMA foreign_keys = ON;');

    res.json({
      success: true,
      message: `تم استعادة النسخة الاحتياطية (${safeFilename}) بنجاح تام، وتم حفظ نقطة أمان قبل الاستعادة باسم (${safetyFilename})`
    });
  } catch (err: any) {
    console.error('Restore error:', err);
    try {
      db.exec('ROLLBACK;');
      db.exec('DETACH DATABASE backup_source;');
      db.exec('PRAGMA foreign_keys = ON;');
    } catch {}
    res.status(500).json({ success: false, message: 'فشل استعادة النسخة الاحتياطية: ' + err.message });
  }
});

export default router;
