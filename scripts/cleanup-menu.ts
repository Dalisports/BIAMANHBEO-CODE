import * as pg from "pg";
import Database from "better-sqlite3";
import * as dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Connection strings
const SQLITE_PATH = "./biamanhbeo.sqlite";
const NEW_DB = "postgresql://neondb_owner:npg_0KlYw3coVENZ@ep-gentle-shadow-ao7bx2yx-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function cleanupPostgres(connectionString: string, dbLabel: string) {
  console.log(`\n========================================`);
  console.log(`CLEANING UP POSTGRES DATABASE: ${dbLabel}`);
  console.log(`========================================`);
  
  const pool = new Pool({ connectionString });
  try {
    // 1. Lấy tất cả menu items
    const menuRes = await pool.query("SELECT * FROM menu_items ORDER BY id");
    console.log(`Total menu items before: ${menuRes.rows.length}`);
    
    // Nhóm theo tên (chuẩn hóa trim và viết thường)
    const groups: Record<string, any[]> = {};
    menuRes.rows.forEach(item => {
      const normalizedName = item.name.trim().toLowerCase();
      if (!groups[normalizedName]) {
        groups[normalizedName] = [];
      }
      groups[normalizedName].push(item);
    });
    
    let cleanedCount = 0;
    
    for (const [name, items] of Object.entries(groups)) {
      if (items.length > 1) {
        console.log(`\nProcessing duplicate name: "${items[0].name}" (${items.length} items found)`);
        
        // Sắp xếp để chọn best item giữ lại:
        // - Ưu tiên 1: is_active = true
        // - Ưu tiên 2: có ảnh (image không null và không rỗng)
        // - Ưu tiên 3: ID lớn hơn (mới hơn)
        const sorted = [...items].sort((a, b) => {
          if (a.is_active && !b.is_active) return -1;
          if (!a.is_active && b.is_active) return 1;
          
          const aHasImage = a.image && a.image.trim().length > 0;
          const bHasImage = b.image && b.image.trim().length > 0;
          if (aHasImage && !bHasImage) return -1;
          if (!aHasImage && bHasImage) return 1;
          
          return b.id - a.id; // ID lớn hơn lên trước
        });
        
        const bestItem = sorted[0];
        const duplicates = sorted.slice(1);
        
        console.log(`  -> KEEPER: ID ${bestItem.id} | Name: "${bestItem.name}" | Price: ${bestItem.price}đ | Active: ${bestItem.is_active}`);
        
        for (const dup of duplicates) {
          console.log(`  -> DUPLICATE TO DISABLE/DELETE: ID ${dup.id} | Name: "${dup.name}" | Price: ${dup.price}đ | Active: ${dup.is_active}`);
          
          // Cập nhật shortcuts nếu shortcuts đang trỏ tới món trùng lặp này
          try {
            const updateShortcutRes = await pool.query(
              'UPDATE shortcuts SET menu_item_id = $1 WHERE menu_item_id = $2',
              [bestItem.id, dup.id]
            );
            if (updateShortcutRes.rowCount !== null && updateShortcutRes.rowCount > 0) {
              console.log(`     Updated ${updateShortcutRes.rowCount} shortcuts to point to keeper ID ${bestItem.id}`);
            }
          } catch (e: any) {
            console.log(`     Warning updating shortcuts for ID ${dup.id}: ${e.message}`);
          }
          
          // Cập nhật orders (trận tự items jsonb nếu cần, nhưng thường orders đã lưu thông tin món dạng tĩnh,
          // tuy nhiên nếu có trường menuItemId trong jsonb thì cũng nên cập nhật để thống kê chính xác hơn)
          // Ở đây ta có thể cập nhật trong bảng menu_items:
          // Xóa hẳn món trùng lặp. Nếu bị lỗi khóa ngoại thì fallback sang set is_active = false
          try {
            await pool.query('DELETE FROM menu_items WHERE id = $1', [dup.id]);
            console.log(`     Successfully deleted duplicate item ID ${dup.id}`);
          } catch (deleteErr: any) {
            console.log(`     Delete failed (foreign key constraint), marking as inactive. Error: ${deleteErr.message}`);
            await pool.query('UPDATE menu_items SET is_active = false WHERE id = $1', [dup.id]);
            console.log(`     Marked duplicate item ID ${dup.id} as inactive`);
          }
          cleanedCount++;
        }
      }
    }
    
    const finalMenuRes = await pool.query("SELECT * FROM menu_items ORDER BY id");
    console.log(`\nCleanup complete for ${dbLabel}!`);
    console.log(`Total menu items now: ${finalMenuRes.rows.length} (Removed/Disabled ${cleanedCount} duplicates)`);
    
  } catch (err: any) {
    console.error(`Error cleaning up ${dbLabel}:`, err.message);
  } finally {
    await pool.end();
  }
}

