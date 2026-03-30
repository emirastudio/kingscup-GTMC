import { TeamHeader } from "@/components/team/team-header";
import { TeamSidebar } from "@/components/team/team-sidebar";
import { TeamSwitcher } from "@/components/club/team-switcher";
import { TeamProvider } from "@/lib/team-context";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { clubs, teams, people, tournamentClasses, inboxMessages, teamMessageReads, tournaments } from "@/db/schema";
import { eq, and, count, sql, notInArray } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== "club" || !session.clubId) {
    redirect("/en/login");
  }

  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, session.clubId),
  });

  if (!club) redirect("/en/login");

  // Get tournament classes for "add team" modal
  const classes = await db.query.tournamentClasses.findMany({
    where: eq(tournamentClasses.tournamentId, club.tournamentId),
    orderBy: (c, { asc }) => [asc(c.minBirthYear)],
  });

  // Get all teams for this club
  const clubTeams = await db.query.teams.findMany({
    where: eq(teams.clubId, club.id),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  // Enrich with player counts and class names
  const enrichedTeams = await Promise.all(
    clubTeams.map(async (team) => {
      const [pc] = await db
        .select({ count: count() })
        .from(people)
        .where(and(eq(people.teamId, team.id), eq(people.personType, "player")));
      const [sc] = await db
        .select({ count: count() })
        .from(people)
        .where(and(eq(people.teamId, team.id), eq(people.personType, "staff")));

      let className = "";
      if (team.classId) {
        const cls = await db.query.tournamentClasses.findFirst({
          where: eq(tournamentClasses.id, team.classId),
        });
        className = cls?.name ?? "";
      }

      return {
        id: team.id,
        regNumber: team.regNumber,
        name: team.name ?? "",
        className,
        status: team.status,
        playersCount: Number(pc?.count ?? 0),
        staffCount: Number(sc?.count ?? 0),
      };
    })
  );

  // Default to first team
  const activeTeam = enrichedTeams[0];

  // Unread inbox count for active team
  let inboxCount = 0;
  if (activeTeam) {
    const allMessages = await db.query.inboxMessages.findMany({
      where: eq(inboxMessages.tournamentId, club.tournamentId),
      columns: { id: true },
    });
    const readMessages = await db.query.teamMessageReads.findMany({
      where: eq(teamMessageReads.teamId, activeTeam.id),
      columns: { messageId: true },
    });
    const readIds = new Set(readMessages.map((r) => r.messageId));
    inboxCount = allMessages.filter((m) => !readIds.has(m.id)).length;
  }

  return (
    <TeamProvider
      initialTeamId={activeTeam?.id ?? null}
      initialClubId={club.id}
      initialTournamentId={club.tournamentId}
    >
      <div className="flex flex-col min-h-screen">
        <TeamHeader
          teamName={activeTeam?.name}
          regNumber={activeTeam?.regNumber}
          year={2026}
        />
        <div className="flex flex-1">
          <div className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-white">
            <div className="p-4 border-b border-border">
              <TeamSwitcher
                clubName={club.name}
                clubBadgeUrl={club.badgeUrl ?? null}
                clubId={club.id}
                teams={enrichedTeams}
                classes={classes.map(c => ({ id: c.id, name: c.name }))}
              />
            </div>
            <div className="p-3 flex-1">
              <TeamSidebar inboxCount={inboxCount} />
            </div>
          </div>
          <main className="flex-1 p-6 bg-surface">{children}</main>
        </div>
      </div>
    </TeamProvider>
  );
}
