import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'natural_growth.sqlite');
export const db = new DatabaseSync(dbPath);

// Enable Foreign Key Enforcement
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Get initial seed password strictly from environment variable with zero hardcoded fallback
export function getSeedDefaultPassword(): string {
  const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
  if (!seedPassword || seedPassword.trim().length === 0 || seedPassword.trim() === '<SET_IN_ENVIRONMENT>') {
    throw new Error('FATAL SECURITY ERROR: SEED_DEFAULT_PASSWORD environment variable is not defined for initial database seeding.');
  }
  return seedPassword.trim();
}

// Hash password utility
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return testHash === hash;
}

// Initialize Academic Relational Schema matching Chapters 3 & 4
export function initializeDatabase() {
  db.exec(`
    -- ROLES
    CREATE TABLE IF NOT EXISTS ROLES (
      role_code TEXT PRIMARY KEY,
      role_name_ar TEXT NOT NULL,
      description TEXT,
      permissions TEXT NOT NULL
    );

    -- BRANCHES
    CREATE TABLE IF NOT EXISTS BRANCHES (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_code TEXT UNIQUE NOT NULL,
      branch_name TEXT NOT NULL,
      location TEXT NOT NULL,
      phone TEXT
    );

    -- USERS
    CREATE TABLE IF NOT EXISTS USERS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role_code TEXT NOT NULL,
      branch_id INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_code) REFERENCES ROLES(role_code),
      FOREIGN KEY (branch_id) REFERENCES BRANCHES(id)
    );

    -- SUPERVISORS
    CREATE TABLE IF NOT EXISTS SUPERVISORS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      specialization TEXT,
      assigned_farm_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE CASCADE
    );

    -- FARMS
    CREATE TABLE IF NOT EXISTS FARMS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_code TEXT UNIQUE NOT NULL,
      farm_name TEXT NOT NULL,
      location TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      branch_id INTEGER NOT NULL,
      supervisor_id INTEGER,
      status TEXT DEFAULT 'ACTIVE',
      FOREIGN KEY (branch_id) REFERENCES BRANCHES(id),
      FOREIGN KEY (supervisor_id) REFERENCES SUPERVISORS(id)
    );

    -- HOUSES (الهناجر)
    CREATE TABLE IF NOT EXISTS HOUSES (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      house_code TEXT NOT NULL,
      house_name TEXT NOT NULL,
      house_type TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      current_status TEXT DEFAULT 'ACTIVE',
      supervisor_id INTEGER,
      notes TEXT,
      FOREIGN KEY (farm_id) REFERENCES FARMS(id) ON DELETE CASCADE,
      FOREIGN KEY (supervisor_id) REFERENCES SUPERVISORS(id)
    );

    -- FLOCKS (القطعان)
    CREATE TABLE IF NOT EXISTS FLOCKS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      house_id INTEGER NOT NULL,
      flock_code TEXT UNIQUE NOT NULL,
      breed TEXT NOT NULL,
      initial_count INTEGER NOT NULL CHECK(initial_count > 0),
      current_count INTEGER NOT NULL CHECK(current_count >= 0),
      total_mortality INTEGER DEFAULT 0,
      entry_date TEXT NOT NULL,
      target_weight_g REAL DEFAULT 2100,
      status TEXT DEFAULT 'ACTIVE',
      notes TEXT,
      FOREIGN KEY (house_id) REFERENCES HOUSES(id) ON DELETE CASCADE
    );

    -- PRODUCTS (المنتجات)
    CREATE TABLE IF NOT EXISTS PRODUCTS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_code TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      unit_price REAL NOT NULL CHECK(unit_price >= 0),
      current_stock REAL NOT NULL DEFAULT 0 CHECK(current_stock >= 0),
      min_stock_alert REAL DEFAULT 10,
      description TEXT
    );

    -- FARM_PRODUCTS
    CREATE TABLE IF NOT EXISTS FARM_PRODUCTS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      current_qty REAL DEFAULT 0,
      FOREIGN KEY (farm_id) REFERENCES FARMS(id),
      FOREIGN KEY (product_id) REFERENCES PRODUCTS(id)
    );

    -- FEED_ITEMS (الأعلاف)
    CREATE TABLE IF NOT EXISTS FEED_ITEMS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_code TEXT UNIQUE NOT NULL,
      item_name TEXT NOT NULL,
      feed_type TEXT NOT NULL,
      protein_percentage REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'كجم',
      unit_cost REAL DEFAULT 0
    );

    -- TREATMENT_ITEMS (العلاجات واللقاحات)
    CREATE TABLE IF NOT EXISTS TREATMENT_ITEMS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_code TEXT UNIQUE NOT NULL,
      item_name TEXT NOT NULL,
      active_ingredient TEXT NOT NULL,
      dosage_form TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'عبوة',
      instructions TEXT
    );

    -- SUPPLY_ITEMS (المستلزمات)
    CREATE TABLE IF NOT EXISTS SUPPLY_ITEMS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_code TEXT UNIQUE NOT NULL,
      item_name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'قطعة'
    );

    -- REQUISITIONS (طلبات الاحتياج)
    CREATE TABLE IF NOT EXISTS REQUISITIONS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_no TEXT UNIQUE NOT NULL,
      req_type TEXT NOT NULL CHECK(req_type IN ('CHICKS', 'FEED', 'TREATMENT', 'SUPPLY')),
      requester_id INTEGER NOT NULL,
      farm_id INTEGER,
      house_id INTEGER,
      flock_id INTEGER,
      request_date TEXT NOT NULL,
      urgency TEXT DEFAULT 'NORMAL',
      status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED')),
      reviewer_id INTEGER,
      review_date TEXT,
      review_notes TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requester_id) REFERENCES USERS(id),
      FOREIGN KEY (reviewer_id) REFERENCES USERS(id),
      FOREIGN KEY (farm_id) REFERENCES FARMS(id),
      FOREIGN KEY (house_id) REFERENCES HOUSES(id),
      FOREIGN KEY (flock_id) REFERENCES FLOCKS(id)
    );

    -- REQUISITION_ITEMS (بنود الطلب)
    CREATE TABLE IF NOT EXISTS REQUISITION_ITEMS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requisition_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      item_ref_id INTEGER,
      item_name TEXT NOT NULL,
      quantity REAL NOT NULL CHECK(quantity > 0),
      unit TEXT NOT NULL,
      specifications TEXT,
      FOREIGN KEY (requisition_id) REFERENCES REQUISITIONS(id) ON DELETE CASCADE
    );

    -- CUSTOMERS (العملاء)
    CREATE TABLE IF NOT EXISTS CUSTOMERS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_code TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      commercial_reg TEXT,
      tax_number TEXT,
      customer_type TEXT DEFAULT 'WHOLESALE',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- SALES_INVOICES (فواتير المبيعات)
    CREATE TABLE IF NOT EXISTS SALES_INVOICES (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      invoice_date TEXT NOT NULL,
      subtotal REAL NOT NULL CHECK(subtotal >= 0),
      discount REAL DEFAULT 0 CHECK(discount >= 0),
      tax_amount REAL DEFAULT 0 CHECK(tax_amount >= 0),
      total_amount REAL NOT NULL CHECK(total_amount >= 0),
      payment_status TEXT DEFAULT 'PAID' CHECK(payment_status IN ('PAID', 'PENDING', 'PARTIAL')),
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES CUSTOMERS(id),
      FOREIGN KEY (user_id) REFERENCES USERS(id)
    );

    -- INVOICE_LINES (بنود الفاتورة)
    CREATE TABLE IF NOT EXISTS INVOICE_LINES (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL CHECK(quantity > 0),
      unit_price REAL NOT NULL CHECK(unit_price >= 0),
      line_total REAL NOT NULL CHECK(line_total >= 0),
      FOREIGN KEY (invoice_id) REFERENCES SALES_INVOICES(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES PRODUCTS(id)
    );

    -- WAREHOUSES (المخازن)
    CREATE TABLE IF NOT EXISTS WAREHOUSES (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_code TEXT UNIQUE NOT NULL,
      warehouse_name TEXT NOT NULL,
      location TEXT NOT NULL,
      capacity REAL NOT NULL,
      branch_id INTEGER,
      keeper_name TEXT,
      FOREIGN KEY (branch_id) REFERENCES BRANCHES(id)
    );

    -- WAREHOUSE_RECEIPTS (سندات التوريد)
    CREATE TABLE IF NOT EXISTS WAREHOUSE_RECEIPTS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_no TEXT UNIQUE NOT NULL,
      warehouse_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL CHECK(quantity > 0),
      supplier_name TEXT NOT NULL,
      received_by INTEGER NOT NULL,
      receipt_date TEXT NOT NULL,
      batch_number TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (warehouse_id) REFERENCES WAREHOUSES(id),
      FOREIGN KEY (product_id) REFERENCES PRODUCTS(id),
      FOREIGN KEY (received_by) REFERENCES USERS(id)
    );

    -- DAILY_PRODUCTION (الإنتاج اليومي)
    CREATE TABLE IF NOT EXISTS DAILY_PRODUCTION (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flock_id INTEGER NOT NULL,
      house_id INTEGER NOT NULL,
      record_date TEXT NOT NULL,
      production_quantity REAL NOT NULL DEFAULT 0 CHECK(production_quantity >= 0),
      unit TEXT NOT NULL DEFAULT 'طبق',
      mortality_count INTEGER NOT NULL DEFAULT 0 CHECK(mortality_count >= 0),
      feed_consumed_kg REAL NOT NULL DEFAULT 0 CHECK(feed_consumed_kg >= 0),
      water_consumed_liters REAL DEFAULT 0,
      avg_weight_g REAL DEFAULT 0,
      temperature_c REAL,
      humidity_pct REAL,
      supervisor_id INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (flock_id) REFERENCES FLOCKS(id) ON DELETE CASCADE,
      FOREIGN KEY (house_id) REFERENCES HOUSES(id) ON DELETE CASCADE,
      FOREIGN KEY (supervisor_id) REFERENCES USERS(id)
    );

    -- NOTIFICATIONS (الإشعارات)
    CREATE TABLE IF NOT EXISTS NOTIFICATIONS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      role_target TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'INFO',
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES USERS(id)
    );

    -- PERFORMANCE INDEXES
    CREATE INDEX IF NOT EXISTS idx_houses_farm ON HOUSES(farm_id);
    CREATE INDEX IF NOT EXISTS idx_flocks_house ON FLOCKS(house_id);
    CREATE INDEX IF NOT EXISTS idx_production_flock_date ON DAILY_PRODUCTION(flock_id, record_date);
    CREATE INDEX IF NOT EXISTS idx_req_status ON REQUISITIONS(status);
    CREATE INDEX IF NOT EXISTS idx_req_type ON REQUISITIONS(req_type);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON SALES_INVOICES(invoice_date);
    CREATE INDEX IF NOT EXISTS idx_receipts_date ON WAREHOUSE_RECEIPTS(receipt_date);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON NOTIFICATIONS(user_id, is_read);
  `);

  // Seed baseline data if ROLES is empty
  seedInitialData();
  syncTeamUsers();
}

