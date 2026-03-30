import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teamTravel } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const travel = await db.query.teamTravel.findFirst({
    where: eq(teamTravel.teamId, parseInt(teamId)),
  });
  return NextResponse.json(travel ?? {});
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const body = await req.json();
  const tid = parseInt(teamId);

  const existing = await db.query.teamTravel.findFirst({
    where: eq(teamTravel.teamId, tid),
  });

  if (existing) {
    const [updated] = await db
      .update(teamTravel)
      .set({
        arrivalType: body.arrivalType || null,
        arrivalDate: body.arrivalDate ? new Date(body.arrivalDate) : null,
        arrivalTime: body.arrivalTime || null,
        arrivalDetails: body.arrivalDetails || null,
        departureType: body.departureType || null,
        departureDate: body.departureDate ? new Date(body.departureDate) : null,
        departureTime: body.departureTime || null,
        departureDetails: body.departureDetails || null,
        updatedAt: new Date(),
      })
      .where(eq(teamTravel.teamId, tid))
      .returning();
    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(teamTravel)
    .values({
      teamId: tid,
      arrivalType: body.arrivalType || null,
      arrivalDate: body.arrivalDate ? new Date(body.arrivalDate) : null,
      arrivalTime: body.arrivalTime || null,
      arrivalDetails: body.arrivalDetails || null,
      departureType: body.departureType || null,
      departureDate: body.departureDate ? new Date(body.departureDate) : null,
      departureTime: body.departureTime || null,
      departureDetails: body.departureDetails || null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
