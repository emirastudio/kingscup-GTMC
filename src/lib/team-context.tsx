"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type TeamContextType = {
  teamId: number | null;
  clubId: number | null;
  tournamentId: number | null;
  setTeamId: (id: number) => void;
  inboxCount: number;
  setInboxCount: (n: number) => void;
};

const TeamContext = createContext<TeamContextType>({
  teamId: null,
  clubId: null,
  tournamentId: null,
  setTeamId: () => {},
  inboxCount: 0,
  setInboxCount: () => {},
});

export function TeamProvider({
  children,
  initialTeamId,
  initialClubId,
  initialTournamentId,
  initialInboxCount,
}: {
  children: ReactNode;
  initialTeamId: number | null;
  initialClubId: number | null;
  initialTournamentId: number | null;
  initialInboxCount: number;
}) {
  const [teamId, setTeamId] = useState(initialTeamId);
  const [inboxCount, setInboxCount] = useState(initialInboxCount);

  return (
    <TeamContext.Provider value={{ teamId, clubId: initialClubId, tournamentId: initialTournamentId, setTeamId, inboxCount, setInboxCount }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
