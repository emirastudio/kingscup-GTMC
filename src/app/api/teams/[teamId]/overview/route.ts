import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teams, people, orders, teamTravel, payments, tournamentClasses } from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const tid = parseInt(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, tid) });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const teamClass = team.classId
    ? await db.query.tournamentClasses.findFirst({ where: eq(tournamentClasses.id, team.classId) })
    : null;

  // Counts
  const [playerCount] = await db.select({ count: count() }).from(people)
    .where(and(eq(people.teamId, tid), eq(people.personType, "player")));
  const [staffCount] = await db.select({ count: count() }).from(people)
    .where(and(eq(people.teamId, tid), eq(people.personType, "staff")));
  const [accompanyingCount] = await db.select({ count: count() }).from(people)
    .where(and(eq(people.teamId, tid), eq(people.personType, "accompanying")));

  // Responsible staff
  const responsibleStaff = await db.query.people.findFirst({
    where: and(eq(people.teamId, tid), eq(people.personType, "staff"), eq(people.isResponsibleOnSite, true)),
  });

  // Travel
  const travel = await db.query.teamTravel.findFirst({ where: eq(teamTravel.teamId, tid) });

  // Hotel & transfer counts
  const [hotelCount] = await db.select({ count: count() }).from(people)
    .where(and(eq(people.teamId, tid), eq(people.needsHotel, true)));
  const [transferCount] = await db.select({ count: count() }).from(people)
    .where(and(eq(people.teamId, tid), eq(people.needsTransfer, true)));

  // Orders total
  const [orderTotal] = await db
    .select({ total: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)` })
    .from(orders)
    .where(eq(orders.teamId, tid));

  // Payments total
  const [paymentTotal] = await db
    .select({ total: sql<string>`COALESCE(SUM(${payments.amount}::numeric), 0)` })
    .from(payments)
    .where(and(eq(payments.teamId, tid), eq(payments.status, "received")));

  // Allergies list
  const allergies = await db.query.people.findMany({
    where: and(eq(people.teamId, tid), sql`${people.allergies} IS NOT NULL AND ${people.allergies} != ''`),
    columns: { firstName: true, lastName: true, allergies: true, dietaryRequirements: true },
  });

  // Calculate completion
  const checks = {
    hasPlayers: Number(playerCount?.count ?? 0) > 0,
    hasStaff: Number(staffCount?.count ?? 0) > 0,
    hasResponsible: !!responsibleStaff,
    hasTravel: !!(travel?.arrivalDate),
    hasOrders: parseFloat(orderTotal?.total ?? "0") > 0,
  };
  const completedSteps = Object.values(checks).filter(Boolean).length;
  const totalSteps = Object.keys(checks).length;
  const completionPercent = Math.round((completedSteps / totalSteps) * 100);

  return NextResponse.json({
    team,
    minBirthYear: teamClass?.minBirthYear ?? null,
    counts: {
      players: Number(playerCount?.count ?? 0),
      staff: Number(staffCount?.count ?? 0),
      accompanying: Number(accompanyingCount?.count ?? 0),
      hotel: Number(hotelCount?.count ?? 0),
      transfer: Number(transferCount?.count ?? 0),
    },
    finance: {
      totalOrdered: orderTotal?.total ?? "0",
      totalPaid: paymentTotal?.total ?? "0",
      balance: (parseFloat(paymentTotal?.total ?? "0") - parseFloat(orderTotal?.total ?? "0")).toFixed(2),
    },
    checks,
    completionPercent,
    allergies,
    hasTravel: !!(travel?.arrivalDate),
  });
}