function cleanupSqlite() {
  console.log(`\n========================================`);
  console.log(`CLEANING UP SQLITE DATABASE: ${SQLITE_PATH}`);
  console.log(`========================================`);
  
  try {
    const db = new Database(SQLITE_PATH);
    const menuItems = db.prepare("SELECT * FROM menu_items").all() as any[];
    console.log(`Total menu items before: ${menuItems.length}`);
    
    // Nhóm theo tên
    const groups: Record<string, any[]> = {};
    menuItems.forEach(item => {
      const normalizedName = item.name.trim().toLowerCase();
      if (!groups[normalizedName]) {
        groups[normalizedName] = [];
      }
      groups[normalizedName].push(item);
    });
    
    let cleanedCount = 0;
    
    // Bắt đầu transaction
    const runTx = db.transaction(() => {
      for (const [name, items] of Object.entries(groups)) {
        if (items.length > 1) {
          console.log(`\nProcessing duplicate name in SQLite: "${items[0].name}" (${items.length} items found)`);
          
          const sorted = [...items].sort((a, b) => {
            if (a.isActive && !b.isActive) return -1;
            if (!a.isActive && b.isActive) return 1;
            
            const aHasImage = a.image && a.image.trim().length > 0;
            const bHasImage = b.image && b.image.trim().length > 0;
            if (aHasImage && !bHasImage) return -1;
            if (!aHasImage && bHasImage) return 1;
            
            return b.id - a.id;
          });
          
          const bestItem = sorted[0];
          const duplicates = sorted.slice(1);
          
          console.log(`  -> KEEPER: ID ${bestItem.id} | Name: "${bestItem.name}" | Price: ${bestItem.price}đ | Active: ${bestItem.isActive}`);
          
          for (const dup of duplicates) {
            console.log(`  -> DUPLICATE TO DELETE: ID ${dup.id} | Name: "${dup.name}" | Price: ${dup.price}đ | Active: ${dup.isActive}`);
            
            // Cập nhật shortcuts
            try {
              db.prepare('UPDATE shortcuts SET menuItemId = ? WHERE menuItemId = ?').run(bestItem.id, dup.id);
            } catch (e: any) {
              console.log(`     Warning updating shortcuts in SQLite: ${e.message}`);
            }
            
            // Xóa món trùng lặp
            try {
              db.prepare('DELETE FROM menu_items WHERE id = ?').run(dup.id);
              console.log(`     Successfully deleted duplicate item ID ${dup.id} in SQLite`);
            } catch (deleteErr: any) {
              console.log(`     Delete failed in SQLite, marking as inactive: ${deleteErr.message}`);
              db.prepare('UPDATE menu_items SET isActive = 0 WHERE id = ?').run(dup.id);
            }
            cleanedCount++;
          }
        }
      }
    });
    
    runTx();
    
    const finalMenuItems = db.prepare("SELECT * FROM menu_items").all();
    console.log(`\nSQLite Cleanup complete!`);
    console.log(`Total menu items now: ${finalMenuItems.length} (Removed/Disabled ${cleanedCount} duplicates)`);
    db.close();
    
  } catch (err: any) {
    console.error("Error cleaning up SQLite:", err.message);
  }
}

async function main() {
  // 1. Dọn dẹp SQLite local
  cleanupSqlite();
  
  // 2. Dọn dẹp Neon NEW_DB nếu có
  await cleanupPostgres(NEW_DB, "Neon NEW DB (gentle-shadow)");
  
  // 3. Dọn dẹp database hiện tại trong env (.env DATABASE_URL)
  const currentDbUrl = process.env.DATABASE_URL;
  if (currentDbUrl && currentDbUrl !== NEW_DB) {
    await cleanupPostgres(currentDbUrl, "Current Environment DB");
  }
}

main().catch(console.error);
