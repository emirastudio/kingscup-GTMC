import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inboxMessages, teamMessageReads, teams } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const tid = parseInt(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, tid) });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get all messages for this tournament
  const messages = await db.query.inboxMessages.findMany({
    where: eq(inboxMessages.tournamentId, team.tournamentId),
    orderBy: (m, { desc }) => [desc(m.sentAt)],
  });

  // Get read status for this team
  const reads = await db.query.teamMessageReads.findMany({
    where: eq(teamMessageReads.teamId, tid),
  });
  const readMap = new Set(reads.map((r) => r.messageId));

  const result = messages.map((msg) => ({
    id: msg.id,
    subject: msg.subject,
    body: msg.body,
    sentAt: msg.sentAt?.toISOString() ?? null,
    isRead: readMap.has(msg.id),
  }));

  return NextResponse.json(result);
}

// Mark message as read
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const { messageId } = await req.json();

  await db
    .insert(teamMessageReads)
    .values({
      messageId,
      teamId: parseInt(teamId),
    })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}
