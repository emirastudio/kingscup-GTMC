import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tournaments,
  teams,
  inboxMessages,
  teamMessageReads,
} from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, sql, desc } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
  if (!tournament) {
    return NextResponse.json(
      { error: "No active tournament" },
      { status: 404 }
    );
  }

  // Count total teams for this tournament
  const [totalTeamsRow] = await db
    .select({ value: sql<number>`COUNT(*)` })
    .from(teams)
    .where(eq(teams.tournamentId, tournament.id));
  const totalTeams = Number(totalTeamsRow.value);

  // Get messages with read counts
  const messages = await db
    .select({
      id: inboxMessages.id,
      subject: inboxMessages.subject,
      body: inboxMessages.body,
      sentAt: inboxMessages.sentAt,
      sentBy: inboxMessages.sentBy,
      readCount: sql<number>`(
        SELECT COUNT(DISTINCT ${teamMessageReads.teamId})
        FROM ${teamMessageReads}
        WHERE ${teamMessageReads.messageId} = ${inboxMessages.id}
      )`.as("read_count"),
    })
    .from(inboxMessages)
    .where(eq(inboxMessages.tournamentId, tournament.id))
    .orderBy(desc(inboxMessages.sentAt));

  return NextResponse.json({
    totalTeams,
    messages: messages.map((m) => ({
      ...m,
      readCount: Number(m.readCount),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
  if (!tournament) {
    return NextResponse.json(
      { error: "No active tournament" },
      { status: 404 }
    );
  }

  const { subject, body } = await req.json();

  if (!subject || !body) {
    return NextResponse.json(
      { error: "subject and body are required" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(inboxMessages)
    .values({
      tournamentId: tournament.id,
      subject,
      body,
      sentBy: session.userId,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
