const { Pool } = require('pg');
const fs = require('fs');

async function syncPostgres() {
  const pool = new Pool({ connectionString: 'postgresql://postgres:Hannan66@localhost:5432/restaurant_erp' });
  
  try {
    const db = JSON.parse(fs.readFileSync('data/database.json', 'utf8'));
    const customers = db.customers;
    console.log(`Loaded ${customers.length} clean customers from database.json.`);

    // Get list of distinct companies in Postgres
    const compRes = await pool.query('SELECT DISTINCT company_id FROM customers');
    const compIds = compRes.rows.map(r => r.company_id);
    console.log('Postgres companies:', compIds);

    for (const cid of compIds) {
      // Delete existing customers for company
      await pool.query('DELETE FROM customers WHERE company_id = $1', [cid]);
      console.log(`Deleted old customers for ${cid}`);

      // Insert clean 337 customers
      for (const c of customers) {
        const id = `cust-${c.srNo}_${cid}`;
        const query = `
          INSERT INTO customers (
            id, code, account_code, manual_code, account_title, name, title,
            customer_group, reg_date, mobile, city, area, sector, location,
            address, status, outstanding_balance, credit_limit, total_sales,
            data, company_id, opening_balance, opening_balance_type, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19,
            $20, $21, $22, $23, NOW()
          )
        `;
        const custData = { ...c, id, companyId: cid };
        const values = [
          id,
          c.code,
          c.accountCode || c.code,
          c.manualCode || '',
          c.accountTitle,
          c.name || c.accountTitle,
          c.title || c.accountTitle,
          c.customerGroup || 'Restaurants',
          c.regDate || '2026-04-18',
          c.mobile || '',
          c.city || 'Sharjah',
          c.area || 'Sajja Industrial Area',
          c.sector || 'Sector 1',
          c.location || 'Sajja Industrial Area',
          c.address || '',
          c.status || 'ACTIVE',
          0, // outstanding_balance
          c.creditLimit || 30000,
          0, // total_sales
          JSON.stringify(custData),
          cid,
          0, // opening_balance
          'DR'
        ];
        await pool.query(query, values);
      }
      console.log(`Inserted 337 customers for ${cid}`);
    }

    console.log('PostgreSQL sync complete!');
  } catch (err) {
    console.error('Error syncing PostgreSQL:', err);
  } finally {
    await pool.end();
  }
}

syncPostgres();
