import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.idempotencyRecord.deleteMany();

  const mumbai = await prisma.warehouse.create({
    data: { name: "Mumbai Warehouse", location: "Mumbai, Maharashtra" },
  });

  const delhi = await prisma.warehouse.create({
    data: { name: "Delhi Warehouse", location: "New Delhi" },
  });

  const bangalore = await prisma.warehouse.create({
    data: { name: "Bangalore Warehouse", location: "Bangalore, Karnataka" },
  });

  const tshirt = await prisma.product.create({
    data: {
      name: "Classic Cotton T-Shirt",
      sku: "TSH-001",
      price: 599,
      description: "Comfortable cotton t-shirt available in multiple sizes",
      imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
    },
  });

  const sneakers = await prisma.product.create({
    data: {
      name: "Urban Runner Sneakers",
      sku: "SNK-002",
      price: 2499,
      description: "Lightweight running sneakers with cushioned sole",
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
    },
  });

  const backpack = await prisma.product.create({
    data: {
      name: "Travel Backpack",
      sku: "BAG-003",
      price: 1899,
      description: "Durable 30L backpack perfect for daily use or travel",
      imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
    },
  });

  const hoodie = await prisma.product.create({
    data: {
      name: "Zip-Up Hoodie",
      sku: "HOD-004",
      price: 1299,
      description: "Warm fleece hoodie with front zip and pockets",
      imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400",
    },
  });

  const watch = await prisma.product.create({
    data: {
      name: "Minimal Analog Watch",
      sku: "WCH-005",
      price: 3499,
      description: "Clean minimal watch with leather strap",
      imageUrl: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400",
    },
  });

  const stockEntries = [
    { productId: tshirt.id, warehouseId: mumbai.id, totalQty: 50, reservedQty: 0 },
    { productId: tshirt.id, warehouseId: delhi.id, totalQty: 30, reservedQty: 0 },
    { productId: tshirt.id, warehouseId: bangalore.id, totalQty: 20, reservedQty: 0 },

    { productId: sneakers.id, warehouseId: mumbai.id, totalQty: 15, reservedQty: 0 },
    { productId: sneakers.id, warehouseId: delhi.id, totalQty: 10, reservedQty: 0 },

    { productId: backpack.id, warehouseId: mumbai.id, totalQty: 25, reservedQty: 0 },
    { productId: backpack.id, warehouseId: bangalore.id, totalQty: 8, reservedQty: 0 },

    { productId: hoodie.id, warehouseId: delhi.id, totalQty: 40, reservedQty: 0 },
    { productId: hoodie.id, warehouseId: bangalore.id, totalQty: 12, reservedQty: 0 },

    { productId: watch.id, warehouseId: mumbai.id, totalQty: 5, reservedQty: 0 },
    { productId: watch.id, warehouseId: delhi.id, totalQty: 3, reservedQty: 0 },
    { productId: watch.id, warehouseId: bangalore.id, totalQty: 2, reservedQty: 0 },
  ];

  for (const entry of stockEntries) {
    await prisma.stock.create({ data: entry });
  }

  console.log("Seed done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
