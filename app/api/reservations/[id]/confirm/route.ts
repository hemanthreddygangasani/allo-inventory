import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const idempotencyKey = req.headers.get("idempotency-key");

  if (idempotencyKey) {
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return NextResponse.json(JSON.parse(existing.body), {
        status: existing.statusCode,
      });
    }
  }

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

  if (new Date() > reservation.expiresAt) {
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

    const errResponse = { error: "Reservation has expired" };

    if (idempotencyKey) {
      await prisma.idempotencyRecord.create({
        data: {
          idempotencyKey,
          route: `POST /api/reservations/${id}/confirm`,
          statusCode: 410,
          body: JSON.stringify(errResponse),
        },
      });
    }

    return NextResponse.json(errResponse, { status: 410 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({
      where: { id },
      data: { status: "CONFIRMED" },
    });

    await tx.stock.updateMany({
      where: {
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
      },
      data: {
        totalQty: { decrement: reservation.qty },
        reservedQty: { decrement: reservation.qty },
      },
    });
  });

  const result = {
    id: reservation.id,
    productName: reservation.product.name,
    warehouseName: reservation.warehouse.name,
    qty: reservation.qty,
    status: "CONFIRMED",
    message: "Purchase confirmed successfully",
  };

  if (idempotencyKey) {
    await prisma.idempotencyRecord.create({
      data: {
        idempotencyKey,
        route: `POST /api/reservations/${id}/confirm`,
        statusCode: 200,
        body: JSON.stringify(result),
      },
    });
  }

  return NextResponse.json(result);
}
