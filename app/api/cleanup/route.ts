import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST() {
  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
  });

  let count = 0;

  for (const r of expiredReservations) {
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: r.id },
        data: { status: "RELEASED" },
      });
      await tx.stock.updateMany({
        where: { productId: r.productId, warehouseId: r.warehouseId },
        data: { reservedQty: { decrement: r.qty } },
      });
    });
    count++;
  }

  return NextResponse.json({ released: count });
}

export async function GET() {
  return POST();
}
