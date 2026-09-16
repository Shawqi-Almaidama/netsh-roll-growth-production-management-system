import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { initializeDatabase } from './server/db.js';
import { runFullAcademicTestSuite } from './server/testRunner.js';

import authRoutes from './server/routes/authRoutes.js';
import productionRoutes from './server/routes/productionRoutes.js';
import requisitionRoutes from './server/routes/requisitionRoutes.js';
import productCustomerRoutes from './server/routes/productCustomerRoutes.js';
import salesRoutes from './server/routes/salesRoutes.js';
import warehouseRoutes from './server/routes/warehouseRoutes.js';
import reportRoutes from './server/routes/reportRoutes.js';
import dashboardRoutes from './server/routes/dashboardRoutes.js';
import notificationRoutes from './server/routes/notificationRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Initialize Database schemas, indexes, and baseline seeds
  initializeDatabase();

  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      system: 'Natural Growth Production Management System (نظام إدارة قسم الإنتاج - شركة نتش رول جروث)',
      version: '2.0.0',
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    });
  });

  // Academic Test Matrix Runner Endpoint (T-01 to T-23)
  app.get('/api/system/audit-test', (req, res) => {
    const testSummary = runFullAcademicTestSuite();
    res.json({
      success: true,
      suiteName: 'Natural Growth Academic Requirements & Rules Verification Suite (T-01 to T-23)',
      ...testSummary
    });
  });

  // Mount Application Routers
  app.use('/api/auth', authRoutes);
  app.use('/api/production', productionRoutes);
  app.use('/api/requisitions', requisitionRoutes);
  app.use('/api/catalog', productCustomerRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/warehouse', warehouseRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Vite Middleware (Dev) / Static Asset Serving (Production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Natural Growth ERP] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
