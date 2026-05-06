const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function fixOrders() {
  try {
    await client.connect();
    console.log('Connected to database');

    const result = await client.query('SELECT id, table_number FROM orders');
    console.log('Found orders:', result.rows.length);

    for (const order of result.rows) {
      let fixedTableNumber = order.table_number;

      // Extract number from various formats:
      // "Bàn c3" -> "3"
      // "Bàn cột 1" -> "1"
      // "Bàn c2" -> "2"
      // "Bàn c1" -> "1"
      // "Bàn 1" -> "1"
      // "bàn 3" -> "3"
      
      const numMatch = fixedTableNumber.match(/(\d+)/);
      if (numMatch) {
        fixedTableNumber = numMatch[1];
      }

      if (/^\d+$/.test(fixedTableNumber) && fixedTableNumber !== order.table_number) {
        console.log(`Updating order ${order.id}: "${order.table_number}" -> "${fixedTableNumber}"`);
        await client.query(
          'UPDATE orders SET table_number = $1 WHERE id = $2',
          [fixedTableNumber, order.id]
        );
      }
    }

    // Verify
    const verify = await client.query('SELECT DISTINCT table_number FROM orders ORDER BY table_number');
    console.log('Distinct table_numbers after fix:', verify.rows);

    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

fixOrders();