function syncTeamUsers() {
  // Ensure roles exist with exact titles
  const insertOrUpdateRole = db.prepare(`
    INSERT INTO ROLES (role_code, role_name_ar, description, permissions)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(role_code) DO UPDATE SET role_name_ar = excluded.role_name_ar, description = excluded.description
  `);

  insertOrUpdateRole.run('ADMIN', 'مدير النظام', 'الإشراف الشامل، إدارة المستخدمين، الأدوار، الصلاحيات، والسجلات التاريخية', JSON.stringify(['ALL_PERMISSIONS']));
  insertOrUpdateRole.run('PROD_MANAGER', 'مدير قسم الإنتاج', 'مراجعة واعتماد ورفض طلبات الاحتياج، متابعة الهناجر والإنتاج والتقارير التشغيلية', JSON.stringify(['VIEW_HOUSES', 'VIEW_FLOCKS', 'VIEW_DAILY_PROD', 'REVIEW_REQUISITION', 'APPROVE_REQUISITION', 'VIEW_REPORTS', 'VIEW_DASHBOARD']));
  insertOrUpdateRole.run('SALES_OFFICER', 'مسؤول المبيعات والفواتير', 'إدارة المنتجات والعملاء، وإصدار فواتير المبيعات مع التحقق من توفر المخزون', JSON.stringify(['VIEW_PRODUCTS', 'MANAGE_PRODUCTS', 'VIEW_CUSTOMERS', 'MANAGE_CUSTOMERS', 'CREATE_SALES_INVOICE', 'VIEW_SALES_INVOICE']));
  insertOrUpdateRole.run('WAREHOUSE_KEEPER', 'أمين المخازن', 'إدارة توريد المنتجات للمخازن، وإصدار سندات التوريد وتحديث أرصدة المخزون', JSON.stringify(['VIEW_WAREHOUSES', 'CREATE_WAREHOUSE_RECEIPT', 'VIEW_WAREHOUSE_RECEIPTS', 'VIEW_PRODUCTS']));
  insertOrUpdateRole.run('ACCOUNTANT', 'المحاسب المالي', 'الاطلاع على فواتير المبيعات، سندات التوريد، والتقارير التشغيلية المعتمدة', JSON.stringify(['VIEW_SALES_INVOICE', 'VIEW_WAREHOUSE_RECEIPTS', 'VIEW_REPORTS', 'VIEW_DASHBOARD']));
  insertOrUpdateRole.run('SUPERVISOR', 'مشرف الإنتاج', 'إدارة الهناجر والقطعان، تسجيل الإنتاج اليومي، إنشاء ومتابعة طلبات الاحتياج', JSON.stringify(['VIEW_HOUSES', 'MANAGE_HOUSES', 'VIEW_FLOCKS', 'MANAGE_FLOCKS', 'MANAGE_DAILY_PROD', 'CREATE_REQUISITION', 'VIEW_OWN_REQUISITIONS']));

  // The 6 Approved Users (Single source of truth)
  const approvedUsers = [
    { username: 'admin', name: 'شوقي الميدمة', email: 'admin@naturalgrowth.com', role: 'ADMIN', branch_id: 1 },
    { username: 'ahmed_saber', name: 'أحمد صبر', email: 'ahmed_saber@naturalgrowth.com', role: 'PROD_MANAGER', branch_id: 1 },
    { username: 'mohammed_a', name: 'محمد الأعوج', email: 'mohammed@naturalgrowth.com', role: 'SALES_OFFICER', branch_id: 1 },
    { username: 'rayan_m', name: 'ريان موسى', email: 'rayan@naturalgrowth.com', role: 'WAREHOUSE_KEEPER', branch_id: 1 },
    { username: 'maher_n', name: 'ماهر نضير', email: 'maher@naturalgrowth.com', role: 'ACCOUNTANT', branch_id: 1 },
    { username: 'supervisor1', name: 'مشرف الإنتاج', email: 'supervisor@naturalgrowth.com', role: 'SUPERVISOR', branch_id: 1 }
  ];

  // 1. Ensure all 6 approved users exist and have updated credentials/role
  for (const u of approvedUsers) {
    const existing = db.prepare('SELECT id FROM USERS WHERE username = ?').get(u.username) as { id: number } | undefined;
    if (existing) {
      db.prepare('UPDATE USERS SET full_name = ?, role_code = ?, email = ?, is_active = 1 WHERE id = ?')
        .run(u.name, u.role, u.email, existing.id);
    } else {
      const seedPassword = getSeedDefaultPassword();
      const { hash, salt } = hashPassword(seedPassword);
      db.prepare(`
        INSERT INTO USERS (username, password_hash, salt, full_name, email, phone, role_code, branch_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(u.username, hash, salt, u.name, u.email, '0500123456', u.role, u.branch_id);
    }
  }

  // 2. Fetch approved user IDs map
  const userMap: Record<string, number> = {};
  for (const u of approvedUsers) {
    const rec = db.prepare('SELECT id FROM USERS WHERE username = ?').get(u.username) as { id: number };
    if (rec) userMap[u.username] = rec.id;
  }

  // 3. Remap references from legacy duplicate accounts to approved accounts
  const legacyAliases: [string, string][] = [
    ['shawqi', 'admin'],
    ['prod_manager', 'ahmed_saber'],
    ['sales_user', 'mohammed_a'],
    ['warehouse_user', 'rayan_m'],
    ['accountant1', 'maher_n'],
    ['super_prod', 'supervisor1']
  ];

  for (const [legacyUsername, targetUsername] of legacyAliases) {
    const legacyRec = db.prepare('SELECT id FROM USERS WHERE username = ?').get(legacyUsername) as { id: number } | undefined;
    const targetId = userMap[targetUsername];
    if (legacyRec && targetId) {
      const legacyId = legacyRec.id;
      try {
        db.prepare('UPDATE REQUISITIONS SET requester_id = ? WHERE requester_id = ?').run(targetId, legacyId);
        db.prepare('UPDATE REQUISITIONS SET reviewer_id = ? WHERE reviewer_id = ?').run(targetId, legacyId);
        db.prepare('UPDATE DAILY_PRODUCTION SET supervisor_id = ? WHERE supervisor_id = ?').run(targetId, legacyId);
        db.prepare('UPDATE SALES_INVOICES SET user_id = ? WHERE user_id = ?').run(targetId, legacyId);
        db.prepare('UPDATE WAREHOUSE_RECEIPTS SET received_by = ? WHERE received_by = ?').run(targetId, legacyId);
        db.prepare('UPDATE NOTIFICATIONS SET user_id = ? WHERE user_id = ?').run(targetId, legacyId);
        db.prepare('UPDATE SUPERVISORS SET user_id = ? WHERE user_id = ?').run(targetId, legacyId);
      } catch (e) {
        console.error('Error reassigning user references:', e);
      }
    }
  }

  // Ensure supervisor, requisition, and production references point directly to the correct role holders
  if (userMap['supervisor1']) {
    db.prepare('UPDATE SUPERVISORS SET user_id = ? WHERE user_id != ?').run(userMap['supervisor1'], userMap['supervisor1']);
    db.prepare('UPDATE DAILY_PRODUCTION SET supervisor_id = ? WHERE supervisor_id NOT IN (SELECT id FROM USERS)').run(userMap['supervisor1']);
  }
  if (userMap['ahmed_saber']) {
    db.prepare("UPDATE REQUISITIONS SET reviewer_id = ? WHERE reviewer_id IS NOT NULL AND reviewer_id NOT IN (SELECT id FROM USERS)").run(userMap['ahmed_saber']);
  }
  if (userMap['mohammed_a']) {
    db.prepare("UPDATE SALES_INVOICES SET user_id = ? WHERE user_id NOT IN (SELECT id FROM USERS)").run(userMap['mohammed_a']);
  }
  if (userMap['rayan_m']) {
    db.prepare("UPDATE WAREHOUSE_RECEIPTS SET received_by = ? WHERE received_by NOT IN (SELECT id FROM USERS)").run(userMap['rayan_m']);
  }

  // 4. Permanently delete the 6 duplicate legacy user accounts
  db.prepare(`
    DELETE FROM USERS WHERE username IN ('shawqi', 'prod_manager', 'sales_user', 'warehouse_user', 'accountant1', 'super_prod')
  `).run();

  // Ensure prices are consistently formatted in Yemeni Rial (YER)
  db.prepare("UPDATE PRODUCTS SET unit_price = 4500.0 WHERE product_code = 'PRD-EGGS-B30' AND unit_price < 100").run();
  db.prepare("UPDATE PRODUCTS SET unit_price = 4200.0 WHERE product_code = 'PRD-EGGS-W30' AND unit_price < 100").run();
  db.prepare("UPDATE PRODUCTS SET unit_price = 3200.0 WHERE product_code = 'PRD-CHK-LIVE' AND unit_price < 100").run();
  db.prepare("UPDATE PRODUCTS SET unit_price = 3800.0 WHERE product_code = 'PRD-CHK-CHILL' AND unit_price < 100").run();
  db.prepare("UPDATE PRODUCTS SET unit_price = 950.0 WHERE product_code = 'PRD-CHICKS-DOC' AND unit_price < 100").run();
  db.prepare("UPDATE SALES_INVOICES SET subtotal = 1350000.0, total_amount = 1350000.0 WHERE invoice_no = 'INV-20260914-001' AND total_amount < 10000").run();
  db.prepare("UPDATE INVOICE_LINES SET unit_price = 4500.0, line_total = 1350000.0 WHERE invoice_id = 1 AND unit_price < 100").run();
  db.prepare("UPDATE CUSTOMERS SET address = 'شارع الستين - صنعاء' WHERE customer_code = 'CUST-102'").run();
  db.prepare("UPDATE CUSTOMERS SET address = 'شارع حدة - مجمع المطاعم - صنعاء' WHERE customer_code = 'CUST-103'").run();
}

function seedInitialData() {
  const rolesCount = db.prepare('SELECT COUNT(*) as count FROM ROLES').get() as { count: number };
  if (rolesCount && rolesCount.count > 0) {
    return; // Already initialized
  }

  // 1. Roles (A-01 to A-06)
  const roles = [
    {
      code: 'SUPERVISOR',
      name_ar: 'مشرف الإنتاج',
      desc: 'إدارة الهناجر والقطعان، تسجيل الإنتاج اليومي، إنشاء ومتابعة طلبات الاحتياج',
      perms: JSON.stringify(['VIEW_HOUSES', 'MANAGE_HOUSES', 'VIEW_FLOCKS', 'MANAGE_FLOCKS', 'MANAGE_DAILY_PROD', 'CREATE_REQUISITION', 'VIEW_OWN_REQUISITIONS'])
    },
    {
      code: 'PROD_MANAGER',
      name_ar: 'مدير قسم الإنتاج',
      desc: 'مراجعة واعتماد ورفض طلبات الاحتياج، متابعة الهناجر والإنتاج والتقارير التشغيلية',
      perms: JSON.stringify(['VIEW_HOUSES', 'VIEW_FLOCKS', 'VIEW_DAILY_PROD', 'REVIEW_REQUISITION', 'APPROVE_REQUISITION', 'VIEW_REPORTS', 'VIEW_DASHBOARD'])
    },
    {
      code: 'SALES_OFFICER',
      name_ar: 'مسؤول المبيعات والفواتير',
      desc: 'إدارة المنتجات والعملاء، وإصدار فواتير المبيعات مع التحقق من توفر المخزون',
      perms: JSON.stringify(['VIEW_PRODUCTS', 'MANAGE_PRODUCTS', 'VIEW_CUSTOMERS', 'MANAGE_CUSTOMERS', 'CREATE_SALES_INVOICE', 'VIEW_SALES_INVOICE'])
    },
    {
      code: 'WAREHOUSE_KEEPER',
      name_ar: 'أمين المخازن',
      desc: 'إدارة توريد المنتجات للمخازن، وإصدار سندات التوريد وتحديث أرصدة المخزون',
      perms: JSON.stringify(['VIEW_WAREHOUSES', 'CREATE_WAREHOUSE_RECEIPT', 'VIEW_WAREHOUSE_RECEIPTS', 'VIEW_PRODUCTS'])
    },
    {
      code: 'ACCOUNTANT',
      name_ar: 'المحاسب المالي',
      desc: 'الاطلاع على فواتير المبيعات، سندات التوريد، والتقارير التشغيلية المعتمدة',
      perms: JSON.stringify(['VIEW_SALES_INVOICE', 'VIEW_WAREHOUSE_RECEIPTS', 'VIEW_REPORTS', 'VIEW_DASHBOARD'])
    },
    {
      code: 'ADMIN',
      name_ar: 'مدير النظام',
      desc: 'الإشراف الشامل، إدارة المستخدمين، الأدوار، الصلاحيات، والسجلات التاريخية',
      perms: JSON.stringify(['ALL_PERMISSIONS'])
    }
  ];

  const insertRole = db.prepare('INSERT OR REPLACE INTO ROLES (role_code, role_name_ar, description, permissions) VALUES (?, ?, ?, ?)');
  for (const r of roles) {
    insertRole.run(r.code, r.name_ar, r.desc, r.perms);
  }

  // 2. Branches
  const insertBranch = db.prepare('INSERT INTO BRANCHES (branch_code, branch_name, location, phone) VALUES (?, ?, ?, ?)');
  insertBranch.run('BR-HQ', 'الفرع الرئيسي - نتش رول جروث', 'المنطقة الصناعية الزراعية - قطاع أ', '0112233445');
  insertBranch.run('BR-NORTH', 'فرع مزارع المنطقة الشمالية', 'محافظة المزارع - وادي النخيل', '0112233446');

  // 3. Team Member Users (Actual Project Team Members - 6 Approved Users)
  const teamUsers = [
    { username: 'admin', name: 'شوقي الميدمة', email: 'admin@naturalgrowth.com', role: 'ADMIN', branch_id: 1 },
    { username: 'ahmed_saber', name: 'أحمد صبر', email: 'ahmed_saber@naturalgrowth.com', role: 'PROD_MANAGER', branch_id: 1 },
    { username: 'mohammed_a', name: 'محمد الأعوج', email: 'mohammed@naturalgrowth.com', role: 'SALES_OFFICER', branch_id: 1 },
    { username: 'rayan_m', name: 'ريان موسى', email: 'rayan@naturalgrowth.com', role: 'WAREHOUSE_KEEPER', branch_id: 1 },
    { username: 'maher_n', name: 'ماهر نضير', email: 'maher@naturalgrowth.com', role: 'ACCOUNTANT', branch_id: 1 },
    { username: 'supervisor1', name: 'مشرف الإنتاج', email: 'supervisor@naturalgrowth.com', role: 'SUPERVISOR', branch_id: 1 }
  ];

  const insertUser = db.prepare(`
    INSERT INTO USERS (username, password_hash, salt, full_name, email, phone, role_code, branch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const u of teamUsers) {
    const seedPassword = getSeedDefaultPassword();
    const { hash, salt } = hashPassword(seedPassword);
    insertUser.run(u.username, hash, salt, u.name, u.email, '0500123456', u.role, u.branch_id);
  }

  // 4. Supervisors table entry
  const supervisorUser = db.prepare("SELECT id FROM USERS WHERE username = 'supervisor1'").get() as { id: number };
  if (supervisorUser) {
    db.prepare('INSERT INTO SUPERVISORS (user_id, full_name, phone, specialization) VALUES (?, ?, ?, ?)')
      .run(supervisorUser.id, 'م. أحمد خالد المشرف', '0500123456', 'تربية دواجن بياض وتسمين معتمدة');
  }

  // 5. Farms
  const supRecord = db.prepare('SELECT id FROM SUPERVISORS LIMIT 1').get() as { id: number };
  const insertFarm = db.prepare('INSERT INTO FARMS (farm_code, farm_name, location, capacity, branch_id, supervisor_id) VALUES (?, ?, ?, ?, ?, ?)');
  insertFarm.run('FARM-01', 'مزرعة النمو الطبيعي 1 (التسمين)', 'الموقع الشرقي - حوض 4', 50000, 1, supRecord?.id || null);
  insertFarm.run('FARM-02', 'مزرعة النمو الطبيعي 2 (إنتاج البيض)', 'الموقع الغربي - حوض 8', 40000, 1, supRecord?.id || null);

  // Update assigned_farm_id for supervisor
  if (supRecord) {
    db.prepare('UPDATE SUPERVISORS SET assigned_farm_id = 1 WHERE id = ?').run(supRecord.id);
  }

  // 6. Houses (الهناجر)
  const insertHouse = db.prepare('INSERT INTO HOUSES (farm_id, house_code, house_name, house_type, capacity, current_status, supervisor_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertHouse.run(1, 'H-01', 'عنبر التسمين رقم 1', 'تسمين', 25000, 'ACTIVE', supRecord?.id || null, 'نظام تهوية طرد مركزي متطور وتدفئة أوتوماتيكية');
  insertHouse.run(1, 'H-02', 'عنبر التسمين رقم 2', 'تسمين', 25000, 'ACTIVE', supRecord?.id || null, 'نظام تبريد بالخلايا الكرتونية وحلمات مياه شرب');
  insertHouse.run(2, 'H-03', 'عنبر البياض النموذجي 1', 'بياض', 20000, 'ACTIVE', supRecord?.id || null, 'أقفاص آلية مع سيور جمع بيض أوتوماتيكية');
  insertHouse.run(2, 'H-04', 'عنبر البياض النموذجي 2', 'بياض', 20000, 'CLEANING', supRecord?.id || null, 'في مرحلة التعقيم والتهيئة للدفعة الجديدة');

  // 7. Flocks (القطعان)
  const insertFlock = db.prepare('INSERT INTO FLOCKS (house_id, flock_code, breed, initial_count, current_count, total_mortality, entry_date, target_weight_g, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertFlock.run(1, 'FLK-2026-01', 'روس 308 (Ross 308)', 24000, 23680, 320, '2026-08-10', 2150, 'ACTIVE', 'معدل تحويل غذائي ممتاز 1.55 وحيوية عالية');
  insertFlock.run(2, 'FLK-2026-02', 'كب 500 (Cobb 500)', 24500, 24210, 290, '2026-08-15', 2100, 'ACTIVE', 'نمو متناسق وخلو تام من الأعراض التنفسية');
  insertFlock.run(3, 'FLK-2026-03', 'هايسكس بني (Hisex Brown)', 19800, 19650, 150, '2026-07-01', 1900, 'ACTIVE', 'قمة الإنتاج 94% حجم بيض قياسي ممتاز');

  // 8. Products
  const insertProduct = db.prepare(`
    INSERT INTO PRODUCTS (product_code, product_name, category, unit, unit_price, current_stock, min_stock_alert, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertProduct.run('PRD-EGGS-B30', 'طبق بيض مائدة بني (30 بيضة)', 'بيض مائدة', 'طبق', 4500.00, 850, 100, 'بيض طازج من مزارع الشركة معبأ في أطباق كرتونية معقمة');
  insertProduct.run('PRD-EGGS-W30', 'طبق بيض مائدة أبيض (30 بيضة)', 'بيض مائدة', 'طبق', 4200.00, 620, 100, 'بيض أبيض نخب أول حجم سوبر');
  insertProduct.run('PRD-CHK-LIVE', 'دجاج لحم حي سوبر (متوسط 2.1 كجم)', 'دجاج حي', 'كجم', 3200.00, 4800, 500, 'دجاج تسمين حي عالي الجودة تغذية نباتية 100%');
  insertProduct.run('PRD-CHK-CHILL', 'دجاج مبرد طازج (أكياس مفرغة)', 'دجاج مبرد', 'كجم', 3800.00, 1200, 200, 'دجاج مجزر آلياً ومبرد وفق أعلى معايير السلامة');
  insertProduct.run('PRD-CHICKS-DOC', 'كتاكيت أمهات عمر يوم (روس 308)', 'كتاكيت عمر يوم', 'طائر', 950.00, 15000, 2000, 'كتاكيت خالية من المايكوبلازما والسالمونيلا مع التحصين');

  // 9. Feed Items
  const insertFeed = db.prepare('INSERT INTO FEED_ITEMS (item_code, item_name, feed_type, protein_percentage, unit, unit_cost) VALUES (?, ?, ?, ?, ?, ?)');
  insertFeed.run('FEED-01', 'علف بادي دواجن سوبر 23%', 'بادي', 23.0, 'كجم', 650.00);
  insertFeed.run('FEED-02', 'علف نامي دواجن متكامل 21%', 'نامي', 21.0, 'كجم', 620.00);
  insertFeed.run('FEED-03', 'علف ناهي دواجن تسمين 19%', 'ناهي', 19.0, 'كجم', 590.00);
  insertFeed.run('FEED-04', 'علف بياض إنتاجي محبب 17.5%', 'بياض', 17.5, 'كجم', 560.00);

  // 10. Treatment Items
  const insertTreatment = db.prepare('INSERT INTO TREATMENT_ITEMS (item_code, item_name, active_ingredient, dosage_form, unit, instructions) VALUES (?, ?, ?, ?, ?, ?)');
  insertTreatment.run('TRT-01', 'تحصين نيوكاسل + كلون (LaSota)', 'Newcastle Disease Virus', 'محلول تحصين بالرش والتقطير', 'فيال 1000 جرعة', 'يحفظ في درجة حرارة 2-8 درجات مئوية');
  insertTreatment.run('TRT-02', 'إنروفلوكساسين 20% فموي', 'Enrofloxacin 200mg/ml', 'محلول فموي للشرب', 'لتر', '0.5 مل لكل لتر ماء لمدة 3-5 أيام');
  insertTreatment.run('TRT-03', 'فيتامين AD3E + هـ سلينيوم مركز', 'Vitamin A, D3, E + Selenium', 'سائل فيتامينات ذائب', 'لتر', '1 مل لكل لتر ماء لرفع المناعة ومقاومة الإجهاد');
  insertTreatment.run('TRT-04', 'تولترازوريل مضاد كوكسيديا 2.5%', 'Toltrazuril 25mg/ml', 'محلول معلق للشرب', 'لتر', 'جرعة علاجية 28 مل / 100 كجم وزن حي يومين متتاليين');

  // 11. Supply Items
  const insertSupply = db.prepare('INSERT INTO SUPPLY_ITEMS (item_code, item_name, category, unit) VALUES (?, ?, ?, ?)');
  insertSupply.run('SUP-01', 'نشارة خشب بيضاء خشنة معقمة للفرشة', 'فرشة ورعاية', 'بالة 25 كجم');
  insertSupply.run('SUP-02', 'مساقي أوتوماتيكية معلقات نبل', 'شبكات مياه', 'قطعة');
  insertSupply.run('SUP-03', 'مطهر فيركون إس (Virkon S) المركز', 'تطهير وتعقيم', 'سطل 5 كجم');
  insertSupply.run('SUP-04', 'لمبات تدفئة سيراميك إنفراريد 250 واط', 'تدفئة وتحضين', 'قطعة');

  // 12. Warehouses
  const insertWarehouse = db.prepare('INSERT INTO WAREHOUSES (warehouse_code, warehouse_name, location, capacity, branch_id, keeper_name) VALUES (?, ?, ?, ?, ?, ?)');
  insertWarehouse.run('WH-01', 'مستودع التبريد والبيض الرئيسي', 'مقر الشركة الرئيسي - قسم التبريد', 50000, 1, 'عمر إبراهيم');
  insertWarehouse.run('WH-02', 'مستودع الأعلاف والمستلزمات المركزية', 'المنطقة الصناعية - قطاع المخازن', 200000, 1, 'عمر إبراهيم');

  // 13. Customers
  const insertCustomer = db.prepare(`
    INSERT INTO CUSTOMERS (customer_code, customer_name, phone, address, commercial_reg, tax_number, customer_type, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCustomer.run('CUST-101', 'شركة الدواجن المتحدة للتوزيع', '0551122334', 'سوق الجملة المركزي - مستودع 12 - صنعاء', '1010293847', '300129384700003', 'WHOLESALE', 'عميل استراتيجي - سداد فوري ونصف شهري');
  insertCustomer.run('CUST-102', 'سلسلة أسواق الخير الغذائية', '0552233445', 'شارع الستين - الإدارة العامة - صنعاء', '1010984736', '300984736100003', 'WHOLESALE', 'توريد أسبوعي لبيض المائدة والدجاج المبرد');
  insertCustomer.run('CUST-103', 'مطاعم مذاق الريف الحديث', '0553344556', 'شارع حدة - مجمع المطاعم - صنعاء', '1010876543', '300876543200003', 'RETAIL', 'توريد يومي دجاج لحم مبرد طازج');

  // 14. Seed initial Daily Production records
  const insertProd = db.prepare(`
    INSERT INTO DAILY_PRODUCTION (flock_id, house_id, record_date, production_quantity, unit, mortality_count, feed_consumed_kg, water_consumed_liters, avg_weight_g, temperature_c, humidity_pct, supervisor_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // Record for Flock 3 (layer - eggs)
  insertProd.run(3, 3, '2026-09-14', 620, 'طبق', 4, 2150, 4300, 1920, 24.5, 62, 1, 'إنتاج قياسي ممتاز ونسبة تشوهات أقل من 0.3%');
  insertProd.run(3, 3, '2026-09-15', 635, 'طبق', 3, 2180, 4350, 1925, 24.0, 60, 1, 'استقرار التغذية وارتفاع بسيط في نسبة الجمع الصباحي');
  // Record for Flock 1 (broiler - meat growth)
  insertProd.run(1, 1, '2026-09-14', 0, 'كجم', 8, 3100, 6200, 2120, 23.0, 58, 1, 'فحص عينات الوزن: متوسط 2120 جم - تجانس قطيع 91%');
  insertProd.run(1, 1, '2026-09-15', 0, 'كجم', 6, 3150, 6300, 2160, 23.2, 57, 1, 'استمرار النمو بمعدل يومي 62 جم فوق المنحنى القياسي');

  // 15. Seed baseline requisitions (CHICKS, FEED, TREATMENT, SUPPLY)
  const insertReq = db.prepare(`
    INSERT INTO REQUISITIONS (request_no, req_type, requester_id, farm_id, house_id, flock_id, request_date, urgency, status, reviewer_id, review_date, review_notes, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertReqItem = db.prepare(`
    INSERT INTO REQUISITION_ITEMS (requisition_id, item_type, item_ref_id, item_name, quantity, unit, specifications)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Req 1: FEED - Approved
  const resReq1 = insertReq.run('REQ-20260910-001', 'FEED', 1, 1, 1, 1, '2026-09-10', 'HIGH', 'APPROVED', 2, '2026-09-11', 'معتمد بالكامل وفق جدول التغذية المعتمد للقطيع 1', 'طلب دفعة علف ناهي تكفي 5 أيام');
  insertReqItem.run(Number(resReq1.lastInsertRowid), 'FEED_ITEM', 3, 'علف ناهي دواجن تسمين 19%', 15000, 'كجم', 'تغذية نباتية مكسبة مضادات أكسدة طبيعية');

  // Req 2: TREATMENT - Under review
  const resReq2 = insertReq.run('REQ-20260914-002', 'TREATMENT', 1, 2, 3, 3, '2026-09-14', 'NORMAL', 'UNDER_REVIEW', null, null, null, 'فيتامينات دعم إنتاج ومقويات لقشرة البيض');
  insertReqItem.run(Number(resReq2.lastInsertRowid), 'TREATMENT_ITEM', 3, 'فيتامين AD3E + هـ سلينيوم مركز', 20, 'لتر', 'لرفع مناعة قطيع البياض في عنبر 3');

  // Req 3: CHICKS - Submitted
  const resReq3 = insertReq.run('REQ-20260915-003', 'CHICKS', 1, 1, 2, 2, '2026-09-15', 'NORMAL', 'SUBMITTED', null, null, null, 'حجز دفعة كتاكيت لتسكين عنبر 4 بعد إتمام التعقيم');
  insertReqItem.run(Number(resReq3.lastInsertRowid), 'CHICK_BREED', 5, 'كتاكيت أمهات عمر يوم (روس 308)', 22000, 'طائر', 'سلالة روس 308 مطعمة بالهاتشري ضد الماريك');

  // Req 4: SUPPLY - Submitted
  const resReq4 = insertReq.run('REQ-20260915-004', 'SUPPLY', 1, 2, 4, null, '2026-09-15', 'HIGH', 'SUBMITTED', null, null, null, 'مستلزمات تعقيم وتجهيز فرشة عنبر 4');
  insertReqItem.run(Number(resReq4.lastInsertRowid), 'SUPPLY_ITEM', 1, 'نشارة خشب بيضاء خشنة معقمة للفرشة', 200, 'بالة 25 كجم', 'جافة ونظيفة بنسبة رطوبة أقل من 10%');
  insertReqItem.run(Number(resReq4.lastInsertRowid), 'SUPPLY_ITEM', 3, 'مطهر فيركون إس (Virkon S) المركز', 8, 'سطل 5 كجم', 'للتطهير النهائي والرش الضبابي');

  // 16. Seed baseline Sales Invoice & Lines
  const insertInv = db.prepare(`
    INSERT INTO SALES_INVOICES (invoice_no, customer_id, user_id, invoice_date, subtotal, discount, tax_amount, total_amount, payment_status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertLine = db.prepare(`
    INSERT INTO INVOICE_LINES (invoice_id, product_id, quantity, unit_price, line_total)
    VALUES (?, ?, ?, ?, ?)
  `);

  const resInv = insertInv.run('INV-20260914-001', 1, 3, '2026-09-14', 1350000.0, 0, 0, 1350000.0, 'PAID', 'فاتورة توريد بيض مائدة نخب أول مسددة نقداً');
  insertLine.run(Number(resInv.lastInsertRowid), 1, 300, 4500.00, 1350000.0);

  // 17. Seed baseline Warehouse Receipt
  const insertReceipt = db.prepare(`
    INSERT INTO WAREHOUSE_RECEIPTS (receipt_no, warehouse_id, product_id, quantity, supplier_name, received_by, receipt_date, batch_number, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertReceipt.run('RCP-20260913-001', 1, 1, 500, 'إنتاج مزرعة النمو 2 - عنبر 3', 4, '2026-09-13', 'BATCH-EG-0913', 'استلام دفعة إنتاج بيض مائدة وفحص الجودة مطابق للعينات');

  // 18. Seed Notifications
  const insertNotif = db.prepare(`
    INSERT INTO NOTIFICATIONS (user_id, role_target, title, message, type, link, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertNotif.run(null, 'PROD_MANAGER', 'طلب احتياج جديد بانتظار المراجعة', 'قام المشرف بتقديم طلب كتاكيت رقم REQ-20260915-003 بحاجة للمراجعة والاعتماد', 'WARNING', '/requisitions', 0);
  insertNotif.run(null, 'SUPERVISOR', 'تم اعتماد طلب الأعلاف', 'تم اعتماد طلب الأعلاف رقم REQ-20260910-001 من قِبل مدير قسم الإنتاج', 'SUCCESS', '/requisitions', 0);
  insertNotif.run(null, 'ADMIN', 'تسجيل دخول وتدقيق النظام', 'النظام يعمل بكفاءة وأمان كامل وفق متطلبات الفصلين الثالث والرابع', 'INFO', '/dashboard', 1);

  console.log('Baseline database seed completed successfully.');
}
