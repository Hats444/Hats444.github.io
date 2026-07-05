import fs from 'fs';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || 'Hats444!Analytics#2026');
const client = new pg.Client({
  connectionString: `postgresql://postgres:${password}@db.ljgcrgihviyvzjexfbyp.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'rpc-api.sql'), 'utf8');
  await client.query(sql);
  const { rows } = await client.query(
    "SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'api_%'"
  );
  console.log('RPC_OK', rows.map((r) => r.proname).join(', '));
} catch (err) {
  console.error('RPC_FAIL', err.message);
  process.exit(1);
} finally {
  await client.end();
}
