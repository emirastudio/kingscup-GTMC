import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams,
  clubs,
  tournamentClasses,
  people,
  packageAssignments,
  servicePackages,
  teamBookings,
  teamServiceOverrides,
  payments,
  teamTravel,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, sum, desc } from "drizzle-orm";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await context.params;
  const teamIdNum = Number(teamId);

  // Team info
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamIdNum),
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Club info
  const club = team.clubId
    ? await db.query.clubs.findFirst({
        where: eq(clubs.id, team.clubId),
      })
    : null;

  // Class info
  const tournamentClass = team.classId
    ? await db.query.tournamentClasses.findFirst({
        where: eq(tournamentClasses.id, team.classId),
      })
    : null;

  // People
  const allPeople = await db.query.people.findMany({
    where: eq(people.teamId, teamIdNum),
  });

  const playerCount = allPeople.filter((p) => p.personType === "player").length;
  const staffCount = allPeople.filter((p) => p.personType === "staff").length;
  const accompanyingCount = allPeople.filter((p) => p.personType === "accompanying").length;

  // Package assignment
  const assignment = await db.query.packageAssignments.findFirst({
    where: eq(packageAssignments.teamId, teamIdNum),
  });

  let packageInfo = null;
  if (assignment) {
    packageInfo = await db.query.servicePackages.findFirst({
      where: eq(servicePackages.id, assignment.packageId),
    });
  }

  // Bookings
  const bookings = await db.query.teamBookings.findMany({
    where: eq(teamBookings.teamId, teamIdNum),
    orderBy: (b, { desc }) => [desc(b.createdAt)],
  });

  // Overrides
  const overrides = await db.query.teamServiceOverrides.findMany({
    where: eq(teamServiceOverrides.teamId, teamIdNum),
  });

  // Finance: total from bookings
  const [bookingTotals] = await db
    .select({ total: sum(teamBookings.total) })
    .from(teamBookings)
    .where(eq(teamBookings.teamId, teamIdNum));

  const totalFromBookings = Number(bookingTotals?.total ?? 0);

  // Finance: total paid
  const [paymentTotals] = await db
    .select({ total: sum(payments.amount) })
    .from(payments)
    .where(
      and(
        eq(payments.teamId, teamIdNum),
        eq(payments.status, "received")
      )
    );

  const totalPaid = Number(paymentTotals?.total ?? 0);

  // Payments history
  const paymentsHistory = await db.query.payments.findMany({
    where: eq(payments.teamId, teamIdNum),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });

  // Travel info
  const travel = await db.query.teamTravel.findFirst({
    where: eq(teamTravel.teamId, teamIdNum),
  });

  return NextResponse.json({
    team: {
      id: team.id,
      name: team.name,
      regNumber: team.regNumber,
      status: team.status,
      notes: team.notes,
    },
    club: club
      ? {
          id: club.id,
          name: club.name,
          badgeUrl: club.badgeUrl,
          contactName: club.contactName,
          contactEmail: club.contactEmail,
          contactPhone: club.contactPhone,
          country: club.country,
          city: club.city,
        }
      : null,
    class: tournamentClass
      ? {
          id: tournamentClass.id,
          name: tournamentClass.name,
          minBirthYear: tournamentClass.minBirthYear,
          maxBirthYear: tournamentClass.maxBirthYear,
        }
      : null,
    people: {
      all: allPeople,
      counts: {
        players: playerCount,
        staff: staffCount,
        accompanying: accompanyingCount,
        total: allPeople.length,
      },
    },
    package: packageInfo
      ? { id: packageInfo.id, name: packageInfo.name, assignedAt: assignment!.assignedAt }
      : null,
    bookings,
    overrides,
    finance: {
      totalFromBookings,
      totalPaid,
      balance: totalFromBookings - totalPaid,
    },
    payments: paymentsHistory,
    travel: travel ?? null,
  });
}
