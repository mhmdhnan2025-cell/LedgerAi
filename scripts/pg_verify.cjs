require('dotenv').config();
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const cust = await c.query(
    "select company_id, count(*)::int n, count(*) filter (where outstanding_balance <> 0)::int withbal, sum(outstanding_balance)::numeric net from customers group by 1 order by 1"
  );
  console.log('CUSTOMERS by company:', cust.rows);
  const sup = await c.query(
    "select company_id, count(*)::int n, count(*) filter (where payable_to_supplier <> 0)::int withbal, sum(case when payable_to_supplier <> 0 then payable_to_supplier else 0 end)::numeric total from suppliers group by 1 order by 1"
  );
  console.log('SUPPLIERS by company:', sup.rows);
  await c.end();
})().catch((e) => {
  console.log('ERR', e.message);
  process.exit(1);
});
