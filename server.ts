import express from 'express';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import fs from 'fs';
import {
  generateDailyAiSummary,
  parseDocumentImage,
  processAiChat,
  setGeminiApiKey,
  testGeminiApiKey,
  getActiveGeminiApiKey,
} from './server/gemini';
import { postgresService } from './server/postgres';
import {
  generateBusinessMasterReportDoc,
  generateBusinessMasterReportHtml,
  generateRestaurantReportDoc,
  generateRestaurantReportHtml,
  generateProfitBySalesmanReportDoc,
  generateProfitByRestaurantReportDoc,
  generateProfitByItemReportDoc,
  generateProfitByBillReportDoc,
  generateCustomerSaleBillDoc,
  generateStockReportDoc,
  generateSalesReportDoc,
  generatePurchasesReportDoc,
} from './server/reports';
import { buildAiLedgerMasterAuditReport } from './server/ledgerAudit';
import { generateAiLedgerAuditDoc, generateAiLedgerAuditHtml } from './server/ledgerAuditHtml';
import { ExpenseAllocationMethod, OrderStatus, PaymentMethod } from './src/types';
import {
  requireAuth,
  requireRole,
  tenantContextMiddleware,
  checkRateLimit,
  resetRateLimit,
} from './server/auth';

dotenv.config();

// Auto-hydrate Gemini API Key on server boot from local stores
const bootGeminiKey = getActiveGeminiApiKey();
if (bootGeminiKey) {
  process.env.GEMINI_API_KEY = bootGeminiKey;
  setGeminiApiKey(bootGeminiKey);
  console.log(`✅ [Gemini AI Boot] Auto-hydrated API key (${bootGeminiKey.slice(0, 6)}...${bootGeminiKey.slice(-4)})`);
}

// Background async hydration from PostgreSQL system_settings
(async () => {
  try {
    const pgKey = await postgresService.getSystemSetting('gemini_api_key');
    if (pgKey && pgKey.trim().length > 5) {
      const cleanPgKey = pgKey.trim();
      process.env.GEMINI_API_KEY = cleanPgKey;
      setGeminiApiKey(cleanPgKey);
      console.log(`✅ [Gemini AI PostgreSQL] Active key synced from system_settings table`);
    }
  } catch {}
})();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Increase payload limit for image OCR uploads (photos of handwritten notes, invoices)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Intercept x-gemini-key header from client browser vault
app.use((req, res, next) => {
  const headerKey = (req.headers['x-gemini-key'] as string || '').trim();
  if (headerKey && headerKey.length > 10) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.length < 5) {
      process.env.GEMINI_API_KEY = headerKey;
      setGeminiApiKey(headerKey);
      console.log('🔑 [Gemini AI Header] Activated API Key on the fly from request header');
    }
  }
  next();
});

// Tenant Context Middleware (preserves company isolation across all requests)
app.use(tenantContextMiddleware);

