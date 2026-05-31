import { PrismaClient, UserRole, FoodType, TableStatus, StockUnit } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const hash = (s: string) => bcrypt.hash(s, 12);

const main = async () => {
  const passwordHash = await hash('Password@123');

  const restaurant = await prisma.restaurant.upsert({
    where: { id: 'seed-restaurant' },
    update: {},
    create: {
      id: 'seed-restaurant',
      name: 'Demo Restaurant',
      legalName: 'Demo Restaurant Pvt Ltd',
      gstNumber: '27ABCDE1234F1Z5',
      fssaiNumber: '12345678901234',
      email: 'demo@restaurant.test',
      phone: '+919999999999',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      invoicePrefix: 'INV',
    },
  });

  await prisma.user.upsert({
    where: { restaurantId_email: { restaurantId: restaurant.id, email: 'owner@demo.test' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      email: 'owner@demo.test',
      name: 'Demo Owner',
      passwordHash,
      role: UserRole.OWNER,
    },
  });
  await prisma.user.upsert({
    where: { restaurantId_email: { restaurantId: restaurant.id, email: 'cashier@demo.test' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      email: 'cashier@demo.test',
      name: 'Demo Cashier',
      passwordHash,
      role: UserRole.CASHIER,
    },
  });
  await prisma.user.upsert({
    where: { restaurantId_email: { restaurantId: restaurant.id, email: 'kitchen@demo.test' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      email: 'kitchen@demo.test',
      name: 'Demo Kitchen',
      passwordHash,
      role: UserRole.KITCHEN,
    },
  });

  const starters = await prisma.category.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Starters' } },
    update: {},
    create: { restaurantId: restaurant.id, name: 'Starters', sortOrder: 1 },
  });
  const mains = await prisma.category.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Main Course' } },
    update: {},
    create: { restaurantId: restaurant.id, name: 'Main Course', sortOrder: 2 },
  });
  const beverages = await prisma.category.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Beverages' } },
    update: {},
    create: { restaurantId: restaurant.id, name: 'Beverages', sortOrder: 3 },
  });

  const items = [
    { category: starters.id, name: 'Paneer Tikka', basePrice: 280, foodType: FoodType.VEG },
    { category: starters.id, name: 'Chicken 65', basePrice: 320, foodType: FoodType.NONVEG },
    { category: mains.id, name: 'Butter Chicken', basePrice: 380, foodType: FoodType.NONVEG },
    { category: mains.id, name: 'Dal Makhani', basePrice: 240, foodType: FoodType.VEG },
    { category: mains.id, name: 'Veg Biryani', basePrice: 260, foodType: FoodType.VEG },
    { category: beverages.id, name: 'Masala Chai', basePrice: 60, foodType: FoodType.VEG },
    { category: beverages.id, name: 'Fresh Lime Soda', basePrice: 90, foodType: FoodType.VEG },
  ];

  for (const item of items) {
    await prisma.menuItem.upsert({
      where: { id: `seed-item-${item.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `seed-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
        restaurantId: restaurant.id,
        categoryId: item.category,
        name: item.name,
        basePrice: item.basePrice,
        foodType: item.foodType,
        taxRate: 5,
      },
    });
  }

  const indoor = await prisma.section.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Indoor' } },
    update: {},
    create: { restaurantId: restaurant.id, name: 'Indoor', sortOrder: 1 },
  });
  const outdoor = await prisma.section.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Outdoor' } },
    update: {},
    create: { restaurantId: restaurant.id, name: 'Outdoor', sortOrder: 2 },
  });

  for (let i = 1; i <= 6; i++) {
    await prisma.table.upsert({
      where: { restaurantId_name: { restaurantId: restaurant.id, name: `T${i}` } },
      update: {},
      create: {
        restaurantId: restaurant.id,
        sectionId: i <= 4 ? indoor.id : outdoor.id,
        name: `T${i}`,
        capacity: 4,
        status: TableStatus.FREE,
      },
    });
  }

  await prisma.stockItem.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Paneer' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Paneer',
      unit: StockUnit.KG,
      currentQty: 10,
      minQty: 2,
      costPerUnit: 320,
    },
  });
  await prisma.stockItem.upsert({
    where: { restaurantId_name: { restaurantId: restaurant.id, name: 'Chicken' } },
    update: {},
    create: {
      restaurantId: restaurant.id,
      name: 'Chicken',
      unit: StockUnit.KG,
      currentQty: 15,
      minQty: 3,
      costPerUnit: 240,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete.');
  console.log('  Owner:    owner@demo.test    / Password@123');
  console.log('  Cashier:  cashier@demo.test  / Password@123');
  console.log('  Kitchen:  kitchen@demo.test  / Password@123');
};

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
