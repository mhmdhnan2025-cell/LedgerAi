import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  AuditLog,
  Company,
  CompanyProfile,
  Employee,
  Expense,
  InventoryTransaction,
  Order,
  Payment,
  Product,
  PurchaseBill,
  PurchaseBillItem,
  Restaurant,
  Supplier,
  User,
  Customer,
  SaleBill,
  SaleBillItem,
  CashRegister,
} from '../src/types';

dotenv.config();

const { Pool } = pg;

export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

export interface PostgresStatus {
  connected: boolean;
  error?: string;
  host?: string;
  database?: string;
  tableCounts?: Record<string, number>;
  lastSyncedAt?: string;
  activePoolSize?: number;
}

class PostgresService {
  private pool: pg.Pool | null = null;
  private isInitialized = false;
  private lastStatus: PostgresStatus = { connected: false };

  constructor() {
    this.createPool();
  }

  private resolveConfig(): PostgresConfig {
    const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PG_CONNECTION_STRING;
    if (connStr && connStr.trim()) {
      const isRemote =
        connStr.includes('supabase') ||
        connStr.includes('neon.tech') ||
        connStr.includes('render.com') ||
        connStr.includes('railway') ||
        connStr.includes('sslmode=require') ||
        process.env.PGSSL === 'true';

      return {
        connectionString: connStr.trim(),
        ssl: isRemote ? { rejectUnauthorized: false } : undefined,
      };
    }

    return {
      host: process.env.PGHOST || '127.0.0.1',
      port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'restaurant_erp',
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
  }

  public createPool(overrideConnectionString?: string) {
    if (this.pool) {
      this.pool.end().catch(() => {});
      this.pool = null;
    }

    let config: PostgresConfig;
    if (overrideConnectionString) {
      const isRemote =
        overrideConnectionString.includes('supabase') ||
        overrideConnectionString.includes('neon.tech') ||
        overrideConnectionString.includes('render.com') ||
        overrideConnectionString.includes('railway') ||
        overrideConnectionString.includes('sslmode=require');

      config = {
        connectionString: overrideConnectionString.trim(),
        ssl: isRemote ? { rejectUnauthorized: false } : undefined,
      };
    } else {
      config = this.resolveConfig();
    }

    try {
      this.pool = new Pool({
        ...config,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      this.pool.on('error', (err) => {
        console.warn('[PostgreSQL Pool Warning]:', err.message);
      });
    } catch (err: any) {
      console.warn('[PostgreSQL Init Error]:', err.message);
      this.pool = null;
    }
  }

  public getPool(): pg.Pool | null {
    return this.pool;
  }

  public async testConnection(): Promise<PostgresStatus> {
    if (!this.pool) {
      return { connected: false, error: 'Database pool is not initialized.' };
    }

    try {
      const client = await this.pool.connect();
      const res = await client.query('SELECT current_database() as db, current_user as usr, inet_server_addr() as host, version() as ver;');
      client.release();

      const info = res.rows[0];
      const tableCounts = await this.getTableCounts();

      this.lastStatus = {
        connected: true,
        database: info?.db || 'postgres',
        host: info?.host || 'localhost',
        tableCounts,
        lastSyncedAt: new Date().toISOString(),
        activePoolSize: this.pool.totalCount,
      };
      return this.lastStatus;
    } catch (err: any) {
      this.lastStatus = {
        connected: false,
        error: err.message || 'Cannot connect to PostgreSQL.',
      };
      return this.lastStatus;
    }
  }

  public async initSchema(): Promise<boolean> {
    if (!this.pool) return false;

    try {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        // 0. Companies (Multi-Tenant Master Table)
        await client.query(`
          CREATE TABLE IF NOT EXISTS companies (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            owner_id VARCHAR(100),
            owner_name VARCHAR(255),
            invite_code VARCHAR(50) UNIQUE NOT NULL,
            invite_code_status VARCHAR(20) DEFAULT 'ACTIVE',
            invite_code_created_at TIMESTAMPTZ DEFAULT NOW(),
            invite_code_expires_at TIMESTAMPTZ,
            phone VARCHAR(100),
            city VARCHAR(100),
            address TEXT,
            business_type VARCHAR(100),
            currency VARCHAR(50) DEFAULT 'AED',
            data JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 1. Users
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            username VARCHAR(150) UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name VARCHAR(200) NOT NULL,
            role VARCHAR(50) NOT NULL,
            email VARCHAR(200),
            phone VARCHAR(100),
            avatar TEXT,
            data JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 2. Company Profile
        await client.query(`
          CREATE TABLE IF NOT EXISTS company_profile (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            name VARCHAR(255) NOT NULL,
            owner_name VARCHAR(255),
            phone VARCHAR(100),
            city VARCHAR(100),
            address TEXT,
            business_type VARCHAR(100),
            ntn VARCHAR(100),
            tagline TEXT,
            currency VARCHAR(50) DEFAULT 'AED',
            is_registered BOOLEAN DEFAULT TRUE,
            data JSONB NOT NULL DEFAULT '{}',
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 3. Cash Register (Tijori)
        await client.query(`
          CREATE TABLE IF NOT EXISTS cash_register (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            status VARCHAR(50) DEFAULT 'OPEN',
            opening_cash NUMERIC(15,2) DEFAULT 0,
            current_cash NUMERIC(15,2) DEFAULT 0,
            closing_cash NUMERIC(15,2) DEFAULT 0,
            total_sales_cash NUMERIC(15,2) DEFAULT 0,
            total_expenses_cash NUMERIC(15,2) DEFAULT 0,
            opening_time VARCHAR(100),
            closing_time VARCHAR(100),
            data JSONB NOT NULL DEFAULT '{}',
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 4. Employees
        await client.query(`
          CREATE TABLE IF NOT EXISTS employees (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            code VARCHAR(100),
            salesman_acc VARCHAR(100),
            account_title VARCHAR(255),
            prefix_title VARCHAR(50),
            first_name VARCHAR(150),
            last_name VARCHAR(150),
            full_name VARCHAR(255) NOT NULL,
            designation VARCHAR(150),
            salary_type VARCHAR(100),
            salary NUMERIC(15,2) DEFAULT 0,
            commission_amount NUMERIC(15,2) DEFAULT 0,
            contact_no VARCHAR(100),
            status VARCHAR(50) DEFAULT 'YES',
            reg_date VARCHAR(50),
            city VARCHAR(100),
            data JSONB NOT NULL DEFAULT '{}',
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 5. Customers
        await client.query(`
          CREATE TABLE IF NOT EXISTS customers (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            code VARCHAR(100),
            account_code VARCHAR(100),
            manual_code VARCHAR(100),
            account_title VARCHAR(255),
            name VARCHAR(255) NOT NULL,
            title VARCHAR(255),
            customer_group VARCHAR(150),
            reg_date VARCHAR(50),
            mobile VARCHAR(100),
            city VARCHAR(100),
            area VARCHAR(150),
            sector VARCHAR(150),
            location VARCHAR(255),
            address TEXT,
            status VARCHAR(50) DEFAULT 'ACTIVE',
            outstanding_balance NUMERIC(15,2) DEFAULT 0,
            credit_limit NUMERIC(15,2) DEFAULT 0,
            total_sales NUMERIC(15,2) DEFAULT 0,
            data JSONB NOT NULL DEFAULT '{}',
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 6. Restaurants
        await client.query(`
          CREATE TABLE IF NOT EXISTS restaurants (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            code VARCHAR(100),
            name VARCHAR(255) NOT NULL,
            branch VARCHAR(150),
            contact_person VARCHAR(150),
            phone VARCHAR(100),
            address TEXT,
            credit_limit NUMERIC(15,2) DEFAULT 0,
            outstanding_balance NUMERIC(15,2) DEFAULT 0,
            data JSONB NOT NULL DEFAULT '{}',
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 7. Suppliers
        await client.query(`
          CREATE TABLE IF NOT EXISTS suppliers (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            code VARCHAR(100),
            title VARCHAR(255),
            account_title VARCHAR(255),
            name VARCHAR(255) NOT NULL,
            supplier_group VARCHAR(150),
            mobile VARCHAR(100),
            vat_number VARCHAR(100),
            phone VARCHAR(100),
            city VARCHAR(100),
            address TEXT,
            status VARCHAR(50) DEFAULT 'ACTIVE',
            payable_to_supplier NUMERIC(15,2) DEFAULT 0,
            payable_type VARCHAR(50) DEFAULT 'CR',
            categories JSONB DEFAULT '[]',
            data JSONB NOT NULL DEFAULT '{}',
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 8. Products / Stock Items
        await client.query(`
          CREATE TABLE IF NOT EXISTS products (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            sku VARCHAR(100),
            name VARCHAR(255) NOT NULL,
            name_ur VARCHAR(255),
            category VARCHAR(150),
            brand VARCHAR(150),
            measure_unit VARCHAR(100),
            purchase_price NUMERIC(15,2) DEFAULT 0,
            sale_price NUMERIC(15,2) DEFAULT 0,
            current_quantity NUMERIC(15,2) DEFAULT 0,
            min_quantity NUMERIC(15,2) DEFAULT 0,
            wholesale_rate NUMERIC(15,2) DEFAULT 0,
            retail_rate NUMERIC(15,2) DEFAULT 0,
            data JSONB NOT NULL DEFAULT '{}',
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 9. Inventory Transactions
        await client.query(`
          CREATE TABLE IF NOT EXISTS inventory_transactions (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            product_id VARCHAR(100) NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            quantity NUMERIC(15,2) DEFAULT 0,
            previous_quantity NUMERIC(15,2) DEFAULT 0,
            new_quantity NUMERIC(15,2) DEFAULT 0,
            unit_cost NUMERIC(15,2) DEFAULT 0,
            reference_id VARCHAR(100),
            reference_type VARCHAR(50),
            notes TEXT,
            timestamp VARCHAR(100),
            user_name VARCHAR(150),
            data JSONB NOT NULL DEFAULT '{}'
          );
        `);

        // 10. Orders
        await client.query(`
          CREATE TABLE IF NOT EXISTS orders (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            order_number VARCHAR(100),
            restaurant_id VARCHAR(100),
            restaurant_name VARCHAR(255),
            status VARCHAR(50) DEFAULT 'Pending',
            total_amount NUMERIC(15,2) DEFAULT 0,
            paid_amount NUMERIC(15,2) DEFAULT 0,
            balance_amount NUMERIC(15,2) DEFAULT 0,
            order_date VARCHAR(50),
            items JSONB DEFAULT '[]',
            data JSONB NOT NULL DEFAULT '{}',
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 11. Payments
        await client.query(`
          CREATE TABLE IF NOT EXISTS payments (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            order_id VARCHAR(100),
            restaurant_id VARCHAR(100),
            restaurant_name VARCHAR(255),
            amount NUMERIC(15,2) DEFAULT 0,
            payment_method VARCHAR(100) DEFAULT 'CASH',
            reference_no VARCHAR(100),
            date VARCHAR(50),
            received_by VARCHAR(150),
            data JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 12. Expenses
        await client.query(`
          CREATE TABLE IF NOT EXISTS expenses (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            title VARCHAR(255) NOT NULL,
            category VARCHAR(150),
            amount NUMERIC(15,2) DEFAULT 0,
            date VARCHAR(50),
            payment_method VARCHAR(100) DEFAULT 'CASH',
            paid_to VARCHAR(255),
            description TEXT,
            logged_by VARCHAR(150),
            data JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 13. Audit Logs
        await client.query(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(100) NOT NULL,
            entity_id VARCHAR(100),
            user_name VARCHAR(150),
            user_role VARCHAR(100),
            timestamp VARCHAR(100),
            details JSONB DEFAULT '{}',
            ip_address VARCHAR(100)
          );
        `);

        // 14. Purchase Bills
        await client.query(`
          CREATE TABLE IF NOT EXISTS purchase_bills (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            bill_number VARCHAR(100),
            supplier_id VARCHAR(100),
            supplier_name VARCHAR(255),
            bill_date VARCHAR(50),
            total_amount NUMERIC(15,2) DEFAULT 0,
            paid_amount NUMERIC(15,2) DEFAULT 0,
            balance_amount NUMERIC(15,2) DEFAULT 0,
            status VARCHAR(50) DEFAULT 'POSTED',
            items JSONB DEFAULT '[]',
            data JSONB NOT NULL DEFAULT '{}',
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 15. Sale Bills
        await client.query(`
          CREATE TABLE IF NOT EXISTS sale_bills (
            id VARCHAR(100) PRIMARY KEY,
            company_id VARCHAR(100),
            bill_number VARCHAR(100),
            customer_id VARCHAR(100),
            customer_name VARCHAR(255),
            bill_date VARCHAR(50),
            total_amount NUMERIC(15,2) DEFAULT 0,
            paid_amount NUMERIC(15,2) DEFAULT 0,
            balance_amount NUMERIC(15,2) DEFAULT 0,
            status VARCHAR(50) DEFAULT 'COMPLETED',
            items JSONB DEFAULT '[]',
            data JSONB NOT NULL DEFAULT '{}',
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // 16. Metadata Lookups
        await client.query(`
          CREATE TABLE IF NOT EXISTS metadata_lookups (
            key VARCHAR(100) NOT NULL,
            company_id VARCHAR(100) DEFAULT 'comp_default_01',
            values JSONB NOT NULL DEFAULT '[]',
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (key, company_id)
          );
        `);

        // -------------------------------------------------------------
        // MULTI-TENANT COLUMN ADDITIONS (Guarantees backwards-compatibility)
        // -------------------------------------------------------------
        const tenantTables = [
          'users',
          'company_profile',
          'cash_register',
          'employees',
          'customers',
          'restaurants',
          'suppliers',
          'products',
          'inventory_transactions',
          'orders',
          'payments',
          'expenses',
          'audit_logs',
          'purchase_bills',
          'sale_bills',
          'metadata_lookups',
        ];

        for (const tbl of tenantTables) {
          await client.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS company_id VARCHAR(100);`);
          await client.query(`CREATE INDEX IF NOT EXISTS idx_${tbl}_company_id ON ${tbl}(company_id);`);
        }

        // Indexes for performance
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_companies_invite_code ON companies(invite_code);
          CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
          CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
          CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
          CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
          CREATE INDEX IF NOT EXISTS idx_sale_bills_customer ON sale_bills(customer_id);
          CREATE INDEX IF NOT EXISTS idx_purchase_bills_supplier ON purchase_bills(supplier_id);
          CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
        `);

        // Seed default company 'comp_default_01' if empty and backfill nulls
        await client.query(`
          INSERT INTO companies (
            id, name, owner_name, invite_code, invite_code_status, currency
          ) VALUES (
            'comp_default_01', 'Restaurant ERP HQ', 'Admin', 'ERP-7K9P', 'ACTIVE', 'AED'
          ) ON CONFLICT (id) DO NOTHING;
        `);

        for (const tbl of tenantTables) {
          await client.query(`UPDATE ${tbl} SET company_id = 'comp_default_01' WHERE company_id IS NULL;`);
        }

        // Permanently purge uncreated template accounts from PostgreSQL
        await client.query(`
          DELETE FROM users 
          WHERE id IN ('usr-accountant', 'usr-manager', 'usr-sales', 'usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5')
             OR LOWER(username) IN ('accountant', 'manager', 'sales');
        `);

        await client.query('COMMIT');
        this.isInitialized = true;
        console.log('[PostgreSQL] Multi-tenant database tables & company isolation verified successfully.');
        return true;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('[PostgreSQL Schema Warning]: Could not initialize schema:', err.message);
      return false;
    }
  }

  public async getTableCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    if (!this.pool) return counts;

    const tables = [
      'companies',
      'users',
      'company_profile',
      'cash_register',
      'employees',
      'customers',
      'restaurants',
      'suppliers',
      'products',
      'inventory_transactions',
      'orders',
      'payments',
      'expenses',
      'audit_logs',
      'purchase_bills',
      'sale_bills',
    ];

    try {
      const client = await this.pool.connect();
      try {
        for (const tbl of tables) {
          try {
            const res = await client.query(`SELECT COUNT(*) as cnt FROM ${tbl};`);
            counts[tbl] = parseInt(res.rows[0]?.cnt || '0', 10);
          } catch {
            counts[tbl] = 0;
          }
        }
      } finally {
        client.release();
      }
    } catch (err) {
      // silently ignore table count errors
    }
    return counts;
  }

  // =========================================================================
  // MULTI-TENANT COMPANY MANAGEMENT
  // =========================================================================
  public async getCompany(id: string): Promise<Company | null> {
    if (!this.pool) return null;
    try {
      const res = await this.pool.query('SELECT * FROM companies WHERE id = $1 LIMIT 1;', [id]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...(r.data || {}),
        id: r.id,
        name: r.name,
        ownerId: r.owner_id,
        ownerName: r.owner_name,
        inviteCode: r.invite_code,
        inviteCodeStatus: r.invite_code_status || 'ACTIVE',
        inviteCodeCreatedAt: r.invite_code_created_at ? new Date(r.invite_code_created_at).toISOString() : undefined,
        inviteCodeExpiresAt: r.invite_code_expires_at ? new Date(r.invite_code_expires_at).toISOString() : null,
        phone: r.phone,
        city: r.city,
        address: r.address,
        businessType: r.business_type,
        currency: r.currency || 'AED',
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn('[PostgreSQL getCompany error]:', err.message);
      return null;
    }
  }

  public async getCompanyByInviteCode(inviteCode: string): Promise<Company | null> {
    if (!this.pool) return null;
    try {
      const clean = (inviteCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const res = await this.pool.query(
        `SELECT * FROM companies 
         WHERE REPLACE(UPPER(invite_code), '-', '') = $1 
         LIMIT 1;`,
        [clean]
      );
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        ...(r.data || {}),
        id: r.id,
        name: r.name,
        ownerId: r.owner_id,
        ownerName: r.owner_name,
        inviteCode: r.invite_code,
        inviteCodeStatus: r.invite_code_status || 'ACTIVE',
        inviteCodeCreatedAt: r.invite_code_created_at ? new Date(r.invite_code_created_at).toISOString() : undefined,
        inviteCodeExpiresAt: r.invite_code_expires_at ? new Date(r.invite_code_expires_at).toISOString() : null,
        phone: r.phone,
        city: r.city,
        address: r.address,
        businessType: r.business_type,
        currency: r.currency || 'AED',
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn('[PostgreSQL getCompanyByInviteCode error]:', err.message);
      return null;
    }
  }

  public async createCompany(company: Company): Promise<Company> {
    if (!this.pool) return company;
    try {
      await this.pool.query(
        `INSERT INTO companies (
          id, name, owner_id, owner_name, invite_code, invite_code_status,
          invite_code_created_at, invite_code_expires_at, phone, city, address,
          business_type, currency, data, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          owner_name = EXCLUDED.owner_name,
          invite_code = EXCLUDED.invite_code,
          invite_code_status = EXCLUDED.invite_code_status,
          phone = EXCLUDED.phone,
          city = EXCLUDED.city,
          address = EXCLUDED.address,
          business_type = EXCLUDED.business_type,
          currency = EXCLUDED.currency,
          updated_at = NOW();`,
        [
          company.id,
          company.name,
          company.ownerId || '',
          company.ownerName || '',
          company.inviteCode,
          company.inviteCodeStatus || 'ACTIVE',
          company.inviteCodeCreatedAt || new Date().toISOString(),
          company.inviteCodeExpiresAt || null,
          company.phone || '',
          company.city || '',
          company.address || '',
          company.businessType || 'Wholesale Food & Grains',
          company.currency || 'AED',
          JSON.stringify(company),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL createCompany error]:', err.message);
    }
    return company;
  }

  public async updateCompanyInviteCode(
    companyId: string,
    inviteCode: string,
    status: 'ACTIVE' | 'REVOKED' = 'ACTIVE'
  ): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `UPDATE companies SET 
          invite_code = $1, 
          invite_code_status = $2, 
          invite_code_created_at = NOW(), 
          updated_at = NOW() 
         WHERE id = $3;`,
        [inviteCode, status, companyId]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL updateCompanyInviteCode error]:', err.message);
    }
  }

  public async getAllCompanies(): Promise<Company[]> {
    if (!this.pool) return [];
    try {
      const res = await this.pool.query('SELECT * FROM companies ORDER BY created_at;');
      return res.rows.map((r) => ({
        ...(r.data || {}),
        id: r.id,
        name: r.name,
        ownerId: r.owner_id,
        ownerName: r.owner_name,
        inviteCode: r.invite_code,
        inviteCodeStatus: r.invite_code_status || 'ACTIVE',
        inviteCodeCreatedAt: r.invite_code_created_at ? new Date(r.invite_code_created_at).toISOString() : undefined,
        inviteCodeExpiresAt: r.invite_code_expires_at ? new Date(r.invite_code_expires_at).toISOString() : null,
        phone: r.phone,
        city: r.city,
        address: r.address,
        businessType: r.business_type,
        currency: r.currency || 'AED',
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
      }));
    } catch (err: any) {
      console.warn('[PostgreSQL getAllCompanies error]:', err.message);
      return [];
    }
  }

  public async getAllUsers(): Promise<(User & { passwordHash?: string; companyId: string })[]> {
    if (!this.pool) return [];
    try {
      const res = await this.pool.query('SELECT * FROM users ORDER BY created_at;');
      return res.rows.map((r) => ({
        ...(r.data || {}),
        id: r.id,
        companyId: r.company_id || 'comp_default_01',
        username: r.username,
        name: r.name,
        role: r.role,
        email: r.email,
        password: r.password,
        passwordHash: r.password,
        avatar: r.avatar,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
      }));
    } catch (err: any) {
      console.warn('[PostgreSQL getAllUsers error]:', err.message);
      return [];
    }
  }

  // =========================================================================
  // DATA LOAD & SYNC (PostgreSQL -> Memory / Snapshot) PER COMPANY
  // =========================================================================
  public async loadCompanyData(companyId: string): Promise<any | null> {
    if (!this.pool) return null;

    try {
      const client = await this.pool.connect();
      try {
        const [
          usersRes,
          compRes,
          cashRes,
          empRes,
          custRes,
          restRes,
          supRes,
          prodRes,
          invRes,
          ordRes,
          payRes,
          expRes,
          auditRes,
          pbRes,
          sbRes,
          metaRes,
        ] = await Promise.all([
          client.query('SELECT * FROM users WHERE company_id = $1 ORDER BY id;', [companyId]),
          client.query('SELECT * FROM company_profile WHERE company_id = $1 LIMIT 1;', [companyId]),
          client.query('SELECT * FROM cash_register WHERE company_id = $1 LIMIT 1;', [companyId]),
          client.query('SELECT * FROM employees WHERE company_id = $1 ORDER BY id;', [companyId]),
          client.query('SELECT * FROM customers WHERE company_id = $1 ORDER BY id;', [companyId]),
          client.query('SELECT * FROM restaurants WHERE company_id = $1 ORDER BY id;', [companyId]),
          client.query(`
            SELECT * FROM suppliers 
            WHERE company_id = $1 
               OR company_id = 'comp_default_01' 
               OR company_id IS NULL 
               OR company_id = ''
            ORDER BY id;
          `, [companyId]),
          client.query('SELECT * FROM products WHERE company_id = $1 ORDER BY id;', [companyId]),
          client.query('SELECT * FROM inventory_transactions WHERE company_id = $1 ORDER BY id;', [companyId]),
          client.query('SELECT * FROM orders WHERE company_id = $1 ORDER BY id;', [companyId]),
          client.query('SELECT * FROM payments WHERE company_id = $1 ORDER BY id;', [companyId]),
          client.query('SELECT * FROM expenses WHERE company_id = $1 ORDER BY id;', [companyId]),
          client.query('SELECT * FROM audit_logs WHERE company_id = $1 ORDER BY id DESC LIMIT 5000;', [companyId]),
          client.query('SELECT * FROM purchase_bills WHERE company_id = $1 ORDER BY id;', [companyId]),
          client.query('SELECT * FROM sale_bills WHERE company_id = $1 ORDER BY id;', [companyId]),
          client.query('SELECT * FROM metadata_lookups WHERE company_id = $1;', [companyId]),
        ]);

        const extractItem = (row: any) => ({
          ...(row.data || {}),
          ...row,
          companyId,
          data: undefined,
        });

        const extractCustomer = (row: any): Customer => {
          const d = row.data || {};
          return {
            ...d,
            ...row,
            id: row.id || d.id,
            code: row.code || d.code || row.account_code || d.accountCode || '',
            accountCode: row.account_code || d.accountCode || row.code || d.code || '',
            manualCode: row.manual_code ?? d.manualCode ?? '',
            accountTitle: row.account_title || d.accountTitle || row.name || d.name || row.title || d.title || '',
            name: row.name || d.name || row.account_title || d.accountTitle || '',
            title: row.title || d.title || row.account_title || d.accountTitle || '',
            customerGroup: row.customer_group || d.customerGroup || 'Restaurants',
            regDate: row.reg_date || d.regDate || '',
            mobile: row.mobile || d.mobile || '',
            city: row.city || d.city || '',
            area: row.area || d.area || '',
            sector: row.sector || d.sector || '',
            location: row.location || d.location || '',
            address: row.address || d.address || '',
            status: (row.status || d.status || 'ACTIVE').toUpperCase() as any,
            outstandingBalance: parseFloat(row.outstanding_balance ?? d.outstandingBalance ?? 0),
            creditLimit: parseFloat(row.credit_limit ?? d.creditLimit ?? 50000),
            totalSales: parseFloat(row.total_sales ?? d.totalSales ?? 0),
            companyId,
            data: undefined,
          };
        };

        const extractSupplier = (row: any): Supplier => {
          const d = row.data || {};
          const title = row.title || d.title || row.account_title || d.accountTitle || row.name || d.name || 'Supplier';
          return {
            ...d,
            ...row,
            id: row.id || d.id,
            code: row.code || d.code || '',
            title,
            accountTitle: row.account_title || d.accountTitle || title,
            name: row.name || d.name || title,
            supplierGroup: row.supplier_group || d.supplierGroup || 'General Trading',
            mobile: row.mobile || d.mobile || row.phone || d.phone || '',
            vatNumber: row.vat_number || d.vatNumber || '',
            ntnNumber: row.ntn_number || d.ntnNumber || '',
            bankName: row.bank_name || d.bankName || '',
            bankTitle: row.bank_title || d.bankTitle || '',
            bankAccountNo: row.bank_account_no || d.bankAccountNo || '',
            prefixTitle: row.prefix_title || d.prefixTitle || 'Mr',
            firstName: row.first_name || d.firstName || '',
            lastName: row.last_name || d.lastName || '',
            contactPerson: row.contact_person || d.contactPerson || title,
            email: row.email || d.email || '',
            telephones: row.telephones || d.telephones || '',
            phone: row.phone || d.phone || row.mobile || d.mobile || '',
            city: row.city || d.city || 'Sharjah',
            address: row.address || d.address || '',
            cnic: row.cnic || d.cnic || '',
            status: ((row.status || d.status || 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') as any,
            payableToSupplier: parseFloat(row.payable_to_supplier ?? d.payableToSupplier ?? row.balance_owed ?? d.balanceOwed ?? 0),
            payableType: (row.payable_type || d.payableType || 'CR').toUpperCase() as any,
            categories: Array.isArray(row.categories) ? row.categories : (Array.isArray(d.categories) ? d.categories : []),
            companyId,
            data: undefined,
          };
        };

        const extractProduct = (row: any): Product => {
          const d = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
          const name = row.name || d.name || d.itemTitle || '';
          const category = row.category || d.category || 'General';
          const measure = row.measure_unit || d.measure || d.unit || 'Units';
          const combined = `${name} ${category} ${measure}`.toLowerCase();
          const pkg = d.packageType || row.package_type ||
            (combined.includes('bag') || combined.includes('bori') || combined.includes('sugar') || combined.includes('suger') || combined.includes('rice') || combined.includes('chawal') || combined.includes('atta') || combined.includes('flour') || combined.includes('daal') ? 'Bag' :
             combined.includes('box') || combined.includes('dabba') ? 'Box' :
             combined.includes('tin') || combined.includes('can') || combined.includes('drum') ? 'Tin' :
             combined.includes('pack') ? 'Pack' : 'Carton');

          const qtyInCarton = Number(d.qtyInCarton) > 0 ? Number(d.qtyInCarton) : 1;
          const purchasePrice = parseFloat(row.purchase_price ?? d.purchasePrice ?? 0);
          const salePrice = parseFloat(row.sale_price ?? d.salePrice ?? d.sellingPrice ?? 0);
          const currentQty = parseFloat(row.current_quantity ?? d.currentQuantity ?? d.totalStock ?? 0);

          return {
            ...d,
            ...row,
            id: row.id || d.id,
            sku: row.sku || d.sku || d.mcode || '',
            mcode: row.sku || d.mcode || d.sku || '',
            name,
            itemTitle: name,
            category,
            brand: row.brand || d.brand || '',
            measure,
            unit: measure as any,
            packageType: pkg,
            qtyInCarton,
            carton: d.carton !== undefined ? d.carton : d.ctn,
            ctn: d.ctn !== undefined ? d.ctn : d.carton,
            extraKg: d.extraKg !== undefined ? d.extraKg : d.pcs,
            pcs: d.pcs !== undefined ? d.pcs : d.extraKg,
            ctnPurchaseRate: Number(d.ctnPurchaseRate) || (purchasePrice * qtyInCarton),
            ctnSaleRate: Number(d.ctnSaleRate) || (salePrice * qtyInCarton),
            purchasePrice,
            salePrice,
            sellingPrice: salePrice,
            currentQuantity: currentQty,
            totalStock: currentQty,
            stockValue: Number((currentQty * purchasePrice).toFixed(2)),
            companyId,
            data: undefined,
          };
        };

        const extractPurchaseBill = (row: any): PurchaseBill => {
          const d = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
          let items: PurchaseBillItem[] = Array.isArray(row.items) ? row.items : (Array.isArray(d.items) ? d.items : []);
          items = items.map((it: any) => {
            const combined = `${it.itemTitle || ''} ${it.category || ''} ${it.unit || ''}`.toLowerCase();
            const pkg = it.packageType ||
              (combined.includes('bag') || combined.includes('bori') || combined.includes('sugar') || combined.includes('suger') || combined.includes('rice') || combined.includes('atta') || combined.includes('daal') ? 'Bag' :
               combined.includes('box') ? 'Box' :
               combined.includes('tin') ? 'Tin' :
               combined.includes('pack') ? 'Pack' : 'Carton');
            return {
              ...it,
              packageType: pkg,
              unit: it.unit || (pkg === 'Bag' ? 'KG' : 'CTN'),
            };
          });

          return {
            ...d,
            ...row,
            id: row.id || d.id,
            billNumber: row.bill_number || d.billNumber || '',
            supplierId: row.supplier_id || d.supplierId || '',
            supplierName: row.supplier_name || d.supplierName || d.supplierAccountTitle || '',
            supplierAccountTitle: row.supplier_name || d.supplierAccountTitle || d.supplierName || '',
            date: row.bill_date || d.date || '',
            totalAmount: parseFloat(row.total_amount ?? d.totalAmount ?? d.netTotal ?? 0),
            netTotal: parseFloat(row.total_amount ?? d.netTotal ?? d.totalAmount ?? 0),
            paidAmount: parseFloat(row.paid_amount ?? d.paidAmount ?? 0),
            remainingBalance: parseFloat(row.balance_amount ?? d.remainingBalance ?? 0),
            items,
            companyId,
            data: undefined,
          };
        };

        const extractSaleBill = (row: any): SaleBill => {
          const d = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
          let items: SaleBillItem[] = Array.isArray(row.items) ? row.items : (Array.isArray(d.items) ? d.items : []);
          items = items.map((it: any) => {
            const combined = `${it.itemTitle || ''} ${it.category || ''} ${it.unit || ''}`.toLowerCase();
            const pkg = it.packageType ||
              (combined.includes('bag') || combined.includes('bori') || combined.includes('sugar') || combined.includes('suger') || combined.includes('rice') || combined.includes('atta') || combined.includes('daal') ? 'Bag' :
               combined.includes('box') ? 'Box' :
               combined.includes('tin') ? 'Tin' :
               combined.includes('pack') ? 'Pack' : 'Carton');
            return {
              ...it,
              packageType: pkg,
              unit: it.unit || (pkg === 'Bag' ? 'KG' : 'CTN'),
            };
          });

          return {
            ...d,
            ...row,
            id: row.id || d.id,
            billNumber: row.bill_number || d.billNumber || '',
            customerId: row.customer_id || d.customerId || '',
            customerName: row.customer_name || d.customerName || d.customerAccountTitle || '',
            customerAccountTitle: row.customer_name || d.customerAccountTitle || d.customerName || '',
            date: row.bill_date || d.date || '',
            totalAmount: parseFloat(row.total_amount ?? d.totalAmount ?? d.netTotal ?? 0),
            netTotal: parseFloat(row.total_amount ?? d.netTotal ?? d.totalAmount ?? 0),
            paidAmount: parseFloat(row.paid_amount ?? d.cashReceived ?? d.paidAmount ?? 0),
            balanceReceivable: parseFloat(row.balance_amount ?? d.balanceReceivable ?? 0),
            items,
            companyId,
            data: undefined,
          };
        };

        const users: User[] = usersRes.rows.map(extractItem);
        const companyProfile: CompanyProfile | null = compRes.rows[0] ? extractItem(compRes.rows[0]) : null;
        const cashRegister: CashRegister | null = cashRes.rows[0] ? extractItem(cashRes.rows[0]) : null;
        const employees: Employee[] = empRes.rows.map(extractItem);
        const customers: Customer[] = custRes.rows.map(extractCustomer);
        const restaurants: Restaurant[] = restRes.rows.map(extractItem);
        
        // Deduplicate suppliers: default suppliers loaded first, company-specific suppliers overwrite/add
        const rawSuppliers: Supplier[] = supRes.rows.map(extractSupplier);
        const supplierMap = new Map<string, Supplier>();
        for (const s of rawSuppliers) {
          if (s.companyId !== companyId) {
            const key = (s.code || s.title || s.name || s.id).trim().toLowerCase();
            if (!supplierMap.has(key)) {
              supplierMap.set(key, { ...s, companyId });
            }
          }
        }
        for (const s of rawSuppliers) {
          if (s.companyId === companyId) {
            const key = (s.code || s.title || s.name || s.id).trim().toLowerCase();
            supplierMap.set(key, s);
          }
        }
        const suppliers: Supplier[] = Array.from(supplierMap.values());
        const products: Product[] = prodRes.rows.map(extractProduct);
        const inventoryTransactions: InventoryTransaction[] = invRes.rows.map(extractItem);
        const orders: Order[] = ordRes.rows.map(extractItem);
        const payments: Payment[] = payRes.rows.map(extractItem);
        const expenses: Expense[] = expRes.rows.map(extractItem);
        const auditLogs: AuditLog[] = auditRes.rows.map(extractItem);
        const purchaseBills: PurchaseBill[] = pbRes.rows.map(extractPurchaseBill);
        const saleBills: SaleBill[] = sbRes.rows.map(extractSaleBill);

        const lookups: Record<string, string[]> = {};
        for (const r of metaRes.rows) {
          lookups[r.key] = Array.isArray(r.values) ? r.values : [];
        }

        return {
          users,
          companyProfile,
          cashRegister,
          employees,
          customers,
          restaurants,
          suppliers,
          products,
          inventoryTransactions,
          orders,
          payments,
          expenses,
          auditLogs,
          purchaseBills,
          saleBills,
          itemCategories: lookups['itemCategories'],
          itemBrands: lookups['itemBrands'],
          itemMeasures: lookups['itemMeasures'],
          customerGroups: lookups['customerGroups'],
          customerSectors: lookups['customerSectors'],
          customerAreas: lookups['customerAreas'],
          customerZones: lookups['customerZones'],
          customerCities: lookups['customerCities'],
          customerCountries: lookups['customerCountries'],
        };
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn(`[PostgreSQL Load Error for Company ${companyId}]:`, err.message);
      return null;
    }
  }

  public async loadAllData(companyId = 'comp_default_01'): Promise<any | null> {
    return await this.loadCompanyData(companyId);
  }

  // =========================================================================
  // PERSISTENCE & UPSERTS (Save every single entity into PostgreSQL with company_id)
  // =========================================================================
  public async upsertUser(user: User, companyId = 'comp_default_01', passwordHash?: string): Promise<void> {
    if (!this.pool) return;
    try {
      const pwd = passwordHash || (user as any).passwordHash || user.password || '';
      const cid = companyId || user.companyId || 'comp_default_01';
      await this.pool.query(
        `INSERT INTO users (id, company_id, username, password, name, role, email, phone, avatar, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           username = EXCLUDED.username,
           password = CASE 
             WHEN EXCLUDED.password IS NOT NULL AND EXCLUDED.password != '' AND EXCLUDED.password != 'admin' THEN EXCLUDED.password
             WHEN users.password IS NOT NULL AND users.password != '' AND users.password != 'admin' THEN users.password
             WHEN EXCLUDED.password IS NOT NULL AND EXCLUDED.password != '' THEN EXCLUDED.password
             ELSE users.password
           END,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           avatar = EXCLUDED.avatar,
           data = EXCLUDED.data,
           updated_at = NOW();`,
        [
          user.id,
          cid,
          user.username || '',
          pwd,
          user.name,
          user.role,
          user.email || '',
          (user as any).phone || '',
          user.avatar || '',
          JSON.stringify({
            ...user,
            password: pwd || user.password,
            passwordHash: pwd || (user as any).passwordHash,
            companyId: cid,
          }),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL upsertUser error]:', err.message);
    }
  }

  public async deleteUser(id: string, companyId?: string): Promise<void> {
    if (!this.pool) return;
    try {
      if (companyId) {
        await this.pool.query('DELETE FROM users WHERE id = $1 AND company_id = $2;', [id, companyId]);
      } else {
        await this.pool.query('DELETE FROM users WHERE id = $1;', [id]);
      }
    } catch (err: any) {
      console.warn('[PostgreSQL deleteUser error]:', err.message);
    }
  }

  public async upsertCompanyProfile(profile: CompanyProfile | null, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool || !profile) return;
    try {
      const id = profile.id || `comp-prof-${companyId}`;
      await this.pool.query(
        `INSERT INTO company_profile (id, company_id, name, owner_name, phone, city, address, business_type, ntn, tagline, currency, is_registered, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           name = EXCLUDED.name,
           owner_name = EXCLUDED.owner_name,
           phone = EXCLUDED.phone,
           city = EXCLUDED.city,
           address = EXCLUDED.address,
           business_type = EXCLUDED.business_type,
           ntn = EXCLUDED.ntn,
           tagline = EXCLUDED.tagline,
           currency = EXCLUDED.currency,
           is_registered = EXCLUDED.is_registered,
           data = EXCLUDED.data,
           updated_at = NOW();`,
        [
          id,
          companyId,
          profile.name,
          profile.ownerName || '',
          profile.phone || '',
          profile.city || '',
          profile.address || '',
          profile.businessType || '',
          profile.ntn || '',
          profile.tagline || '',
          profile.currency || 'AED',
          Boolean(profile.isRegistered),
          JSON.stringify(profile),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL upsertCompanyProfile error]:', err.message);
    }
  }

  public async upsertCashRegister(register: CashRegister | null, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool || !register) return;
    try {
      const reg = register as any;
      const id = reg.id || `cash-register-${companyId}`;
      await this.pool.query(
        `INSERT INTO cash_register (id, company_id, status, opening_cash, current_cash, closing_cash, total_sales_cash, total_expenses_cash, opening_time, closing_time, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           status = EXCLUDED.status,
           opening_cash = EXCLUDED.opening_cash,
           current_cash = EXCLUDED.current_cash,
           closing_cash = EXCLUDED.closing_cash,
           total_sales_cash = EXCLUDED.total_sales_cash,
           total_expenses_cash = EXCLUDED.total_expenses_cash,
           opening_time = EXCLUDED.opening_time,
           closing_time = EXCLUDED.closing_time,
           data = EXCLUDED.data,
           updated_at = NOW();`,
        [
          id,
          companyId,
          reg.status || 'OPEN',
          reg.openingCashBalance ?? reg.openingCash ?? 0,
          reg.currentCash ?? reg.openingCashBalance ?? 0,
          reg.closingCash ?? 0,
          reg.totalSalesCash ?? 0,
          reg.totalExpensesCash ?? 0,
          reg.openingTime || '',
          reg.closingTime || '10:00 PM',
          JSON.stringify(register),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL upsertCashRegister error]:', err.message);
    }
  }

  public async upsertEmployee(emp: Employee, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO employees (id, company_id, code, salesman_acc, account_title, prefix_title, first_name, last_name, full_name, designation, salary_type, salary, commission_amount, contact_no, status, reg_date, city, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           code = EXCLUDED.code,
           salesman_acc = EXCLUDED.salesman_acc,
           account_title = EXCLUDED.account_title,
           prefix_title = EXCLUDED.prefix_title,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           full_name = EXCLUDED.full_name,
           designation = EXCLUDED.designation,
           salary_type = EXCLUDED.salary_type,
           salary = EXCLUDED.salary,
           commission_amount = EXCLUDED.commission_amount,
           contact_no = EXCLUDED.contact_no,
           status = EXCLUDED.status,
           reg_date = EXCLUDED.reg_date,
           city = EXCLUDED.city,
           data = EXCLUDED.data,
           updated_at = NOW();`,
        [
          emp.id,
          companyId,
          emp.code || '',
          emp.salesmanAcc || '',
          emp.accountTitle || emp.fullName,
          emp.prefixTitle || '',
          emp.firstName || '',
          emp.lastName || '',
          emp.fullName,
          emp.designation || '',
          emp.salaryType || 'MONTHLY',
          emp.salary || 0,
          emp.commissionAmount || 0,
          emp.contactNo || '',
          emp.status || 'YES',
          emp.regDate || '',
          emp.city || '',
          JSON.stringify(emp),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL upsertEmployee error]:', err.message);
    }
  }

  public async deleteEmployee(id: string, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM employees WHERE id = $1 AND (company_id = $2 OR company_id IS NULL)', [id, companyId]);
    } catch (err: any) {
      console.warn('[PostgreSQL deleteEmployee error]:', err.message);
    }
  }

  public async upsertCustomer(cust: Customer, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO customers (id, company_id, code, account_code, manual_code, account_title, name, title, customer_group, reg_date, mobile, city, area, sector, location, address, status, outstanding_balance, credit_limit, total_sales, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           code = EXCLUDED.code,
           account_code = EXCLUDED.account_code,
           manual_code = EXCLUDED.manual_code,
           account_title = EXCLUDED.account_title,
           name = EXCLUDED.name,
           title = EXCLUDED.title,
           customer_group = EXCLUDED.customer_group,
           reg_date = EXCLUDED.reg_date,
           mobile = EXCLUDED.mobile,
           city = EXCLUDED.city,
           area = EXCLUDED.area,
           sector = EXCLUDED.sector,
           location = EXCLUDED.location,
           address = EXCLUDED.address,
           status = EXCLUDED.status,
           outstanding_balance = EXCLUDED.outstanding_balance,
           credit_limit = EXCLUDED.credit_limit,
           total_sales = EXCLUDED.total_sales,
           data = EXCLUDED.data,
           updated_at = NOW();`,
        [
          cust.id,
          companyId,
          cust.code || '',
          cust.accountCode || '',
          cust.manualCode || '',
          cust.accountTitle || cust.name,
          cust.name,
          cust.title || cust.name,
          cust.customerGroup || '',
          cust.regDate || '',
          cust.mobile || '',
          cust.city || '',
          cust.area || '',
          cust.sector || '',
          cust.location || '',
          cust.address || '',
          cust.status || 'ACTIVE',
          cust.outstandingBalance || 0,
          cust.creditLimit || 0,
          cust.totalSales || 0,
          JSON.stringify(cust),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL upsertCustomer error]:', err.message);
    }
  }

  public async deleteCustomer(id: string, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM customers WHERE id = $1 AND (company_id = $2 OR company_id IS NULL)', [id, companyId]);
    } catch (err: any) {
      console.warn('[PostgreSQL deleteCustomer error]:', err.message);
    }
  }

  public async upsertSupplier(sup: Supplier, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO suppliers (id, company_id, code, title, account_title, name, supplier_group, mobile, vat_number, phone, city, address, status, payable_to_supplier, payable_type, categories, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           code = EXCLUDED.code,
           title = EXCLUDED.title,
           account_title = EXCLUDED.account_title,
           name = EXCLUDED.name,
           supplier_group = EXCLUDED.supplier_group,
           mobile = EXCLUDED.mobile,
           vat_number = EXCLUDED.vat_number,
           phone = EXCLUDED.phone,
           city = EXCLUDED.city,
           address = EXCLUDED.address,
           status = EXCLUDED.status,
           payable_to_supplier = EXCLUDED.payable_to_supplier,
           payable_type = EXCLUDED.payable_type,
           categories = EXCLUDED.categories,
           data = EXCLUDED.data,
           updated_at = NOW();`,
        [
          sup.id,
          companyId,
          sup.code || '',
          sup.title || sup.name,
          sup.accountTitle || sup.name,
          sup.name,
          sup.supplierGroup || '',
          sup.mobile || '',
          sup.vatNumber || '',
          sup.phone || '',
          sup.city || '',
          sup.address || '',
          sup.status || 'ACTIVE',
          sup.payableToSupplier || 0,
          sup.payableType || 'CR',
          JSON.stringify(sup.categories || []),
          JSON.stringify(sup),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL upsertSupplier error]:', err.message);
    }
  }

  public async deleteSupplier(id: string, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM suppliers WHERE id = $1 AND (company_id = $2 OR company_id IS NULL)', [id, companyId]);
    } catch (err: any) {
      console.warn('[PostgreSQL deleteSupplier error]:', err.message);
    }
  }

  public async upsertRestaurant(rest: Restaurant, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO restaurants (id, company_id, code, name, branch, contact_person, phone, address, credit_limit, outstanding_balance, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           code = EXCLUDED.code,
           name = EXCLUDED.name,
           branch = EXCLUDED.branch,
           contact_person = EXCLUDED.contact_person,
           phone = EXCLUDED.phone,
           address = EXCLUDED.address,
           credit_limit = EXCLUDED.credit_limit,
           outstanding_balance = EXCLUDED.outstanding_balance,
           data = EXCLUDED.data,
           updated_at = NOW();`,
        [
          rest.id,
          companyId,
          (rest as any).code || '',
          rest.name,
          (rest as any).branch || '',
          rest.contactPerson || '',
          rest.phone || '',
          rest.address || '',
          rest.creditLimit || 0,
          rest.outstandingBalance || 0,
          JSON.stringify(rest),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL upsertRestaurant error]:', err.message);
    }
  }

  public async deleteRestaurant(id: string, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM restaurants WHERE id = $1 AND (company_id = $2 OR company_id IS NULL)', [id, companyId]);
    } catch (err: any) {
      console.warn('[PostgreSQL deleteRestaurant error]:', err.message);
    }
  }

  public async upsertProduct(prod: Product, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      const p = prod as any;
      await this.pool.query(
        `INSERT INTO products (id, company_id, sku, name, name_ur, category, brand, measure_unit, purchase_price, sale_price, current_quantity, min_quantity, wholesale_rate, retail_rate, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           sku = EXCLUDED.sku,
           name = EXCLUDED.name,
           name_ur = EXCLUDED.name_ur,
           category = EXCLUDED.category,
           brand = EXCLUDED.brand,
           measure_unit = EXCLUDED.measure_unit,
           purchase_price = EXCLUDED.purchase_price,
           sale_price = EXCLUDED.sale_price,
           current_quantity = EXCLUDED.current_quantity,
           min_quantity = EXCLUDED.min_quantity,
           wholesale_rate = EXCLUDED.wholesale_rate,
           retail_rate = EXCLUDED.retail_rate,
           data = EXCLUDED.data,
           updated_at = NOW();`,
        [
          p.id,
          companyId,
          p.sku || '',
          p.name,
          p.nameUr || '',
          p.category || '',
          p.brand || p.companyBrand || '',
          p.measureUnit || p.measure || p.unit || '',
          p.purchasePrice || p.costPrice || 0,
          p.salePrice ?? p.sellingPrice ?? 0,
          p.currentQuantity ?? p.stock ?? 0,
          p.minQuantity ?? p.minStockLevel ?? 0,
          p.wholesaleRate || p.ctnSaleRate || 0,
          p.retailRate || 0,
          JSON.stringify(prod),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL upsertProduct error]:', err.message);
    }
  }

  public async deleteProduct(id: string, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM products WHERE id = $1 AND (company_id = $2 OR company_id IS NULL)', [id, companyId]);
    } catch (err: any) {
      console.warn('[PostgreSQL deleteProduct error]:', err.message);
    }
  }

  public async insertInventoryTransaction(tx: InventoryTransaction, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      const t = tx as any;
      await this.pool.query(
        `INSERT INTO inventory_transactions (id, company_id, product_id, product_name, type, quantity, previous_quantity, new_quantity, unit_cost, reference_id, reference_type, notes, timestamp, user_name, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO NOTHING;`,
        [
          t.id,
          companyId,
          t.productId,
          t.productName,
          t.type,
          t.quantity,
          t.previousQuantity ?? 0,
          t.newQuantity ?? t.quantity ?? 0,
          t.unitCost || 0,
          t.referenceId || '',
          t.referenceType || '',
          t.notes || '',
          t.timestamp || t.date || '',
          t.userName || t.performedBy || 'System',
          JSON.stringify(tx),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL insertInventoryTransaction error]:', err.message);
    }
  }

  public async upsertOrder(ord: Order, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      const o = ord as any;
      await this.pool.query(
        `INSERT INTO orders (id, company_id, order_number, restaurant_id, restaurant_name, status, total_amount, paid_amount, balance_amount, order_date, items, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           order_number = EXCLUDED.order_number,
           restaurant_id = EXCLUDED.restaurant_id,
           restaurant_name = EXCLUDED.restaurant_name,
           status = EXCLUDED.status,
           total_amount = EXCLUDED.total_amount,
           paid_amount = EXCLUDED.paid_amount,
           balance_amount = EXCLUDED.balance_amount,
           order_date = EXCLUDED.order_date,
           items = EXCLUDED.items,
           data = EXCLUDED.data,
           updated_at = NOW();`,
        [
          o.id,
          companyId,
          o.orderNumber,
          o.restaurantId,
          o.restaurantName,
          o.status,
          o.totalAmount || 0,
          o.paidAmount || 0,
          o.balanceAmount ?? (o.totalAmount - (o.paidAmount || 0)),
          o.orderDate || o.createdAt || '',
          JSON.stringify(o.items || []),
          JSON.stringify(ord),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL upsertOrder error]:', err.message);
    }
  }

  public async deleteOrder(id: string, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM orders WHERE id = $1 AND (company_id = $2 OR company_id IS NULL)', [id, companyId]);
    } catch (err: any) {
      console.warn('[PostgreSQL deleteOrder error]:', err.message);
    }
  }

  public async upsertPayment(pay: Payment, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      const p = pay as any;
      await this.pool.query(
        `INSERT INTO payments (id, company_id, order_id, restaurant_id, restaurant_name, amount, payment_method, reference_no, date, received_by, data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           amount = EXCLUDED.amount,
           payment_method = EXCLUDED.payment_method,
           reference_no = EXCLUDED.reference_no,
           date = EXCLUDED.date,
           received_by = EXCLUDED.received_by,
           data = EXCLUDED.data;`,
        [
          p.id,
          companyId,
          p.orderId || '',
          p.restaurantId || '',
          p.restaurantName || '',
          p.amount || 0,
          p.paymentMethod || 'CASH',
          p.referenceNo || '',
          p.date || p.createdAt || '',
          p.receivedBy || 'Admin',
          JSON.stringify(pay),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL upsertPayment error]:', err.message);
    }
  }

  public async deletePayment(id: string, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM payments WHERE id = $1 AND (company_id = $2 OR company_id IS NULL)', [id, companyId]);
    } catch (err: any) {
      console.warn('[PostgreSQL deletePayment error]:', err.message);
    }
  }

  public async upsertExpense(exp: Expense, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      const e = exp as any;
      await this.pool.query(
        `INSERT INTO expenses (id, company_id, title, category, amount, date, payment_method, paid_to, description, logged_by, data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           title = EXCLUDED.title,
           category = EXCLUDED.category,
           amount = EXCLUDED.amount,
           date = EXCLUDED.date,
           payment_method = EXCLUDED.payment_method,
           paid_to = EXCLUDED.paid_to,
           description = EXCLUDED.description,
           logged_by = EXCLUDED.logged_by,
           data = EXCLUDED.data;`,
        [
          e.id,
          companyId,
          e.title,
          e.category,
          e.amount || 0,
          e.date || e.createdAt || '',
          e.paymentMethod || 'CASH',
          e.paidTo || '',
          e.description || '',
          e.loggedBy || 'Admin',
          JSON.stringify(exp),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL upsertExpense error]:', err.message);
    }
  }

  public async deleteExpense(id: string, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM expenses WHERE id = $1 AND (company_id = $2 OR company_id IS NULL)', [id, companyId]);
    } catch (err: any) {
      console.warn('[PostgreSQL deleteExpense error]:', err.message);
    }
  }

  public async insertAuditLog(log: AuditLog, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      const l = log as any;
      await this.pool.query(
        `INSERT INTO audit_logs (id, company_id, action, entity_type, entity_id, user_name, user_role, timestamp, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING;`,
        [
          l.id,
          companyId,
          l.action,
          l.entityType,
          l.entityId || '',
          l.userName,
          l.userRole || 'admin',
          l.timestamp,
          JSON.stringify(l.details || l.metadata || {}),
          l.ipAddress || '',
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL insertAuditLog error]:', err.message);
    }
  }

  public async upsertPurchaseBill(bill: PurchaseBill, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      const pb = bill as any;
      await this.pool.query(
        `INSERT INTO purchase_bills (id, company_id, bill_number, supplier_id, supplier_name, bill_date, total_amount, paid_amount, balance_amount, status, items, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           bill_number = EXCLUDED.bill_number,
           supplier_id = EXCLUDED.supplier_id,
           supplier_name = EXCLUDED.supplier_name,
           bill_date = EXCLUDED.bill_date,
           total_amount = EXCLUDED.total_amount,
           paid_amount = EXCLUDED.paid_amount,
           balance_amount = EXCLUDED.balance_amount,
           status = EXCLUDED.status,
           items = EXCLUDED.items,
           data = EXCLUDED.data,
           updated_at = NOW();`,
        [
          pb.id,
          companyId,
          pb.billNumber,
          pb.supplierId,
          pb.supplierAccountTitle || pb.supplierName || '',
          pb.date || pb.billDate || '',
          pb.netTotal ?? pb.totalAmount ?? 0,
          pb.paidAmount ?? 0,
          pb.remainingBalance ?? pb.balanceAmount ?? 0,
          pb.status || 'POSTED',
          JSON.stringify(pb.items || []),
          JSON.stringify(bill),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL upsertPurchaseBill error]:', err.message);
    }
  }

  public async deletePurchaseBill(id: string, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM purchase_bills WHERE id = $1 AND (company_id = $2 OR company_id IS NULL)', [id, companyId]);
    } catch (err: any) {
      console.warn('[PostgreSQL deletePurchaseBill error]:', err.message);
    }
  }

  public async upsertSaleBill(bill: SaleBill, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      const sb = bill as any;
      await this.pool.query(
        `INSERT INTO sale_bills (id, company_id, bill_number, customer_id, customer_name, bill_date, total_amount, paid_amount, balance_amount, status, items, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
         ON CONFLICT (id) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           bill_number = EXCLUDED.bill_number,
           customer_id = EXCLUDED.customer_id,
           customer_name = EXCLUDED.customer_name,
           bill_date = EXCLUDED.bill_date,
           total_amount = EXCLUDED.total_amount,
           paid_amount = EXCLUDED.paid_amount,
           balance_amount = EXCLUDED.balance_amount,
           status = EXCLUDED.status,
           items = EXCLUDED.items,
           data = EXCLUDED.data,
           updated_at = NOW();`,
        [
          sb.id,
          companyId,
          sb.billNumber,
          sb.customerId,
          sb.customerAccountTitle || sb.customerName || '',
          sb.date || sb.billDate || '',
          sb.netTotal ?? sb.totalAmount ?? 0,
          sb.paidAmount ?? (sb.isCash ? sb.netTotal : 0),
          sb.remainingBalance ?? sb.balanceAmount ?? 0,
          sb.status || 'COMPLETED',
          JSON.stringify(sb.items || []),
          JSON.stringify(bill),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL upsertSaleBill error]:', err.message);
    }
  }

  public async deleteSaleBill(id: string, companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM sale_bills WHERE id = $1 AND (company_id = $2 OR company_id IS NULL)', [id, companyId]);
    } catch (err: any) {
      console.warn('[PostgreSQL deleteSaleBill error]:', err.message);
    }
  }

  public async saveLookup(key: string, values: string[], companyId = 'comp_default_01'): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO metadata_lookups (key, company_id, values, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key, company_id) DO UPDATE SET
           values = EXCLUDED.values,
           updated_at = NOW();`,
        [key, companyId, JSON.stringify(values)]
      );
    } catch (err: any) {
      console.warn('[PostgreSQL saveLookup error]:', err.message);
    }
  }

  // =========================================================================
  // COMPLETE ONE-CLICK MIGRATION (Local JSON Schema -> PostgreSQL)
  // =========================================================================
  public async migrateFullSnapshotToPostgres(data: any, companyId = 'comp_default_01'): Promise<{ success: boolean; counts: Record<string, number>; message: string }> {
    const status = await this.testConnection();
    if (!status.connected) {
      return { success: false, counts: {}, message: status.error || 'PostgreSQL not reachable.' };
    }

    await this.initSchema();
    const counts: Record<string, number> = {};

    try {
      // 1. Users
      if (Array.isArray(data.users)) {
        for (const u of data.users) {
          const pwd = (u as any).passwordHash || u.password;
          await this.upsertUser(u, companyId, pwd);
        }
        counts['users'] = data.users.length;
      }

      // 2. Company Profile
      if (data.companyProfile) {
        await this.upsertCompanyProfile(data.companyProfile, companyId);
        counts['companyProfile'] = 1;
      }

      // 3. Cash Register
      if (data.cashRegister) {
        await this.upsertCashRegister(data.cashRegister, companyId);
        counts['cashRegister'] = 1;
      }

      // 4. Employees
      if (Array.isArray(data.employees)) {
        for (const emp of data.employees) await this.upsertEmployee(emp, companyId);
        counts['employees'] = data.employees.length;
      }

      // 5. Customers
      if (Array.isArray(data.customers)) {
        for (const c of data.customers) await this.upsertCustomer(c, companyId);
        counts['customers'] = data.customers.length;
      }

      // 6. Restaurants
      if (Array.isArray(data.restaurants)) {
        for (const r of data.restaurants) await this.upsertRestaurant(r, companyId);
        counts['restaurants'] = data.restaurants.length;
      }

      // 7. Suppliers
      if (Array.isArray(data.suppliers)) {
        for (const s of data.suppliers) await this.upsertSupplier(s, companyId);
        counts['suppliers'] = data.suppliers.length;
      }

      // 8. Products
      if (Array.isArray(data.products)) {
        for (const p of data.products) await this.upsertProduct(p, companyId);
        counts['products'] = data.products.length;
      }

      // 9. Inventory Transactions
      if (Array.isArray(data.inventoryTransactions)) {
        for (const tx of data.inventoryTransactions) await this.insertInventoryTransaction(tx, companyId);
        counts['inventoryTransactions'] = data.inventoryTransactions.length;
      }

      // 10. Orders
      if (Array.isArray(data.orders)) {
        for (const o of data.orders) await this.upsertOrder(o, companyId);
        counts['orders'] = data.orders.length;
      }

      // 11. Payments
      if (Array.isArray(data.payments)) {
        for (const p of data.payments) await this.upsertPayment(p, companyId);
        counts['payments'] = data.payments.length;
      }

      // 12. Expenses
      if (Array.isArray(data.expenses)) {
        for (const e of data.expenses) await this.upsertExpense(e, companyId);
        counts['expenses'] = data.expenses.length;
      }

      // 13. Audit Logs
      if (Array.isArray(data.auditLogs)) {
        for (const log of data.auditLogs) await this.insertAuditLog(log, companyId);
        counts['auditLogs'] = data.auditLogs.length;
      }

      // 14. Purchase Bills
      if (Array.isArray(data.purchaseBills)) {
        for (const pb of data.purchaseBills) await this.upsertPurchaseBill(pb, companyId);
        counts['purchaseBills'] = data.purchaseBills.length;
      }

      // 15. Sale Bills
      if (Array.isArray(data.saleBills)) {
        for (const sb of data.saleBills) await this.upsertSaleBill(sb, companyId);
        counts['saleBills'] = data.saleBills.length;
      }

      // 16. Metadata Lookups
      const lookupKeys = [
        'itemCategories',
        'itemBrands',
        'itemMeasures',
        'customerGroups',
        'customerSectors',
        'customerAreas',
        'customerZones',
        'customerCities',
        'customerCountries',
      ];
      for (const k of lookupKeys) {
        if (Array.isArray(data[k])) {
          await this.saveLookup(k, data[k], companyId);
        }
      }

      return {
        success: true,
        counts,
        message: 'All data successfully synchronized and migrated to PostgreSQL Database!',
      };
    } catch (err: any) {
      return {
        success: false,
        counts,
        message: `Migration error: ${err.message}`,
      };
    }
  }

  // Update .env file with new connection string
  public updateEnvConnectionString(connectionUrl: string) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      let content = '';
      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf-8');
      }

      if (content.includes('DATABASE_URL=')) {
        content = content.replace(/DATABASE_URL=.*/, `DATABASE_URL="${connectionUrl.trim()}"`);
      } else {
        content += `\nDATABASE_URL="${connectionUrl.trim()}"\n`;
      }

      fs.writeFileSync(envPath, content, 'utf-8');
      process.env.DATABASE_URL = connectionUrl.trim();
    } catch (err) {
      console.warn('Failed to update .env file:', err);
    }
  }
}

export const postgresService = new PostgresService();
