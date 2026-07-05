import fs from 'fs';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Client } = pg;
const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || 'Hats444!Analytics#2026');
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://postgres:${password}@db.ljgcrgihviyvzjexfbyp.supabase.co:5432/postgres`;

const files = ['schema.sql', 'rpc-api.sql'];

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'database', file), 'utf8');
    await client.query(sql);
    console.log('APPLIED', file);
  }
  const { rows } = await client.query('SELECT public.get_public_stats() AS stats');
  console.log('SCHEMA_OK', JSON.stringify(rows[0]?.stats));
} catch (err) {
  console.error('SCHEMA_FAIL', err.message);
  process.exit(1);
} finally {
  await client.end();
}
