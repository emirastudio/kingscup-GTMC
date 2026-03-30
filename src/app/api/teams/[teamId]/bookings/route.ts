import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  teams,
  packageAssignments,
  accommodationOptions,
  extraMealOptions,
  transferOptions,
  registrationFees,
  teamServiceOverrides,
  teamBookings,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

async function authorizeTeam(teamId: number, clubId: number) {
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });
  if (!team) return null;
  if (team.clubId !== clubId) return null;
  return team;
}

// GET /api/teams/[teamId]/bookings
// Returns available services + current bookings for this team
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const tid = parseInt(teamId);

  const team = await authorizeTeam(tid, session.clubId);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Check if package has been assigned
  const assignment = await db.query.packageAssignments.findFirst({
    where: eq(packageAssignments.teamId, tid),
  });

  if (!assignment) {
    return NextResponse.json({ available: false });
  }

  const tournamentId = team.tournamentId;

  // Load all service options
  const [accommodation, meals, transfers, registration] = await Promise.all([
    db.query.accommodationOptions.findMany({
      where: eq(accommodationOptions.tournamentId, tournamentId),
      orderBy: [asc(accommodationOptions.sortOrder)],
    }),
    db.query.extraMealOptions.findMany({
      where: eq(extraMealOptions.tournamentId, tournamentId),
      orderBy: [asc(extraMealOptions.sortOrder)],
    }),
    db.query.transferOptions.findMany({
      where: eq(transferOptions.tournamentId, tournamentId),
      orderBy: [asc(transferOptions.sortOrder)],
    }),
    db.query.registrationFees.findFirst({
      where: eq(registrationFees.tournamentId, tournamentId),
    }),
  ]);

  // Load team-level overrides (custom prices or disabled options)
  const overrides = await db.query.teamServiceOverrides.findMany({
    where: eq(teamServiceOverrides.teamId, tid),
  });

  // Load existing bookings for this team
  const bookings = await db.query.teamBookings.findMany({
    where: eq(teamBookings.teamId, tid),
  });

  return NextResponse.json({
    available: true,
    accommodation,
    meals,
    transfers,
    registration: registration ?? null,
    bookings,
    overrides,
  });
}

// POST /api/teams/[teamId]/bookings
// Save bookings — replaces all existing bookings for this team
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "club" || !session.clubId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  const tid = parseInt(teamId);

  const team = await authorizeTeam(tid, session.clubId);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const body: {
    bookings: {
      bookingType: "accommodation" | "meal" | "transfer" | "registration" | "custom";
      serviceId: number;
      quantity: number;
      unitPrice: string;
      notes?: string;
    }[];
  } = await req.json();

  if (!body?.bookings || !Array.isArray(body.bookings)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Delete existing bookings
  await db.delete(teamBookings).where(eq(teamBookings.teamId, tid));

  // Insert new ones
  if (body.bookings.length > 0) {
    const rows = body.bookings.map((b) => ({
      teamId: tid,
      bookingType: b.bookingType,
      serviceId: b.serviceId,
      quantity: b.quantity,
      unitPrice: b.unitPrice,
      total: (parseFloat(b.unitPrice) * b.quantity).toFixed(2),
      notes: b.notes ?? null,
    }));

    await db.insert(teamBookings).values(rows);
  }

  const saved = await db.query.teamBookings.findMany({
    where: eq(teamBookings.teamId, tid),
  });

  return NextResponse.json({ ok: true, bookings: saved });
}
