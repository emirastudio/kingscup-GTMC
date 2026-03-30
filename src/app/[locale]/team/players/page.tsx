"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { PlayerInlineTable } from "@/components/team/player-inline-table";
import { HealthDisclaimer } from "@/components/team/health-disclaimer";
import { useTeam } from "@/lib/team-context";

export default function PlayersPage() {
  const t = useTranslations("players");
  const tp = useTranslations("people");
  const { teamId } = useTeam();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlayers = useCallback(async () => {
    if (!teamId) return;
    const res = await fetch(`/api/teams/${teamId}/people?type=player`);
    if (res.ok) setPlayers(await res.json());
    setLoading(false);
  }, [teamId]);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  const positionOptions = [
    { value: "goalkeeper", label: t("positions.goalkeeper") },
    { value: "defender", label: t("positions.defender") },
    { value: "midfielder", label: t("positions.midfielder") },
    { value: "forward", label: t("positions.forward") },
  ];

  if (loading) return null;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-text-primary">{t("title")}</h2>
        <p className="text-sm text-text-secondary mt-0.5">
          {t("description")} ({players.length})
        </p>
      </div>

      <Alert variant="info">
        {tp("birthYearInfo", { year: "2014" })}
      </Alert>

      <PlayerInlineTable
        players={players}
        teamId={teamId!}
        positionOptions={positionOptions}
        onRefresh={fetchPlayers}
      />

      <HealthDisclaimer />
    </div>
  );
}
