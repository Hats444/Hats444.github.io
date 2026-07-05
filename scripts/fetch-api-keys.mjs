import pg from 'pg';

const { Client } = pg;
const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || 'Hats444!Analytics#2026');
const connectionString = `postgresql://postgres:${password}@db.ljgcrgihviyvzjexfbyp.supabase.co:5432/postgres`;
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  const tables = await client.query(
    "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1,2 LIMIT 50"
  );
  console.log('TABLES', tables.rows.map((r) => `${r.table_schema}.${r.table_name}`).join(', '));
} catch (err) {
  console.error(err.message);
  process.exit(1);
} finally {
  await client.end();
}
