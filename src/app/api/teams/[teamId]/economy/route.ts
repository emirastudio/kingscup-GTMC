import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, payments, teams, tournamentProducts, teamBookings } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const tid = parseInt(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, tid) });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get old-model orders with product names
  const teamOrders = await db
    .select({
      productName: tournamentProducts.name,
      productNameRu: tournamentProducts.nameRu,
      productNameEt: tournamentProducts.nameEt,
      category: tournamentProducts.category,
      quantity: orders.quantity,
      unitPrice: orders.unitPrice,
      total: orders.total,
    })
    .from(orders)
    .innerJoin(tournamentProducts, eq(orders.productId, tournamentProducts.id))
    .where(eq(orders.teamId, tid));

  // Get new-model bookings
  const newBookings = await db.query.teamBookings.findMany({
    where: eq(teamBookings.teamId, tid),
  });

  // Convert new bookings to same format as orders for display
  const bookingLines = newBookings.map((b) => ({
    productName: `${b.bookingType}${b.notes ? ` (${b.notes})` : ""}`,
    productNameRu: null,
    productNameEt: null,
    category: b.bookingType,
    quantity: b.quantity,
    unitPrice: b.unitPrice,
    total: b.total,
  }));

  const allLines = [...teamOrders, ...bookingLines];

  // Get all payments
  const teamPayments = await db.query.payments.findMany({
    where: eq(payments.teamId, tid),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });

  // Totals from old orders
  const [orderTotal] = await db
    .select({ total: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)` })
    .from(orders)
    .where(eq(orders.teamId, tid));

  // Totals from new bookings
  const [bookingTotal] = await db
    .select({ total: sql<string>`COALESCE(SUM(${teamBookings.total}::numeric), 0)` })
    .from(teamBookings)
    .where(eq(teamBookings.teamId, tid));

  const [paymentTotal] = await db
    .select({ total: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)` })
    .from(payments)
    .where(and(eq(payments.teamId, tid), eq(payments.status, "received")));

  const totalToPay = parseFloat(orderTotal?.total ?? "0") + parseFloat(bookingTotal?.total ?? "0");
  const totalPaid = parseFloat(paymentTotal?.total ?? "0");

  return NextResponse.json({
    orders: allLines,
    payments: teamPayments,
    totalToPay: totalToPay.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    balance: (totalPaid - totalToPay).toFixed(2),
  });
}
