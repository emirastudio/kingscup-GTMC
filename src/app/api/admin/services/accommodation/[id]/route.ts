import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accommodationOptions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  if (body.checkIn) body.checkIn = new Date(body.checkIn);
  if (body.checkOut) body.checkOut = new Date(body.checkOut);
  if (body.pricePerPlayer !== undefined) body.pricePerPlayer = String(body.pricePerPlayer);
  if (body.pricePerStaff !== undefined) body.pricePerStaff = String(body.pricePerStaff);
  if (body.pricePerAccompanying !== undefined) body.pricePerAccompanying = String(body.pricePerAccompanying);

  const [updated] = await db
    .update(accommodationOptions)
    .set(body)
    .where(eq(accommodationOptions.id, parseInt(id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [deleted] = await db
    .delete(accommodationOptions)
    .where(eq(accommodationOptions.id, parseInt(id)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
