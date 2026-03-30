"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Link2, Search, Users } from "lucide-react";

const statusVariant = {
  draft: "default" as const,
  open: "success" as const,
  confirmed: "gold" as const,
  cancelled: "error" as const,
};

// Empty by default — teams are added by admin
const mockTeams: {
  id: number;
  regNumber: number;
  name: string;
  className: string;
  status: "draft" | "open" | "confirmed" | "cancelled";
}[] = [];

export default function AdminTeamsPage() {
  const t = useTranslations("admin.teams");
  const tTeam = useTranslations("team");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");

  const filtered = mockTeams.filter(
    (team) =>
      team.name.toLowerCase().includes(search.toLowerCase()) ||
      team.regNumber.toString().includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
        <div className="flex gap-3">
          <Button variant="secondary">
            <Download className="w-4 h-4" />
            {t("export")}
          </Button>
          <Button>
            <Plus className="w-4 h-4" />
            {t("addTeam")}
          </Button>
        </div>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder={tc("search") + "..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">{tTeam("regNumber")}</th>
                <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">{tTeam("teamName")}</th>
                <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">{tTeam("class")}</th>
                <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">{tTeam("status")}</th>
                <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((team) => (
                <tr key={team.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3">
                    <Badge variant="gold">{team.regNumber}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {team.name || <span className="text-text-secondary">-</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {team.className || <span className="text-text-secondary">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[team.status]}>
                      {tTeam(team.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="text-navy hover:text-navy-light text-xs flex items-center gap-1 cursor-pointer">
                        <Link2 className="w-3.5 h-3.5" />
                        {t("copyLink")}
                      </button>
                      <button className="text-text-secondary hover:text-text-primary text-xs cursor-pointer">
                        {tc("edit")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-text-secondary text-sm">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {t("noTeams")}
          </div>
        )}
      </Card>
    </div>
  );
}
