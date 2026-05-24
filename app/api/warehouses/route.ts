import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const warehouses = await prisma.warehouse.findMany();
  return NextResponse.json(warehouses);
}
