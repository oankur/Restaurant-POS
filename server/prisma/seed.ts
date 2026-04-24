import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Super Admin (only user account in the system)
  await prisma.user.upsert({
    where: { email: 'admin@pos.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@pos.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'SUPER_ADMIN',
    },
  });

  // Demo outlet — credentials are tied to the outlet, not a person
  const outlet = await prisma.outlet.upsert({
    where: { id: 'outlet-demo-1' },
    update: {},
    create: {
      id: 'outlet-demo-1',
      name: 'Main Branch',
      address: '123 Food Street, City',
      phone: '+91 9876543210',
      username: 'mainbranch',
      password: await bcrypt.hash('outlet123', 10),
      managerPassword: await bcrypt.hash('manager123', 10),
      taxRate: 0.05,
    },
  });

  const defaultCategories = ['Starters', 'Main Course', 'Beverages', 'Desserts', 'Breads', 'Rice & Biryani', 'Soups', 'Salads'];
  for (const name of defaultCategories) {
    await prisma.category.upsert({
      where: { name_outletId: { name, outletId: outlet.id } },
      update: {},
      create: { name, outletId: outlet.id },
    });
  }

  const menuItems = [
    { name: 'Paneer Tikka', price: 280, category: 'Starters', description: 'Grilled cottage cheese with spices' },
    { name: 'Veg Spring Rolls', price: 180, category: 'Starters', description: 'Crispy rolls with vegetables' },
    { name: 'Chicken Wings', price: 320, category: 'Starters', description: 'Spicy buffalo wings' },
    { name: 'Dal Makhani', price: 220, category: 'Main Course', description: 'Creamy black lentils' },
    { name: 'Butter Chicken', price: 380, category: 'Main Course', description: 'Tandoor chicken in rich sauce' },
    { name: 'Veg Biryani', price: 250, category: 'Main Course', description: 'Fragrant basmati rice with vegetables' },
    { name: 'Chicken Biryani', price: 320, category: 'Main Course', description: 'Fragrant basmati rice with chicken' },
    { name: 'Naan', price: 50, category: 'Main Course', description: 'Soft leavened bread' },
    { name: 'Masala Chai', price: 60, category: 'Beverages', description: 'Spiced Indian tea' },
    { name: 'Fresh Lime Soda', price: 80, category: 'Beverages', description: 'Refreshing lime soda' },
    { name: 'Mango Lassi', price: 120, category: 'Beverages', description: 'Thick mango yogurt drink' },
    { name: 'Gulab Jamun', price: 120, category: 'Desserts', description: 'Soft milk dumplings in syrup' },
    { name: 'Ice Cream', price: 100, category: 'Desserts', description: 'Three scoops assorted' },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: `menu-${item.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `menu-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...item,
        outletId: outlet.id,
      },
    });
  }

  for (let i = 1; i <= 10; i++) {
    await prisma.table.upsert({
      where: { id: `table-${outlet.id}-${i}` },
      update: {},
      create: {
        id: `table-${outlet.id}-${i}`,
        number: i,
        capacity: i <= 5 ? 2 : i <= 8 ? 4 : 6,
        outletId: outlet.id,
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log('   Admin Login  → admin@pos.com / admin123');
  console.log('   Outlet Login → mainbranch / outlet123');
  console.log('   Manager Mode → password: manager123  (from within outlet POS)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
