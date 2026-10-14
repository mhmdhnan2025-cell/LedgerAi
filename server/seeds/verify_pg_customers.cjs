const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Hannan66@localhost:5432/restaurant_erp',
  });

  try {
    await client.connect();

    const query = `
      SELECT 
        COUNT(*)::int AS total_count,
        COUNT(*) FILTER (WHERE ABS(outstanding_balance) > 0.001)::int AS non_zero_count,
        ROUND(COALESCE(SUM(outstanding_balance), 0), 2)::float AS total_outstanding
      FROM customers
      WHERE company_id = 'comp-muocj00t-j3co';
    `;

    const res = await client.query(query);
    console.log('Result for comp-muocj00t-j3co:');
    console.log(JSON.stringify(res.rows[0], null, 2));

    const allComps = await client.query(`
      SELECT 
        company_id,
        COUNT(*)::int AS total_count,
        COUNT(*) FILTER (WHERE ABS(outstanding_balance) > 0.001)::int AS non_zero_count,
        ROUND(COALESCE(SUM(outstanding_balance), 0), 2)::float AS total_outstanding
      FROM customers
      GROUP BY company_id
      ORDER BY company_id;
    `);
    console.log('All companies breakdown:');
    console.log(JSON.stringify(allComps.rows, null, 2));
  } catch (err) {
    console.error('Error during PostgreSQL verification query:', err);
  } finally {
    await client.end();
  }
}

main();
