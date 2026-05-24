import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { product: true, warehouse: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  if (reservation.status !== "PENDING") {
    return NextResponse.json(
      { error: "Reservation is already " + reservation.status.toLowerCase() },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({
      where: { id },
      data: { status: "RELEASED" },
    });
    await tx.stock.updateMany({
      where: {
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
      },
      data: { reservedQty: { decrement: reservation.qty } },
    });
  });

  return NextResponse.json({
    id: reservation.id,
    productName: reservation.product.name,
    warehouseName: reservation.warehouse.name,
    qty: reservation.qty,
    status: "RELEASED",
    message: "Reservation cancelled",
  });
}
