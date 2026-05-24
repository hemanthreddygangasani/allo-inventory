import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  qty: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  const idempotencyKey = req.headers.get("idempotency-key");

  if (idempotencyKey) {
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { idempotencyKey: idempotencyKey },
    });
    if (existing) {
      return NextResponse.json(JSON.parse(existing.body), {
        status: existing.statusCode,
      });
    }
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const check = bodySchema.safeParse(body);
  if (!check.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: check.error.flatten() },
      { status: 400 }
    );
  }

  const { productId, warehouseId, qty } = check.data;

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      const stockRows = await tx.$queryRaw<
        Array<{ id: string; totalQty: number; reservedQty: number }>
      >`
        SELECT id, "totalQty", "reservedQty"
        FROM "Stock"
        WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
        FOR UPDATE
      `;

      if (stockRows.length === 0) {
        throw new Error("STOCK_NOT_FOUND");
      }

      const stock = stockRows[0];
      const available = stock.totalQty - stock.reservedQty;

      if (available < qty) {
        throw new Error("NOT_ENOUGH_STOCK");
      }

      await tx.stock.update({
        where: { id: stock.id },
        data: { reservedQty: { increment: qty } },
      });

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const newReservation = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          qty,
          status: "PENDING",
          expiresAt,
        },
        include: {
          product: true,
          warehouse: true,
        },
      });

      return newReservation;
    });

    const resBody = {
      id: reservation.id,
      productId: reservation.productId,
      productName: reservation.product.name,
      warehouseId: reservation.warehouseId,
      warehouseName: reservation.warehouse.name,
      qty: reservation.qty,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      createdAt: reservation.createdAt,
    };

    if (idempotencyKey) {
      await prisma.idempotencyRecord.create({
        data: {
          idempotencyKey,
          route: "POST /api/reservations",
          statusCode: 201,
          body: JSON.stringify(resBody),
        },
      });
    }

    return NextResponse.json(resBody, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";

    if (msg === "NOT_ENOUGH_STOCK" || msg === "STOCK_NOT_FOUND") {
      const errorBody = { error: "Not enough stock available" };

      if (idempotencyKey) {
        await prisma.idempotencyRecord.create({
          data: {
            idempotencyKey,
            route: "POST /api/reservations",
            statusCode: 409,
            body: JSON.stringify(errorBody),
          },
        });
      }

      return NextResponse.json(errorBody, { status: 409 });
    }

    console.error("Reservation Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
