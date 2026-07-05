import pg from 'pg';

const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || 'Hats444!Analytics#2026');
const client = new pg.Client({
  connectionString: `postgresql://postgres:${password}@db.ljgcrgihviyvzjexfbyp.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  const grants = await client.query(`
    SELECT routine_name, grantee, privilege_type
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public' AND routine_name LIKE 'api_%'
    ORDER BY 1, 2
  `);
  console.log('GRANTS', grants.rows);
  const test = await client.query(`SELECT public.api_admin_login('Hats444!Analytics#2026') AS r`);
  console.log('LOGIN_TEST', test.rows[0]?.r);
} catch (err) {
  console.error(err.message);
  process.exit(1);
} finally {
  await client.end();
}
