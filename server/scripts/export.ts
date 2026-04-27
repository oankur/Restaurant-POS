import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(__dirname, '../prisma/dev.db');

if (!fs.existsSync(dbPath)) {
  console.error('dev.db not found at:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

const data = {
  users:      db.prepare('SELECT * FROM "User"').all(),
  outlets:    db.prepare('SELECT * FROM "Outlet"').all(),
  categories: db.prepare('SELECT * FROM "Category"').all(),
  menuItems:  db.prepare('SELECT * FROM "MenuItem"').all(),
  tables:     db.prepare('SELECT * FROM "Table"').all(),
  orders:     db.prepare('SELECT * FROM "Order"').all(),
  orderItems: db.prepare('SELECT * FROM "OrderItem"').all(),
  bills:      db.prepare('SELECT * FROM "Bill"').all(),
};

const outPath = path.join(__dirname, 'export.json');
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

console.log('✅ Export complete → scripts/export.json');
Object.entries(data).forEach(([table, rows]) =>
  console.log(`   ${table}: ${(rows as any[]).length} rows`)
);

db.close();
