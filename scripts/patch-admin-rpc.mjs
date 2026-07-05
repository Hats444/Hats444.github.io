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

const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'rpc-api.sql'), 'utf8');
const blocks = [
  sql.match(/CREATE OR REPLACE FUNCTION public\.api_admin_login[\s\S]*?\$\$;/),
  sql.match(/CREATE OR REPLACE FUNCTION public\.api_admin_data[\s\S]*?\$\$;/),
].filter(Boolean);

try {
  await client.connect();
  for (const block of blocks) {
    await client.query(block[0]);
  }
  await client.query("NOTIFY pgrst, 'reload schema'");
  const test = await client.query(`SELECT public.api_admin_login('Hats444!Analytics#2026') AS r`);
  console.log('ADMIN_LOGIN_OK', JSON.stringify(test.rows[0]?.r));
} catch (err) {
  console.error('PATCH_FAIL', err.message);
  process.exit(1);
} finally {
  await client.end();
}
