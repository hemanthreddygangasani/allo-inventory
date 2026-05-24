import { NextResponse } from "next/server";
import prisma from "@/lib/db";

async function cleanupExpired() {
  const expiredOnes = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
  });

  for (const item of expiredOnes) {
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: item.id },
        data: { status: "RELEASED" },
      });
      await tx.stock.updateMany({
        where: { productId: item.productId, warehouseId: item.warehouseId },
        data: { reservedQty: { decrement: item.qty } },
      });
    });
  }
}

export async function GET() {
  await cleanupExpired();

  const products = await prisma.product.findMany({
    include: {
      stocks: {
        include: { warehouse: true },
      },
    },
  });

  const formatted = products.map((prod) => {
    return {
      id: prod.id,
      name: prod.name,
      sku: prod.sku,
      price: prod.price,
      description: prod.description,
      imageUrl: prod.imageUrl,
      stocks: prod.stocks.map((s) => ({
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse.name,
        warehouseLocation: s.warehouse.location,
        totalQty: s.totalQty,
        reservedQty: s.reservedQty,
        availableQty: s.totalQty - s.reservedQty,
      })),
    };
  });

  return NextResponse.json(formatted);
}
