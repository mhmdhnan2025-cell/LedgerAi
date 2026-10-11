import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/restaurant|resturant|restaunt|restuant|cafeteria|cafetetria|cafeteriya|cafteria|llc|l\.l\.c|kitchen|bhai|bhi/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanDigits(s) {
  return (s || '').replace(/\D/g, '');
}

const manualAliases = {
  'reyah al rahmania': 'reyah al rehanyah restaurant',
  'dar al noor': 'dar al noor resturant',
  'noor al seef': 'noor al seef restaurent',
  'khayal al shay': 'khayal al shay cafeteria',
  'dar al aman': 'dar al aman resturant',
  'saif al madina': 'saif al madina rest',
  'ard al waha restaurant': 'ard al waha rest',
  'qasar al reyan restaurant': 'qasr al rayan rest',
  'shah jahan cafetetria': 'shah jahan cafeteria',
  'fan al nadir': 'fann al nadir cafeteria',
  'baba ge sialkot': 'baba g sialkot resturant',
  'bait al sajjaa': 'bait al sajja resturant',
  'nahr al sajja': 'nahr al sajja rest',
  'qasar al sajja': 'qaser al sajja rest',
  'qasar al karam': 'qasr al karam rest',
  'al khidmah restaunt': 'al khidmat resturant',
  'dar al maha': 'dar al maha cafeteria',
  'al read carpentry': 'al rayed carpentry',
  'best point super market': 'best point supermarket',
  'pti resturant': 'pti restaurant',
  'bhai abid': 'abid bhai rest',
  'sahil al madina': 'sahil al madina cafeteria',
  'white hill resturant': 'white hill restaurant',
  'babul noor': 'bab al noor cafeteria',
  'orina restaurant': 'arina resturant',
  'al tabaq al sakhin restaurant': 'al tabaq al sakhin rest',
  'muneer bhi': 'muneer bhai',
  'banu beff pulao sajjja': 'bannu beef pulao sajja rest',
  'adwah al sajja': 'adwa al sajja restaurant',
  'akbar ali kitchen': 'akbar ali kitchen rest',
  'tareeq al sada': 'tareeq al sada cafeteria',
  'waraqa al khareef': 'waraq al khareef cafeteria',
  'al khat al awal cafeteria': 'al khat al awal cafetria',
  'rukan al reyan': 'rukn al rayan cafeteria',
  'zahra al bahar': 'zahrat al bahar restaurant',
  'al farina cafeteria': 'al fareena cafeteria',
  'rukan al zawaya': 'rukn al zawya cafeteria',
  'dar al qaram': 'dar al karam resturant',
  '1 to 10 restaurant': 'one to ten resturant',
  'faris al aseel': 'fares al aseel restaurant',
  'mo-toheed cafteria': 'tauheed cafeteria',
  'dar alqasar mandi & madhbi rest l.l.c': 'dar al qaser mandi',
  'shahi qilla restaurant l.l.c': 'shahi qila restaurant',
  'saleem food service': 'saleem resturant',
  'sharooq al fajar': 'shurooq al fajr cafeteria',
  'qasar al shameel': 'qasar al shameel',
  'noor mohammad restaurant': 'noor muhammad restaurant'
};

function findMatch(entry, customerList) {
  const normTitle = normalize(entry.title);
  const rawTitle = entry.title.toLowerCase().trim();
  const alias = manualAliases[rawTitle];
  const ePhone = cleanDigits(entry.phone);

  let match = customerList.find((c) => {
    const cTitle = (c.accountTitle || c.name || '').toLowerCase().trim();
    if (alias && cTitle === alias) return true;
    if (cTitle === rawTitle) return true;
    return false;
  });

  if (!match) {
    match = customerList.find((c) => {
      const cNorm = normalize(c.accountTitle || c.name);
      return cNorm === normTitle;
    });
  }

  if (!match && ePhone && ePhone.length >= 7) {
    match = customerList.find((c) => {
      const cPhone = cleanDigits(c.mobile);
      return cPhone && cPhone.length >= 7 && (cPhone === ePhone || (cPhone.length >= 9 && ePhone.includes(cPhone)) || (ePhone.length >= 9 && cPhone.includes(ePhone)));
    });
  }

  if (!match) {
    match = customerList.find((c) => {
      const cNorm = normalize(c.accountTitle || c.name);
      return (normTitle.length >= 5 && cNorm.includes(normTitle)) || (cNorm.length >= 5 && normTitle.includes(cNorm));
    });
  }

  return match;
}

