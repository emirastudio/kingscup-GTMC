"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useTeam } from "@/lib/team-context";
import { ChevronDown, Check, Users } from "lucide-react";

type TeamSummary = {
  id: number;
  regNumber: number;
  name: string;
  className: string;
  status: "draft" | "open" | "confirmed" | "cancelled";
  playersCount: number;
  staffCount: number;
};

interface TeamSwitcherProps {
  clubName: string;
  clubBadgeUrl: string | null;
  teams: TeamSummary[];
}

const statusDot: Record<string, string> = {
  draft:     "bg-gray-400",
  open:      "bg-emerald-500",
  confirmed: "bg-gold",
  cancelled: "bg-red-400",
};

export function TeamSwitcher({ clubName, clubBadgeUrl, teams }: TeamSwitcherProps) {
  const t = useTranslations("team");
  const { teamId, setTeamId } = useTeam();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeTeam = teams.find((tm) => tm.id === teamId) ?? teams[0];

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Club initials fallback
  const initials = clubName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-3">
      {/* Club header */}
      <div className="flex items-center gap-2.5 px-1">
        {clubBadgeUrl ? (
          <img
            src={clubBadgeUrl}
            alt={clubName}
            className="w-9 h-9 rounded-full object-contain bg-surface border border-border shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-navy/10 border border-navy/20 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-navy">{initials}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-text-primary truncate leading-tight">{clubName}</p>
          <p className="text-[10px] text-text-secondary leading-tight">{teams.length} {teams.length === 1 ? "team" : "teams"}</p>
        </div>
      </div>

      {/* Team dropdown */}
      {activeTeam && (
        <div ref={ref} className="relative">
          {/* Trigger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "w-full text-left rounded-xl border px-3 py-2.5 transition-all",
              open
                ? "border-navy bg-navy/5 shadow-sm"
                : "border-border hover:border-navy/30 hover:bg-surface/60 bg-white"
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full shrink-0", statusDot[activeTeam.status])} />
              <p className="text-[13px] font-semibold text-text-primary flex-1 truncate">
                {activeTeam.name || "—"}
              </p>
              <ChevronDown className={cn("w-3.5 h-3.5 text-text-secondary shrink-0 transition-transform", open && "rotate-180")} />
            </div>
            <div className="flex items-center gap-3 mt-1 ml-4">
              <span className="text-[11px] text-text-secondary font-medium">{activeTeam.className}</span>
              <span className="text-[11px] text-text-secondary flex items-center gap-0.5">
                <Users className="w-3 h-3" />&nbsp;{activeTeam.playersCount}
              </span>
            </div>
            <p className="text-[10px] text-text-secondary/60 mt-0.5 ml-4">{t(activeTeam.status)}</p>
          </button>

          {/* Dropdown */}
          {open && teams.length > 1 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-xl border border-border shadow-lg overflow-hidden">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => { setTeamId(team.id); setOpen(false); }}
                  className={cn(
                    "w-full text-left flex items-start gap-2.5 px-3 py-2.5 hover:bg-surface transition-colors border-b border-border last:border-0",
                    team.id === activeTeam?.id && "bg-navy/5"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", statusDot[team.status])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-primary truncate">{team.name}</p>
                    <p className="text-[11px] text-text-secondary">{team.className} · {t(team.status)}</p>
                  </div>
                  {team.id === activeTeam?.id && (
                    <Check className="w-3.5 h-3.5 text-navy shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
