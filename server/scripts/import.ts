import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const exportPath = path.join(__dirname, 'export.json');
if (!fs.existsSync(exportPath)) {
  console.error('export.json not found. Run npm run db:export first.');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

const bool = (v: any) => v === 1 || v === true;

const data = {
  users:      raw.users.map((r: any) => ({ ...r, isActive: bool(r.isActive) })),
  outlets:    raw.outlets.map((r: any) => ({ ...r, isActive: bool(r.isActive) })),
  categories: raw.categories,
  menuItems:  raw.menuItems.map((r: any) => ({ ...r, isAvailable: bool(r.isAvailable) })),
  tables:     raw.tables,
  orders:     raw.orders,
  orderItems: raw.orderItems,
  bills:      raw.bills.map((r: any) => ({ ...r, isPaid: bool(r.isPaid) })),
};

async function main() {
  console.log('Importing data into PostgreSQL...\n');

  for (const user of data.users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, createdAt: new Date(user.createdAt), updatedAt: new Date(user.updatedAt) },
    });
  }
  console.log(`✅ Users: ${data.users.length}`);

  for (const outlet of data.outlets) {
    await prisma.outlet.upsert({
      where: { id: outlet.id },
      update: {},
      create: { ...outlet, createdAt: new Date(outlet.createdAt), updatedAt: new Date(outlet.updatedAt) },
    });
  }
  console.log(`✅ Outlets: ${data.outlets.length}`);

  for (const cat of data.categories) {
    await prisma.category.upsert({
      where: { name_outletId: { name: cat.name, outletId: cat.outletId } },
      update: {},
      create: { ...cat, createdAt: new Date(cat.createdAt) },
    });
  }
  console.log(`✅ Categories: ${data.categories.length}`);

  for (const item of data.menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: { ...item, createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) },
    });
  }
  console.log(`✅ Menu items: ${data.menuItems.length}`);

  for (const table of data.tables) {
    await prisma.table.upsert({
      where: { id: table.id },
      update: {},
      create: { ...table },
    });
  }
  console.log(`✅ Tables: ${data.tables.length}`);

  for (const order of data.orders) {
    await prisma.order.upsert({
      where: { id: order.id },
      update: {},
      create: { ...order, createdAt: new Date(order.createdAt), updatedAt: new Date(order.updatedAt) },
    });
  }
  console.log(`✅ Orders: ${data.orders.length}`);

  for (const item of data.orderItems) {
    await prisma.orderItem.upsert({
      where: { id: item.id },
      update: {},
      create: { ...item },
    });
  }
  console.log(`✅ Order items: ${data.orderItems.length}`);

  for (const bill of data.bills) {
    await prisma.bill.upsert({
      where: { id: bill.id },
      update: {},
      create: { ...bill, createdAt: new Date(bill.createdAt) },
    });
  }
  console.log(`✅ Bills: ${data.bills.length}`);

  console.log('\n🎉 Import complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