async function main() {
  const rawFull = fs.readFileSync(path.join(process.cwd(), 'server', 'seeds', 'receivables_full_data.json'), 'utf8');
  const reportEntries = JSON.parse(rawFull);

  console.log(`Loaded ${reportEntries.length} full receivable entries from PDF parser.`);

  const sumDR = reportEntries.filter(e => e.type === 'DR').reduce((s, e) => s + e.balance, 0);
  const sumCR = reportEntries.filter(e => e.type === 'CR').reduce((s, e) => s + e.balance, 0);
  console.log(`Sum DR: ${sumDR.toFixed(2)}, Sum CR: ${sumCR.toFixed(2)}, Net: ${(sumDR - sumCR).toFixed(2)} DR`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Hannan66@localhost:5432/restaurant_erp',
  });

  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL.');

    // 1. Update data/all_329_customers.json & server/seeds/all_329_customers.json
    const catPaths = [
      path.join(process.cwd(), 'data', 'all_329_customers.json'),
      path.join(process.cwd(), 'server', 'seeds', 'all_329_customers.json'),
    ];

    const ensureNames = [
      { title: 'Marhaba cafeteria', code: '0101040336', balance: 59.39, type: 'DR' },
      { title: 'Noor mohammad restaurant', code: '0101040337', balance: 225.01, type: 'DR' },
      { title: 'Qasar al shameel', code: '0101040338', balance: 465.15, type: 'DR', phone: '0527113421', salesman: 'Ashiq Ali' },
    ];

    let baseCatalog = [];

    for (const catPath of catPaths) {
      if (fs.existsSync(catPath)) {
        let cat = JSON.parse(fs.readFileSync(catPath, 'utf8'));

        for (const en of ensureNames) {
          const found = cat.find(c => (c.accountTitle || c.name || '').toLowerCase().includes(en.title.toLowerCase()));
          if (found) {
            found.code = en.code;
            found.accountCode = en.code;
            found.id = `cust-${en.code}`;
            found.openingBalance = en.balance;
            found.openingBalanceType = en.type;
            found.outstandingBalance = en.balance;
          } else {
            cat.push({
              id: `cust-${en.code}`,
              code: en.code,
              accountCode: en.code,
              accountTitle: en.title,
              name: en.title,
              title: en.title,
              customerGroup: 'Restaurants',
              mobile: en.phone || '',
              salesman: en.salesman || '',
              assignedSalesman: en.salesman || '',
              city: 'Sharjah',
              status: 'ACTIVE',
              openingBalance: en.balance,
              openingBalanceType: en.type,
              outstandingBalance: en.balance,
              creditLimit: 30000,
              totalSales: 0,
              regDate: '2026-10-12',
            });
          }
        }

        const assigned = new Set();
        for (const entry of reportEntries) {
          const m = findMatch(entry, cat);
          if (m) {
            m.openingBalance = entry.balance;
            m.openingBalanceType = entry.type;
            m.outstandingBalance = entry.type === 'CR' ? -entry.balance : entry.balance;
            if (entry.salesman) {
              m.salesman = entry.salesman;
              m.assignedSalesman = entry.salesman;
            }
            if (entry.phone && (!m.mobile || m.mobile.length < 6)) {
              m.mobile = entry.phone;
            }
            m.lastBillNumber = entry.lastBillNumber !== '-' ? entry.lastBillNumber : undefined;
            m.lastBillDate = entry.lastBillDate !== '-' ? entry.lastBillDate : undefined;
            m.lastBillAmount = entry.lastBillAmount > 0 ? entry.lastBillAmount : undefined;
            m.lastReceiptDate = entry.lastReceiptDate !== '-' ? entry.lastReceiptDate : undefined;
            m.lastReceiptAmount = entry.lastReceiptAmount > 0 ? entry.lastReceiptAmount : undefined;
            assigned.add(m.code || m.id);
          }
        }

        for (const c of cat) {
          if (!assigned.has(c.code || c.id)) {
            c.openingBalance = 0;
            c.openingBalanceType = 'DR';
            c.outstandingBalance = 0;
          }
        }

        fs.writeFileSync(catPath, JSON.stringify(cat, null, 2), 'utf8');
        console.log(`Updated ${catPath} with full receivable details.`);
        baseCatalog = cat;
      }
    }

    // 2. Update local data/database.json and all data/database_*.json files
    const dataDir = path.join(process.cwd(), 'data');
    const jsonFiles = fs.readdirSync(dataDir).filter(f => f.startsWith('database') && f.endsWith('.json'));

    for (const jf of jsonFiles) {
      const fullP = path.join(dataDir, jf);
      try {
        const db = JSON.parse(fs.readFileSync(fullP, 'utf8'));
        const cidMatch = jf.match(/database_(comp-[^.]+)\.json/);
        const cid = cidMatch ? cidMatch[1] : (db.companyId || 'comp_default_01');

        db.customers = baseCatalog.map(c => {
          const baseId = c.id.replace(/_comp[_-].*$/, '');
          return {
            ...c,
            id: `${baseId}_${cid}`,
            companyId: cid,
          };
        });

        fs.writeFileSync(fullP, JSON.stringify(db, null, 2), 'utf8');
        console.log(`Updated ${jf} with 332 customers for company ${cid}`);
      } catch (e) {
        console.warn(`Error updating ${jf}:`, e.message);
      }
    }

    // 3. Update PostgreSQL for all companies
    const compsRes = await client.query("SELECT DISTINCT company_id FROM company_profile UNION SELECT DISTINCT company_id FROM customers WHERE company_id IS NOT NULL");
    const targetCompanies = Array.from(new Set(['comp_default_01', 'comp-muocj00t-j3co', ...compsRes.rows.map(r => r.company_id).filter(Boolean)]));

    for (const cid of targetCompanies) {
      console.log(`\nSyncing PostgreSQL customers for ${cid}...`);
      await client.query("DELETE FROM customers WHERE company_id = $1 AND (id NOT LIKE $2 OR (code IN ('0101040330', '0101040331', '0101040332') AND (account_title ILIKE '%marhaba%' OR account_title ILIKE '%noor mohammad%' OR account_title ILIKE '%qasar al shameel%')))", [cid, `%_${cid}`]);

      for (const c of baseCatalog) {
        const baseId = c.id.replace(/_comp[_-].*$/, '');
        const custId = `${baseId}_${cid}`;
        const openBal = c.openingBalance || 0;
        const openType = c.openingBalanceType || 'DR';
        const outBal = c.outstandingBalance || 0;

        const customerPayload = {
          ...c,
          id: custId,
          companyId: cid,
        };

        await client.query(
          `INSERT INTO customers (
            id, company_id, code, account_code, manual_code, account_title, name, title,
            customer_group, reg_date, mobile, city, area, sector, location, address,
            status, opening_balance, opening_balance_type, outstanding_balance,
            credit_limit, total_sales, data, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW())
          ON CONFLICT (id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            account_title = EXCLUDED.account_title,
            name = EXCLUDED.name,
            title = EXCLUDED.title,
            opening_balance = EXCLUDED.opening_balance,
            opening_balance_type = EXCLUDED.opening_balance_type,
            outstanding_balance = EXCLUDED.outstanding_balance,
            mobile = CASE WHEN EXCLUDED.mobile != '' THEN EXCLUDED.mobile ELSE customers.mobile END,
            data = EXCLUDED.data,
            updated_at = NOW();`,
          [
            custId,
            cid,
            c.code || '',
            c.accountCode || c.code || '',
            c.manualCode || '',
            c.accountTitle || c.name,
            c.name || c.accountTitle,
            c.title || c.accountTitle,
            c.customerGroup || 'Restaurants',
            c.regDate || '2026-10-12',
            c.mobile || '',
            c.city || 'Sharjah',
            c.area || '',
            c.sector || '',
            c.location || '',
            c.address || '',
            c.status || 'ACTIVE',
            openBal,
            openType,
            outBal,
            c.creditLimit || 30000,
            c.totalSales || 0,
            JSON.stringify(customerPayload),
          ]
        );
      }
      console.log(`Synced 332 customers to PostgreSQL for ${cid}`);
    }

    client.release();
    await pool.end();
    console.log('\nAll customer full receivables data applied successfully!');
  } catch (err) {
    console.error('Error applying receivables data:', err);
  }
}

main();
