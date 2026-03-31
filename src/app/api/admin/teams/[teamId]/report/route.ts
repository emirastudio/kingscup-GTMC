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
  tournamentInfo,
  accommodationOptions,
  extraMealOptions,
  transferOptions,
  registrationFees,
  tournamentHotels,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and, sum } from "drizzle-orm";

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

  // Tournament info (hotel, meals, schedule)
  const tInfo = await db.query.tournamentInfo.findFirst({
    where: eq(tournamentInfo.tournamentId, team.tournamentId),
  });

  // Assigned hotel
  const assignedHotel = team.hotelId
    ? await db.query.tournamentHotels.findFirst({
        where: eq(tournamentHotels.id, team.hotelId),
      })
    : null;

  // All available hotels for dropdown
  const availableHotels = await db.query.tournamentHotels.findMany({
    where: eq(tournamentHotels.tournamentId, team.tournamentId),
    orderBy: (h, { asc }) => [asc(h.sortOrder), asc(h.id)],
  });

  // Services (to resolve booking names)
  const [accommodations, meals, transfers, regFees] = await Promise.all([
    db.query.accommodationOptions.findMany({ where: eq(accommodationOptions.tournamentId, team.tournamentId) }),
    db.query.extraMealOptions.findMany({ where: eq(extraMealOptions.tournamentId, team.tournamentId) }),
    db.query.transferOptions.findMany({ where: eq(transferOptions.tournamentId, team.tournamentId) }),
    db.query.registrationFees.findMany({ where: eq(registrationFees.tournamentId, team.tournamentId) }),
  ]);

  return NextResponse.json({
    team: {
      id: team.id,
      name: team.name,
      regNumber: team.regNumber,
      status: team.status,
      notes: team.notes,
      hotelId: team.hotelId ?? null,
      accomPlayers: team.accomPlayers ?? 0,
      accomStaff: team.accomStaff ?? 0,
      accomAccompanying: team.accomAccompanying ?? 0,
      accomCheckIn: team.accomCheckIn ?? null,
      accomCheckOut: team.accomCheckOut ?? null,
      accomNotes: team.accomNotes ?? null,
      accomDeclined: team.accomDeclined,
      accomConfirmed: team.accomConfirmed,
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
      ? {
          id: packageInfo.id,
          name: packageInfo.name,
          assignedAt: assignment!.assignedAt,
          isPublished: assignment!.isPublished,
          accommodationOptionId: packageInfo.accommodationOptionId ?? null,
          freePlayersCount: assignment!.freePlayersCount ?? 0,
          freeStaffCount: assignment!.freeStaffCount ?? 0,
          freeAccompanyingCount: assignment!.freeAccompanyingCount ?? 0,
        }
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
    assignedHotel: assignedHotel ? {
      id: assignedHotel.id,
      name: assignedHotel.name,
      address: assignedHotel.address,
      contactName: assignedHotel.contactName,
      contactPhone: assignedHotel.contactPhone,
      contactEmail: assignedHotel.contactEmail,
      notes: assignedHotel.notes,
    } : null,
    availableHotels: availableHotels.map((h) => ({
      id: h.id,
      name: h.name,
      address: h.address,
    })),
    tournamentInfo: tInfo ? {
      scheduleUrl: tInfo.scheduleUrl,
      hotelName: tInfo.hotelName,
      hotelAddress: tInfo.hotelAddress,
      hotelCheckIn: tInfo.hotelCheckIn,
      hotelCheckOut: tInfo.hotelCheckOut,
      hotelNotes: tInfo.hotelNotes,
      venueName: tInfo.venueName,
      venueAddress: tInfo.venueAddress,
      venueMapUrl: tInfo.venueMapUrl,
      mealTimes: tInfo.mealTimes,
      mealLocation: tInfo.mealLocation,
      mealNotes: tInfo.mealNotes,
      emergencyContact: tInfo.emergencyContact,
      emergencyPhone: tInfo.emergencyPhone,
    } : null,
    services: {
      accommodation: accommodations.map((a) => ({
        id: a.id, name: a.name,
        checkIn: a.checkIn, checkOut: a.checkOut,
        pricePerPlayer: a.pricePerPlayer,
        pricePerStaff: a.pricePerStaff,
        pricePerAccompanying: a.pricePerAccompanying,
        includedMeals: a.includedMeals,
        mealNote: a.mealNote,
      })),
      meals: meals.map((m) => ({
        id: m.id, name: m.name,
        pricePerPerson: m.pricePerPerson,
        perDay: m.perDay,
        description: m.description,
      })),
      transfers: transfers.map((t) => ({
        id: t.id, name: t.name,
        pricePerPerson: t.pricePerPerson,
        description: t.description,
      })),
      registration: regFees.map((r) => ({
        id: r.id, name: r.name,
        price: r.price,
        isRequired: r.isRequired,
      })),
    },
  });
}
