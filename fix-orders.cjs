const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function fixOrders() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Get all orders with potentially wrong tableNumber
    const result = await client.query('SELECT id, table_number FROM orders');
    console.log('Found orders:', result.rows);

    for (const order of result.rows) {
      let fixedTableNumber = order.table_number;

      // Fix "Bàn Bàn X" -> "X"
      fixedTableNumber = fixedTableNumber.replace(/^Bàn\s*Bàn\s*/i, '');

      // Fix "Bàn X" -> "X" (extract just the number)
      const match = fixedTableNumber.match(/^Bàn\s*(\d+)$/i);
      if (match) {
        fixedTableNumber = match[1];
      }

      // If it's just a number, keep it
      if (/^\d+$/.test(fixedTableNumber)) {
        if (fixedTableNumber !== order.table_number) {
          console.log(`Updating order ${order.id}: "${order.table_number}" -> "${fixedTableNumber}"`);
          await client.query(
            'UPDATE orders SET table_number = $1 WHERE id = $2',
            [fixedTableNumber, order.id]
          );
        }
      }
    }

    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

fixOrders();
