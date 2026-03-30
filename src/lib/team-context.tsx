"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type TeamContextType = {
  teamId: number | null;
  clubId: number | null;
  tournamentId: number | null;
  setTeamId: (id: number) => void;
};

const TeamContext = createContext<TeamContextType>({
  teamId: null,
  clubId: null,
  tournamentId: null,
  setTeamId: () => {},
});

export function TeamProvider({
  children,
  initialTeamId,
  initialClubId,
  initialTournamentId,
}: {
  children: ReactNode;
  initialTeamId: number | null;
  initialClubId: number | null;
  initialTournamentId: number | null;
}) {
  const [teamId, setTeamId] = useState(initialTeamId);

  return (
    <TeamContext.Provider value={{ teamId, clubId: initialClubId, tournamentId: initialTournamentId, setTeamId }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