// -------------------------------------------------------------
// HEALTH & DB SNAPSHOT
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/db/all', (req, res) => {
  try {
    const snapshot = db.getSnapshot();
    const summary = db.getBusinessSummary();
    const alerts = db.getSmartAlerts();
    const companyProfile = db.getCompanyProfile();
    const suppliers = db.getSuppliers();
    const customers = db.getCustomers();
    const employees = db.getEmployees();
    res.json({
      ...snapshot,
      companyProfile,
      employees,
      suppliers,
      customers,
      summary,
      alerts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/reset-seed', (req, res) => {
  try {
    const fresh = db.resetSeedData();
    res.json({ success: true, message: 'Database reset to initial verified data.', data: fresh });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// POSTGRESQL DATABASE MANAGEMENT & MULTI-DEVICE SYNC API
// -------------------------------------------------------------
app.get('/api/database/status', async (req, res) => {
  try {
    const status = await db.getPostgresStatus();
    const nets = os.networkInterfaces();
    let lanIp = 'localhost';
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          lanIp = net.address;
          break;
        }
      }
    }

    res.json({
      success: true,
      postgres: status,
      lanIp,
      lanUrl: `http://${lanIp}:${PORT}`,
      localUrl: `http://localhost:${PORT}`,
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL || process.env.PGPASSWORD),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/database/configure', async (req, res) => {
  try {
    const { connectionUrl } = req.body;
    if (!connectionUrl || typeof connectionUrl !== 'string' || !connectionUrl.trim()) {
      return res.status(400).json({ error: 'PostgreSQL connection URL is required.' });
    }

    const status = await db.configurePostgres(connectionUrl.trim());
    if (status.connected) {
      res.json({
        success: true,
        message: `Successfully connected to PostgreSQL database "${status.database}" on ${status.host}! All tables verified and data synced.`,
        status,
      });
    } else {
      res.status(400).json({
        success: false,
        error: status.error || 'Failed to connect with provided PostgreSQL credentials.',
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/database/sync', async (req, res) => {
  try {
    const result = await db.syncToPostgres();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/database/pull', async (req, res) => {
  try {
    const success = await db.pullFromPostgres();
    if (success) {
      res.json({ success: true, message: 'ERP data state successfully reloaded from PostgreSQL!' });
    } else {
      res.status(400).json({ success: false, error: 'Could not load data from PostgreSQL.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// COMPANY REGISTRATION & BUSINESS PROFILE API (AI LEDGER SYSTEM)
// -------------------------------------------------------------
app.get('/api/company', (req, res) => {
  try {
    const company = db.getCompanyProfile();
    res.json({
      success: true,
      company,
      isRegistered: Boolean(company?.isRegistered),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/company/register', (req, res) => {
  try {
    const { name, ownerName, phone, city, address, businessType, ntn, tagline, notes, source, userName } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Company / Karobar ka naam likhna laazmi hai.' });
    }
    if (!ownerName || !ownerName.trim()) {
      return res.status(400).json({ error: 'Malik / Proprietor ka naam likhna laazmi hai.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'WhatsApp / Phone number likhna laazmi hai.' });
    }

    const company = db.registerCompany(
      { name, ownerName, phone, city, address, businessType, ntn, tagline, notes },
      source || 'manual',
      userName || 'Admin'
    );
    res.json({
      success: true,
      company,
      message: `Mubarak ho! Aap ki company "${company.name}" AI Ledger me kamyabi se register ho chuki hai!`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/company', (req, res) => {
  try {
    const company = db.updateCompanyProfile(req.body, req.body.source || 'manual', req.body.userName || 'Admin');
    res.json({
      success: true,
      company,
      message: `Company "${company.name}" ki profile update ho chuki hai.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// EMPLOYEES MANAGEMENT API
// -------------------------------------------------------------
app.get('/api/employees', (req, res) => {
  try {
    const list = db.getEmployees();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/employees/search', (req, res) => {
  try {
    const q = req.query.q as string || '';
    const results = db.searchEmployees(q);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', (req, res) => {
  try {
    const emp = db.createEmployee(req.body, req.body.source || 'manual', req.body.userName || 'Admin');
    res.json({
      success: true,
      employee: emp,
      message: `Employee "${emp.fullName}" added successfully.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id', (req, res) => {
  try {
    const emp = db.updateEmployee(req.params.id, req.body, req.body.source || 'manual', req.body.userName || 'Admin');
    res.json({
      success: true,
      employee: emp,
      message: `Employee "${emp.fullName}" updated successfully.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/employees/:id', (req, res) => {
  try {
    const success = db.deleteEmployee(req.params.id, 'manual', 'Admin');
    if (!success) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    res.json({ success: true, message: 'Employee deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SUPPLIERS MANAGEMENT API
// -------------------------------------------------------------
app.get('/api/suppliers', (req, res) => {
  try {
    const list = db.getSuppliers();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/suppliers/search', (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const filters = {
      city: req.query.city as string,
      cnic: req.query.cnic as string,
      mobile: req.query.mobile as string,
      email: req.query.email as string,
    };
    const results = db.searchSuppliers(q, filters);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/suppliers', (req, res) => {
  try {
    const sup = db.createSupplier(req.body, req.body.source || 'manual', req.body.userName || 'Admin');
    res.json({
      success: true,
      supplier: sup,
      message: `Supplier "${sup.title}" added successfully.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/suppliers/:id', (req, res) => {
  try {
    const sup = db.updateSupplier(req.params.id, req.body, req.body.source || 'manual', req.body.userName || 'Admin');
    res.json({
      success: true,
      supplier: sup,
      message: `Supplier "${sup.title}" updated successfully.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/suppliers/:id/status', (req, res) => {
  try {
    const sup = db.toggleSupplierStatus(req.params.id, 'manual', 'Admin');
    res.json({
      success: true,
      supplier: sup,
      message: `Supplier "${sup.title}" activation status changed to ${sup.status}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/suppliers/:id', (req, res) => {
  try {
    const success = db.deleteSupplier(req.params.id, 'manual', 'Admin');
    if (!success) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }
    res.json({ success: true, message: 'Supplier deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// MULTI-TENANT AUTHENTICATION & COMPANY ACCESS API
// -------------------------------------------------------------

// 1. Create New Company (Creator automatically becomes Owner/Admin)
app.post('/api/auth/company/create', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const rate = checkRateLimit(clientIp, 'company_create', 10, 15 * 60 * 1000);
  if (!rate.allowed) {
    return res.status(429).json({
      error: 'Too many registration attempts. Please wait 15 minutes before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  try {
    const { companyName, ownerName, username, email, password, phone, city, businessType, currency } = req.body;
    const result = await db.createCompany({
      companyName,
      ownerName,
      username,
      email,
      password,
      phone,
      city,
      businessType,
      currency,
    });

    resetRateLimit(clientIp, 'company_create');
    res.json({
      success: true,
      message: `Mubarak! Company "${result.company.name}" created successfully. You are the Owner/Admin.`,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create company.' });
  }
});

// 2. Join Existing Company (Employee Registration via Invite Code)
app.post('/api/auth/company/join', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const rate = checkRateLimit(clientIp, 'company_join', 10, 15 * 60 * 1000);
  if (!rate.allowed) {
    return res.status(429).json({
      error: 'Too many attempts with invalid invite codes. Please wait 15 minutes before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  try {
    const { inviteCode, name, username, email, password } = req.body;
    const result = await db.joinCompany({
      inviteCode,
      name,
      username,
      email,
      password,
    });

    resetRateLimit(clientIp, 'company_join');
    res.json({
      success: true,
      message: `Welcome to "${result.company.name}"! Your employee account has been created.`,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to join company.' });
  }
});

// 3. User Login (Username/Email + Password) - Auto-identifies company
app.post('/api/auth/login', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const rate = checkRateLimit(clientIp, 'user_login', 15, 15 * 60 * 1000);
  if (!rate.allowed) {
    return res.status(429).json({
      error: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    const result = await db.loginUser(username, password);
    resetRateLimit(clientIp, 'user_login');
    res.json({
      success: true,
      message: `Welcome back, ${result.user.name}! Logged into "${result.company.name}".`,
      ...result,
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Invalid username or password.' });
  }
});

// 3.5 Reset Password (Self-service recovery for users)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { usernameOrEmail, newPassword } = req.body;
    if (!usernameOrEmail || !newPassword) {
      return res.status(400).json({ error: 'Username/email and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const result = await db.resetUserPassword(usernameOrEmail, newPassword);
    res.json({
      success: true,
      message: `Password for "${result.user.username}" reset successfully! You can now log in.`,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to reset password.' });
  }
});

// 4. Authenticated Profile / Me
app.get('/api/auth/me', requireAuth, (req, res) => {
  try {
    const company = db.getCompany(req.user!.companyId);
    res.json({
      success: true,
      user: req.user,
      company,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Admin Invite Code Management
app.get('/api/company/invite-code', requireAuth, requireRole('Admin'), (req, res) => {
  try {
    const inviteInfo = db.getCompanyInviteCode(req.user!.companyId);
    res.json({ success: true, ...inviteInfo });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/company/invite-code/regenerate', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const result = await db.regenerateCompanyInviteCode(req.user!.companyId, req.user);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/company/invite-code/revoke', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const result = await db.revokeCompanyInviteCode(req.user!.companyId, req.user);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/company/invite-code/activate', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const result = await db.activateCompanyInviteCode(req.user!.companyId, req.user);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Company Users List (Scoped strictly to authenticated user's company)
app.get('/api/company/users', requireAuth, (req, res) => {
  try {
    const users = db.getCompanyUsers(req.user!.companyId);
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/company/users/:id', requireAuth, requireRole('Admin'), (req, res) => {
  try {
    const success = db.deleteCompanyUser(req.params.id, req.user, req.user!.companyId);
    if (!success) {
      return res.status(404).json({ error: 'User not found in your company.' });
    }
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Backwards compatibility legacy routes
app.get('/api/auth/users', requireAuth, (req, res) => {
  res.json(db.getCompanyUsers(req.user!.companyId));
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;
    if (!name || !username) {
      return res.status(400).json({ error: 'Name and username are required.' });
    }
    const user = db.registerUser({ name, username, email, password, role });
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/auth/users/:id', requireAuth, requireRole('Admin'), (req, res) => {
  try {
    const success = db.deleteCompanyUser(req.params.id, req.user, req.user!.companyId);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DATABASE OFFLINE BACKUP EXPORT & IMPORT API
// -------------------------------------------------------------
app.get('/api/backup/export', (req, res) => {
  try {
    const backup = db.exportBackup();
    res.setHeader('Content-Disposition', 'attachment; filename="erp-database-backup.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backup/import', (req, res) => {
  try {
    const result = db.importBackup(req.body.data, req.body.user || { id: 'admin', name: 'Admin', role: 'Admin' });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// SQLite endpoints removed as requested by user

// -------------------------------------------------------------
// RESTAURANTS API
// -------------------------------------------------------------
app.get('/api/restaurants', (req, res) => {
  res.json(db.getRestaurants());
});

app.post('/api/restaurants', (req, res) => {
  try {
    const { name, contactPerson, phone, address, creditLimit, source, user } = req.body;
    const created = db.createRestaurant(
      {
        name,
        contactPerson: contactPerson || 'Owner',
        phone: phone || '',
        address: address || '',
        creditLimit: Number(creditLimit) || 100000,
        status: 'active',
      },
      source || 'manual',
      user
    );
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/restaurants/:id', (req, res) => {
  try {
    const updated = db.updateRestaurant(req.params.id, req.body.updates, req.body.source, req.body.user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/restaurants/:id', (req, res) => {
  try {
    const success = db.deleteRestaurant(req.params.id, req.body.user);
    res.json({ success });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// PRODUCTS & INVENTORY API
// -------------------------------------------------------------
app.get('/api/products', (req, res) => {
  res.json(db.getProducts());
});

app.post('/api/products', (req, res) => {
  try {
    const { product, source, user } = req.body;
    const prodData = product || req.body;
    const created = db.createProduct(
      prodData,
      source || 'manual',
      user || { id: 'admin', name: 'Admin', role: 'Admin' }
    );
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/products/batch', (req, res) => {
  try {
    const { products, source, user } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'No products provided for batch import' });
    }
    const created = products.map((p: any) =>
      db.createProduct(p, source || 'image_ocr', user)
    );
    res.json({ success: true, count: created.length, products: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body.updates, req.body.source, req.body.user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const success = db.deleteProduct(req.params.id, req.body.user);
    res.json({ success });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ORDERS API (Full-Fulfillment & Inventory Auto-Adjustment)
// -------------------------------------------------------------
app.get('/api/orders', (req, res) => {
  res.json(db.getOrders());
});

app.post('/api/orders', (req, res) => {
  try {
    const { restaurantId, items, deliveryFee, discount, initialPayment, paymentMethod, notes, source, user } = req.body;
    const order = db.createOrder(
      {
        restaurantId,
        items,
        deliveryFee,
        discount,
        initialPayment,
        paymentMethod: paymentMethod as PaymentMethod,
        notes,
      },
      source || 'manual',
      user
    );
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/orders/:id', (req, res) => {
  try {
    const success = db.deleteOrder(req.params.id, req.body.user);
    res.json({ success });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/orders/:id', (req, res) => {
  try {
    const { updates, source, user } = req.body;
    const updated = db.updateOrder(req.params.id, updates, source, user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', (req, res) => {
  try {
    const { status, source, user } = req.body;
    const updated = db.updateOrderStatus(req.params.id, status as OrderStatus, source, user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/orders/:id/cancel', (req, res) => {
  try {
    const { source = 'manual', user } = req.body;
    const updated = db.updateOrderStatus(req.params.id, 'Cancelled' as OrderStatus, source, user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// PAYMENTS API
// -------------------------------------------------------------
app.get('/api/payments', (req, res) => {
  res.json(db.getPayments());
});

app.post('/api/payments', (req, res) => {
  try {
    const { restaurantId, orderId, amount, paymentMethod, notes, source, user } = req.body;
    const payment = db.recordPayment(
      {
        restaurantId,
        orderId,
        amount: Number(amount),
        paymentMethod: paymentMethod as PaymentMethod,
        notes,
      },
      source || 'manual',
      user
    );
    res.json(payment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/payments/:id', (req, res) => {
  try {
    const success = db.deletePayment(req.params.id, req.body.user);
    res.json({ success });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// EXPENSES & ALLOCATION API
// -------------------------------------------------------------
app.get('/api/expenses', (req, res) => {
  res.json(db.getExpenses());
});

app.post('/api/expenses', (req, res) => {
  try {
    const { expense, source, user } = req.body;
    const created = db.createExpense(expense, source || 'manual', user);
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/expenses/:id', (req, res) => {
  try {
    const updated = db.updateExpense(req.params.id, req.body.updates, req.body.user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  try {
    const success = db.deleteExpense(req.params.id, req.body.user);
    res.json({ success });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/expenses/:id/allocate', (req, res) => {
  try {
    const { method, targetRestaurantIds } = req.body;
    const updated = db.allocateExpense(
      req.params.id,
      method as ExpenseAllocationMethod,
      targetRestaurantIds
    );
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});


// -------------------------------------------------------------
// ITEM CATEGORIES, BRANDS & MEASURES API
// -------------------------------------------------------------
app.get('/api/items/categories', (req, res) => {
  res.json(db.getCategories());
});

app.post('/api/items/categories', (req, res) => {
  try {
    const { category } = req.body;
    const list = db.addCategory(category);
    res.json(list);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/items/categories', (req, res) => {
  try {
    const { oldName, newName } = req.body;
    const list = db.updateCategory(oldName, newName);
    res.json(list);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/items/categories/:category', (req, res) => {
  try {
    const list = db.deleteCategory(decodeURIComponent(req.params.category));
    res.json(list);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/items/brands', (req, res) => {
  res.json(db.getBrands());
});

app.post('/api/items/brands', (req, res) => {
  try {
    const { brand } = req.body;
    const list = db.addBrand(brand);
    res.json(list);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/items/brands', (req, res) => {
  try {
    const { oldName, newName } = req.body;
    const list = db.updateBrand(oldName, newName);
    res.json(list);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/items/brands/:brand', (req, res) => {
  try {
    const list = db.deleteBrand(decodeURIComponent(req.params.brand));
    res.json(list);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/items/measures', (req, res) => {
  res.json(db.getMeasures());
});

app.post('/api/items/measures', (req, res) => {
  try {
    const { measure } = req.body;
    const list = db.addMeasure(measure);
    res.json(list);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/items/measures', (req, res) => {
  try {
    const { oldName, newName } = req.body;
    const list = db.updateMeasure(oldName, newName);
    res.json(list);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/items/measures/:measure', (req, res) => {
  try {
    const list = db.deleteMeasure(decodeURIComponent(req.params.measure));
    res.json(list);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// PURCHASES & PURCHASING BILLS API
// -------------------------------------------------------------
app.get('/api/purchases', (req, res) => {
  try {
    const { supplierId, fromDate, toDate, search } = req.query;
    const bills = db.getPurchaseBills({
      supplierId: supplierId ? String(supplierId) : undefined,
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      search: search ? String(search) : undefined,
    });
    res.json(bills);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/purchases/:id', (req, res) => {
  try {
    const bill = db.getPurchaseBillById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Purchase Bill not found' });
    res.json(bill);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchases', (req, res) => {
  try {
    const { bill, source, user } = req.body;
    const created = db.createPurchaseBill(bill, source || 'manual', user);
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/purchases/:id', (req, res) => {
  try {
    const success = db.deletePurchaseBill(req.params.id, req.body.user);
    res.json({ success });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/purchases/:id/add-to-stock', (req, res) => {
  try {
    const bill = db.addPurchaseBillToStock(req.params.id, req.body.user);
    res.json(bill);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/purchases-report', (req, res) => {
  try {
    const { supplierId, fromDate, toDate, search } = req.query;
    const report = db.getPurchaseReport({
      supplierId: supplierId ? String(supplierId) : undefined,
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      search: search ? String(search) : undefined,
    });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CUSTOMERS MANAGEMENT API
// -------------------------------------------------------------
app.get('/api/customers', (req, res) => {
  try {
    const filters = {
      fromDate: req.query.fromDate ? String(req.query.fromDate) : undefined,
      toDate: req.query.toDate ? String(req.query.toDate) : undefined,
      code: req.query.code ? String(req.query.code) : undefined,
      mcode: req.query.mcode ? String(req.query.mcode) : undefined,
      title: req.query.title ? String(req.query.title) : undefined,
      name: req.query.name ? String(req.query.name) : undefined,
      mobile: req.query.mobile ? String(req.query.mobile) : undefined,
      cnic: req.query.cnic ? String(req.query.cnic) : undefined,
      trn: req.query.trn ? String(req.query.trn) : undefined,
      group: req.query.group ? String(req.query.group) : undefined,
      city: req.query.city ? String(req.query.city) : undefined,
      area: req.query.area ? String(req.query.area) : undefined,
      sector: req.query.sector ? String(req.query.sector) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
    };
    const list = db.getCustomers(filters);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/meta/:type', (req, res) => {
  try {
    const { type } = req.params;
    let list: string[] = [];
    if (type === 'groups') list = db.getCustomerGroups();
    else if (type === 'cities') list = db.getCustomerCities();
    else if (type === 'areas') list = db.getCustomerAreas();
    else if (type === 'sectors') list = db.getCustomerSectors();
    else if (type === 'zones') list = db.getCustomerZones();
    else if (type === 'countries') list = db.getCustomerCountries();
    else return res.status(400).json({ error: 'Invalid meta type' });
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers/meta', (req, res) => {
  try {
    const { type, value } = req.body;
    const list = db.addCustomerMeta(type, value);
    res.json(list);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/customers/:id', (req, res) => {
  try {
    const cust = db.getCustomerById(req.params.id);
    if (!cust) return res.status(404).json({ error: 'Customer not found' });
    res.json(cust);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { customer, source, user } = req.body;
    const created = db.createCustomer(customer || req.body, source || 'manual', user);
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const { updates, source, user } = req.body;
    const updated = db.updateCustomer(req.params.id, updates || req.body, source || 'manual', user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/customers/:id/status', (req, res) => {
  try {
    const { source, user } = req.body;
    const updated = db.toggleCustomerStatus(req.params.id, source || 'manual', user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    const success = db.deleteCustomer(req.params.id, req.body.source || 'manual', req.body.user);
    res.json({ success });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SALES & SALE BILLS API (REAL-TIME INVENTORY DEDUCTION)
// -------------------------------------------------------------
app.get('/api/salesmen', (req, res) => {
  try {
    const list = db.getSalesmenList();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sales', (req, res) => {
  try {
    const { fromDate, toDate, mobileNo, billNo, customerId, salesmanId, orderBy, search } = req.query;
    const bills = db.getSaleBills({
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      mobileNo: mobileNo ? String(mobileNo) : undefined,
      billNo: billNo ? String(billNo) : undefined,
      customerId: customerId ? String(customerId) : undefined,
      salesmanId: salesmanId ? String(salesmanId) : undefined,
      orderBy: orderBy ? String(orderBy) : undefined,
      search: search ? String(search) : undefined,
    });
    res.json(bills);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sales/:id', (req, res) => {
  try {
    const bill = db.getSaleBillById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Sale bill not found' });
    res.json(bill);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', (req, res) => {
  try {
    const { bill, user } = req.body;
    const created = db.createSaleBill(bill || req.body, user);
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/sales/:id', (req, res) => {
  try {
    const success = db.deleteSaleBill(req.params.id, req.body.user);
    res.json({ success });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/sales-report', (req, res) => {
  try {
    const { fromDate, toDate, mobileNo, billNo, customerId, salesmanId, orderBy, search } = req.query;
    const report = db.getSaleReport({
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      mobileNo: mobileNo ? String(mobileNo) : undefined,
      billNo: billNo ? String(billNo) : undefined,
      customerId: customerId ? String(customerId) : undefined,
      salesmanId: salesmanId ? String(salesmanId) : undefined,
      orderBy: orderBy ? String(orderBy) : undefined,
      search: search ? String(search) : undefined,
    });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// COMPREHENSIVE PROFIT REPORTS API (Per Item, Bill, Restaurant, Salesman)
// -------------------------------------------------------------
app.get('/api/reports/profit', (req, res) => {
  try {
    const { fromDate, toDate, search, customerId, salesmanId } = req.query;
    const report = db.getComprehensiveProfitReport({
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      search: search ? String(search) : undefined,
      customerId: customerId ? String(customerId) : undefined,
      salesmanId: salesmanId ? String(salesmanId) : undefined,
    });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// STOCK MOVEMENT & AUDIT LEDGER API (Day-wise / Week-wise)
// -------------------------------------------------------------
app.get('/api/inventory/movement-history', (req, res) => {
  try {
    const { fromDate, toDate, productId, category, movementType, timeframe } = req.query;
    const report = db.getStockMovementLedger({
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      productId: productId ? String(productId) : undefined,
      category: category ? String(category) : undefined,
      movementType: movementType ? String(movementType) : undefined,
      timeframe: (timeframe as any) || 'day',
    });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// BUSINESS SUMMARY, PROFIT DIAGNOSIS & ALERTS
// -------------------------------------------------------------
app.get('/api/summary', (req, res) => {
  res.json(db.getBusinessSummary());
});

app.get('/api/profit-diagnosis', (req, res) => {
  res.json(db.getProfitDiagnosis());
});

// -------------------------------------------------------------
// DOCUMENT & REPORT EXPORT ENDPOINTS (Printable Statement & Master Audit)
// -------------------------------------------------------------
app.get('/api/reports/restaurant/:identifier', (req, res) => {
  const result = generateRestaurantReportDoc(req.params.identifier);
  if (!result.success) {
    return res.status(404).json(result);
  }
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(result.docContent);
  }
  res.json(result);
});

app.get('/api/reports/business', (req, res) => {
  const result = generateBusinessMasterReportDoc();
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(result.docContent);
  }
  res.json(result);
});

// -------------------------------------------------------------
// CASH & BANK REGISTER (TIJORI) - used by the AI Ledger Master
// Business Audit Report for "CASH IN HAND" reconciliation.
// -------------------------------------------------------------
app.get('/api/cash-register', (req, res) => {
  try {
    res.json({ success: true, cashRegister: db.getCashRegister() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cash-register', (req, res) => {
  try {
    const cashRegister = db.updateCashRegister(req.body || {}, req.body?.source || 'manual', req.body?.userName || 'Admin');
    res.json({ success: true, cashRegister, message: 'Tijori / Cash Register update ho gaya.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CASH & BANK MANAGEMENT, VOUCHERS AND ACCOUNTS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/banks', (req, res) => {
  try {
    res.json(db.getBanks());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/banks/:id', (req, res) => {
  try {
    const bank = db.getBankById(req.params.id);
    if (!bank) return res.status(404).json({ error: 'Bank not found' });
    res.json(bank);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/banks', (req, res) => {
  try {
    const userName = (req as any).user?.name || req.body.userName || 'Admin';
    const bank = db.createBank(req.body, userName);
    res.status(201).json(bank);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/banks/:id', (req, res) => {
  try {
    const userName = (req as any).user?.name || req.body.userName || 'Admin';
    const bank = db.updateBank(req.params.id, req.body, userName);
    res.json(bank);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/banks/:id', (req, res) => {
  try {
    const userName = (req as any).user?.name || 'Admin';
    const ok = db.deleteBank(req.params.id, userName);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cash-accounts', (req, res) => {
  try {
    res.json(db.getCashAccounts());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cash-accounts/:id', (req, res) => {
  try {
    const account = db.updateCashAccount(req.params.id, req.body);
    res.json(account);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/expense-accounts', (req, res) => {
  try {
    res.json(db.getExpenseAccounts());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expense-accounts', (req, res) => {
  try {
    const acc = db.createExpenseAccount(req.body);
    res.status(201).json(acc);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/expense-accounts/:id', (req, res) => {
  try {
    const ok = db.deleteExpenseAccount(req.params.id);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/accounts/gl', (req, res) => {
  try {
    res.json(db.getGlAccounts());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vouchers/next-numbers', (req, res) => {
  try {
    res.json(db.getNextVoucherNumbers());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vouchers', (req, res) => {
  try {
    const { voucherType, fromDate, toDate, fromJv, toJv, search } = req.query;
    const vouchers = db.getVouchers({
      voucherType: voucherType ? String(voucherType) : undefined,
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
      fromJv: fromJv ? String(fromJv) : undefined,
      toJv: toJv ? String(toJv) : undefined,
      search: search ? String(search) : undefined,
    });
    res.json(vouchers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vouchers/:id', (req, res) => {
  try {
    const voucher = db.getVoucherById(req.params.id);
    if (!voucher) return res.status(404).json({ error: 'Voucher not found' });
    res.json(voucher);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vouchers', (req, res) => {
  try {
    const userName = (req as any).user?.name || req.body.userName || 'Admin';
    const voucher = db.createVoucher(req.body, userName);
    res.status(201).json(voucher);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/vouchers/:id', (req, res) => {
  try {
    const userName = (req as any).user?.name || req.body.userName || 'Admin';
    const voucher = db.updateVoucher(req.params.id, req.body, userName);
    res.json(voucher);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/vouchers/:id', (req, res) => {
  try {
    const userName = (req as any).user?.name || 'Admin';
    const ok = db.deleteVoucher(req.params.id, userName);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/cash-recovered', (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const report = db.getCashRecoveredReport(
      fromDate ? String(fromDate) : undefined,
      toDate ? String(toDate) : undefined
    );
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/cash-paid', (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const report = db.getCashPaidReport(
      fromDate ? String(fromDate) : undefined,
      toDate ? String(toDate) : undefined
    );
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// AI LEDGER MASTER BUSINESS AUDIT REPORT
// -------------------------------------------------------------
app.get('/api/reports/ledger-audit', (req, res) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const format = String(req.query.format || 'json');

    if (format === 'html') {
      const result = generateAiLedgerAuditHtml(date);
      if (!result.success) return res.status(500).json(result);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(result.html);
    }

    const result = buildAiLedgerMasterAuditReport(date);
    if (!result.success) return res.status(500).json(result);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports/download', (req, res) => {
  const type = String(req.query.type || 'business');
  const format = String(req.query.format || (type === 'ledger-audit' || type === 'business' ? 'html' : 'doc'));

  if (type === 'ledger-audit' || type === 'business') {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const isHtml = format !== 'doc';
    const result = isHtml ? generateAiLedgerAuditHtml(date) : generateAiLedgerAuditDoc(date);
    if (!result.success || (!(result as any).html && !(result as any).docContent)) {
      return res.status(500).send((result as any).error || 'Report generation failed');
    }
    const filename = isHtml
      ? (result.fileName.endsWith('.html') ? result.fileName : `${result.fileName.replace(/\.doc$/, '')}.html`)
      : result.fileName.replace(/\.html$/, '.doc');
    const contentType = isHtml ? 'text/html; charset=utf-8' : 'application/msword; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(isHtml ? (result as any).html : (result as any).docContent);
  }

  if (type === 'restaurant') {
    const id = String(req.query.id || '');
    const result = generateRestaurantReportDoc(id);
    if (!result.success || !result.docContent) {
      return res.status(404).send(result.error || 'Restaurant not found');
    }
    const isHtml = format === 'html';
    const filename = isHtml ? result.fileName.replace(/\.doc$/, '.html') : result.fileName;
    const contentType = isHtml ? 'text/html; charset=utf-8' : 'application/msword; charset=utf-8';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(result.docContent);
  }

  if (type === 'profit-salesman') {
    const result = generateProfitBySalesmanReportDoc(format as any);
    const contentType = format === 'doc' ? 'application/msword; charset=utf-8' : 'text/html; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    return res.send(result.docContent);
  }

  if (type === 'profit-restaurant') {
    const result = generateProfitByRestaurantReportDoc(format as any);
    const contentType = format === 'doc' ? 'application/msword; charset=utf-8' : 'text/html; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    return res.send(result.docContent);
  }

  if (type === 'profit-item') {
    const result = generateProfitByItemReportDoc(format as any);
    const contentType = format === 'doc' ? 'application/msword; charset=utf-8' : 'text/html; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    return res.send(result.docContent);
  }

  if (type === 'profit-bill') {
    const result = generateProfitByBillReportDoc(format as any);
    const contentType = format === 'doc' ? 'application/msword; charset=utf-8' : 'text/html; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    return res.send(result.docContent);
  }

  if (type === 'customer-bill') {
    const id = String(req.query.search || req.query.id || req.query.customerId || req.query.billNumber || '');
    const result = generateCustomerSaleBillDoc(id, format as any);
    if (!result.success || !result.docContent) {
      return res.status(404).send(result.error || 'Sale bill not found');
    }
    const contentType = format === 'doc' ? 'application/msword; charset=utf-8' : 'text/html; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    return res.send(result.docContent);
  }

  if (type === 'stock') {
    const result = generateStockReportDoc(format as any);
    const contentType = format === 'doc' ? 'application/msword; charset=utf-8' : 'text/html; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    return res.send(result.docContent);
  }

  if (type === 'sales') {
    const result = generateSalesReportDoc(format as any);
    const contentType = format === 'doc' ? 'application/msword; charset=utf-8' : 'text/html; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    return res.send(result.docContent);
  }

  if (type === 'purchases') {
    const result = generatePurchasesReportDoc(format as any);
    const contentType = format === 'doc' ? 'application/msword; charset=utf-8' : 'text/html; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    return res.send(result.docContent);
  }

  // Master Business Report
  const result = generateBusinessMasterReportDoc();
  const isHtml = format === 'html';
  const filename = isHtml ? result.fileName.replace(/\.doc$/, '.html') : result.fileName;
  const contentType = isHtml ? 'text/html; charset=utf-8' : 'application/msword; charset=utf-8';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(result.docContent);
});

// -------------------------------------------------------------
// GEMINI API KEY MANAGEMENT (Multi-Tier Permanent Auto-Vault)
// -------------------------------------------------------------
app.get('/api/settings/gemini-key', async (req, res) => {
  let currentKey = (process.env.GEMINI_API_KEY || '').trim();

  // 1. Fallback: check local active stores
  if (!currentKey || currentKey.length < 5) {
    currentKey = getActiveGeminiApiKey();
    if (currentKey) {
      process.env.GEMINI_API_KEY = currentKey;
      setGeminiApiKey(currentKey);
    }
  }

  // 2. Fallback: check PostgreSQL system_settings table
  if (!currentKey || currentKey.length < 5) {
    try {
      const pgKey = await postgresService.getSystemSetting('gemini_api_key');
      if (pgKey && pgKey.trim().length > 5) {
        currentKey = pgKey.trim();
        process.env.GEMINI_API_KEY = currentKey;
        setGeminiApiKey(currentKey);
      }
    } catch {}
  }

  const hasKey = Boolean(currentKey && currentKey.length > 5);
  let maskedKey = '';
  if (hasKey) {
    if (currentKey.length > 10) {
      maskedKey = currentKey.slice(0, 6) + '...' + currentKey.slice(-4);
    } else {
      maskedKey = '******';
    }
  }
  res.json({
    hasKey,
    maskedKey,
    aiStudioUrl: 'https://aistudio.google.com/app/apikey',
  });
});

app.post('/api/settings/gemini-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return res.status(400).json({ error: 'Valid Gemini API key is required from Google AI Studio.' });
    }

    const cleanKey = apiKey.trim();
    // Test the key
    const testResult = await testGeminiApiKey(cleanKey);
    if (!testResult.success) {
      return res.status(400).json({
        error: `Gemini API key verification failed: ${testResult.message}. Baraye meherbani AI Studio se check karein.`
      });
    }

    // 1. Set runtime environment and memory client
    setGeminiApiKey(cleanKey);
    process.env.GEMINI_API_KEY = cleanKey;

    // 2. Persist to PostgreSQL system_settings table (Permanent across Railway rebuilds/deploys)
    try {
      await postgresService.setSystemSetting('gemini_api_key', cleanKey);
      console.log('✅ [Gemini AI] Saved key to PostgreSQL system_settings');
    } catch (pgErr) {
      console.warn('Could not save to PostgreSQL system_settings:', pgErr);
    }

    // 3. Persist to database schema (data/database.json)
    try {
      db.setGeminiApiKey(cleanKey);
      console.log('✅ [Gemini AI] Saved key to DB schema');
    } catch (dbErr) {
      console.warn('Could not save to DB schema:', dbErr);
    }

    // 4. Persist to data/settings.json
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const settingsPath = path.join(dataDir, 'settings.json');
      let settings: any = {};
      if (fs.existsSync(settingsPath)) {
        try {
          settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch {}
      }
      settings.geminiApiKey = cleanKey;
      settings.updatedAt = new Date().toISOString();
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      console.log('✅ [Gemini AI] Saved key to data/settings.json');
    } catch (settErr) {
      console.warn('Could not write to data/settings.json:', settErr);
    }

    // 5. Persist to .env file
    try {
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*(\r?\n|$)/, `GEMINI_API_KEY="${cleanKey}"$1`);
      } else {
        envContent += `\nGEMINI_API_KEY="${cleanKey}"\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('✅ [Gemini AI] Saved key to .env');
    } catch (envErr) {
      console.warn('Could not write to .env file:', envErr);
    }

    res.json({
      success: true,
      message: 'Gemini API Key successfully verified and permanently saved across all databases and vaults!',
      maskedKey: cleanKey.slice(0, 6) + '...' + cleanKey.slice(-4),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clear-data', (req, res) => {
  const result = db.clearAllData();
  res.json({ success: true, message: 'All data cleared successfully. Ready for real entries.', data: result });
});

app.post('/api/reset-data', (req, res) => {
  const result = db.clearAllData();
  res.json({ success: true, message: 'All data cleared successfully.', data: result });
});

app.get('/api/alerts', (req, res) => {
  res.json(db.getSmartAlerts());
});

app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '');
  res.json(db.search(q));
});

// -------------------------------------------------------------
// AI INTELLIGENCE ENDPOINTS (Gemini Server-Side)
// -------------------------------------------------------------
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, userRole, userName, userId, source } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const result = await processAiChat(messages, {
      userRole,
      userName,
      userId,
      source: source || 'ai_chat',
    });

    res.json(result);
  } catch (err: any) {
    res.json({
      reply: 'Assalam-o-Alaikum! Main aap ka AI Munshi hoon. System local mode me active hai. Aap kisi bhi restaurant ka order, payment ya stock hisaab seedha likh sakte hain.',
      executedTools: [],
    });
  }
});

app.post('/api/ai/parse-document', async (req, res) => {
  try {
    const { imageBase64, mimeType, hintType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required.' });
    }

    const extracted = await parseDocumentImage(imageBase64, mimeType || 'image/jpeg', hintType);
    res.json(extracted);
  } catch (err: any) {
    console.error('OCR Parsing Error:', err?.message || err);
    res.status(500).json({
      error:
        err?.message ||
        'Slip / Receipt Scan Error: Image wazeh nahi hai ya text parha nahi ja saka. Baraye meherbani saaf tasweer upload karein.',
    });
  }
});

app.get('/api/ai/daily-summary', async (req, res) => {
  try {
    const summary = await generateDailyAiSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: 'Error generating executive summary.' });
  }
});

// -------------------------------------------------------------
// VITE MIDDLEWARE & BOOTSTRAP
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
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
    console.log(`Restaurant Supply ERP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
