import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clubs, clubUsers, teams, tournaments, servicePackages, packageAssignments, inboxMessages, messageRecipients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const clubName = formData.get("clubName") as string;
  const country = formData.get("country") as string;
  const city = formData.get("city") as string;
  const contactName = formData.get("contactName") as string;
  const contactEmail = (formData.get("contactEmail") as string)?.toLowerCase().trim();
  const contactPhone = formData.get("contactPhone") as string;
  const contactRole = formData.get("contactRole") as string;
  const password = formData.get("password") as string;
  const teamsJson = formData.get("teams") as string;
  const logoFile = formData.get("logo") as File | null;

  if (!clubName || !contactEmail || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const teamsList: { name: string; classId: string }[] = teamsJson ? JSON.parse(teamsJson) : [];
  if (teamsList.length === 0) {
    return NextResponse.json({ error: "At least one team required" }, { status: 400 });
  }

  // Get active tournament
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.registrationOpen, true),
  });
  if (!tournament) {
    return NextResponse.json({ error: "No tournament open for registration" }, { status: 400 });
  }

  // Handle logo upload
  let badgeUrl: string | null = null;
  if (logoFile && logoFile.size > 0) {
    const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    if (allowed.includes(logoFile.type) && logoFile.size <= 10 * 1024 * 1024) {
      const ext = logoFile.name.split(".").pop() ?? "png";
      const filename = `club-${Date.now()}.${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "badges");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), Buffer.from(await logoFile.arrayBuffer()));
      badgeUrl = `/uploads/badges/${filename}`;
    }
  }

  // Create club
  const [club] = await db
    .insert(clubs)
    .values({
      tournamentId: tournament.id,
      name: clubName,
      country,
      city,
      badgeUrl,
      contactName,
      contactEmail,
      contactPhone,
    })
    .returning();

  // Create teams
  const lastTeam = await db.query.teams.findFirst({
    where: eq(teams.tournamentId, tournament.id),
    orderBy: (t, { desc }) => [desc(t.regNumber)],
  });
  let nextRegNumber = (lastTeam?.regNumber ?? 10000) + 1;

  for (const t of teamsList) {
    await db.insert(teams).values({
      tournamentId: tournament.id,
      clubId: club.id,
      classId: t.classId ? parseInt(t.classId) : null,
      name: t.name,
      status: "open",
      regNumber: nextRegNumber++,
    });
  }

  // Auto-assign default package to each team if one exists
  const defaultPackage = await db.query.servicePackages.findFirst({
    where: and(
      eq(servicePackages.tournamentId, tournament.id),
      eq(servicePackages.isDefault, true)
    ),
  });

  if (defaultPackage) {
    const createdTeams = await db.query.teams.findMany({
      where: and(eq(teams.clubId, club.id), eq(teams.tournamentId, tournament.id)),
    });
    for (const t of createdTeams) {
      await db.insert(packageAssignments).values({
        teamId: t.id,
        packageId: defaultPackage.id,
        isPublished: false,
      }).onConflictDoNothing();
    }
  }

  // Send welcome message to each new team
  const createdTeamsForWelcome = await db.query.teams.findMany({
    where: and(eq(teams.clubId, club.id), eq(teams.tournamentId, tournament.id)),
  });

  const welcomeSubject = "Welcome to Kings Cup 2026! 👑";
  const welcomeBody = `Dear ${clubName} team,

Welcome to Kings Cup 2026! We are delighted to have you with us.

To complete your registration, please go through all the steps in your team portal:

✅ Players — add all players with full names and dates of birth
✅ Staff / Coaches — add coaching staff and responsible person on site
✅ Travel — fill in your arrival and departure details
✅ Booking — select accommodation and transfer options

📋 How to fill in allergy & medical data:
When adding players and staff, please carefully fill in any allergies, dietary requirements or medical notes. This information is important for your team's safety and for meal planning. Even if there are no special requirements, please confirm this for each person.

⚠️ Important — two-step process:
At this stage, please provide your initial registration data (number of players, staff, accompanying persons and travel details). Once we receive your information, Kings Cup will prepare your full accommodation and meal package. You will then be able to update your detailed data accordingly.

If you have any questions, feel free to send us a message through the Inbox — we are here to help!

Kings Cup Organising Team
Football Planet`;

  for (const team of createdTeamsForWelcome) {
    const [msg] = await db
      .insert(inboxMessages)
      .values({
        tournamentId: tournament.id,
        subject: welcomeSubject,
        body: welcomeBody,
        sendToAll: false,
      })
      .returning();
    await db.insert(messageRecipients).values({
      messageId: msg.id,
      teamId: team.id,
    });
  }

  // Create club user with password + role
  const passwordHash = await hashPassword(password);
  await db.insert(clubUsers).values({
    clubId: club.id,
    email: contactEmail,
    name: contactName,
    passwordHash,
    accessLevel: "write",
  });

  // Auto-login
  const token = createToken({
    userId: club.id,
    role: "club",
    clubId: club.id,
    tournamentId: tournament.id,
  });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, clubId: club.id });
}
