import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = "postgres://postgres:wJtPDVqlRJRFhY7@localhost:5435/biamanhbeo_prod";

async function queryDb() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('Connected successfully!');
    
    // 1. Query some menu items
    const menuRes = await client.query(`SELECT id, name, is_hidden, is_active FROM "menu_items" LIMIT 10`);
    console.log('\nMenu items sample:');
    console.table(menuRes.rows);

    // 2. Query total items count and hidden items count
    const statsRes = await client.query(`
      SELECT 
        count(*) as total,
        sum(case when is_hidden = true then 1 else 0 end) as hidden,
        sum(case when is_active = true then 1 else 0 end) as active
      FROM "menu_items"
    `);
    console.log('\nMenu items stats:');
    console.table(statsRes.rows);

    // 3. Query the recently created order (ID 117)
    const orderRes = await client.query(`SELECT id, table_number, items, status FROM "orders" WHERE id = 117`);
    if (orderRes.rows.length > 0) {
      console.log('\nOrder 117 data:');
      console.log(JSON.stringify(orderRes.rows[0], null, 2));
    } else {
      console.log('\nOrder 117 not found');
    }

  } catch (err) {
    console.error('Error querying DB detailed:', err);
  } finally {
    await client.end();
  }
}

queryDb();
