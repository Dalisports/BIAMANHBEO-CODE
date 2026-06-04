import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_fDSswA8mZO9k@ep-ancient-brook-a12t15zb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' });

const tables = ['users', 'menu_items', 'payment_settings'];
for (const t of tables) {
  const r = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${t}' ORDER BY ordinal_position`);
  console.log(t + ':');
  r.rows.forEach((row: any) => console.log('  ' + row.column_name + ' (' + row.data_type + ')'));
}
await pool.end();