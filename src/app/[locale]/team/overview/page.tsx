"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/lib/team-context";
import { Link } from "@/i18n/navigation";
import {
  Users, Shield, UserPlus, Plane, ShoppingCart, CheckCircle, AlertTriangle,
  Hotel, Bus, AlertCircle,
} from "lucide-react";

type OverviewData = {
  counts: { players: number; staff: number; accompanying: number; hotel: number; transfer: number };
  finance: { totalOrdered: string; totalPaid: string; balance: string };
  checks: { hasPlayers: boolean; hasStaff: boolean; hasResponsible: boolean; hasTravel: boolean; hasOrders: boolean };
  completionPercent: number;
  allergies: { firstName: string; lastName: string; allergies: string; dietaryRequirements: string | null }[];
};

export default function TeamOverviewPage() {
  const t = useTranslations("overview");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const { teamId } = useTeam();
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/teams/${teamId}/overview`).then(async (r) => {
      if (r.ok) setData(await r.json());
    });
  }, [teamId]);

  if (!data) return null;

  const { counts, finance, checks, completionPercent, allergies } = data;

  const checklist = [
    { key: "hasPlayers", label: tn("players"), done: checks.hasPlayers, href: "/team/players", icon: Users },
    { key: "hasStaff", label: tn("staff"), done: checks.hasStaff, href: "/team/staff", icon: Shield },
    { key: "hasResponsible", label: t("responsiblePerson"), done: checks.hasResponsible, href: "/team/staff", icon: Shield },
    { key: "hasTravel", label: tn("travel"), done: checks.hasTravel, href: "/team/travel", icon: Plane },
    { key: "hasOrders", label: tn("booking"), done: checks.hasOrders, href: "/team/booking", icon: ShoppingCart },
  ];

  const balanceNum = parseFloat(finance.balance);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Progress bar */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="mb-0">{t("registrationProgress")}</CardTitle>
          <span className="text-2xl font-bold text-navy">{completionPercent}%</span>
        </div>
        <div className="w-full h-3 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-navy to-gold rounded-full transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        {/* Checklist */}
        <div className="mt-5 space-y-2">
          {checklist.map(({ key, label, done, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-surface transition-colors"
            >
              {done ? (
                <CheckCircle className="w-5 h-5 text-success shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              )}
              <Icon className="w-4 h-4 text-text-secondary" />
              <span className="text-sm flex-1">{label}</span>
              {done ? (
                <Badge variant="success">{tc("confirm")}</Badge>
              ) : (
                <Badge variant="warning">{t("solve")}</Badge>
              )}
            </Link>
          ))}
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <Users className="w-5 h-5 text-navy mx-auto mb-1" />
          <p className="text-2xl font-bold">{counts.players}</p>
          <p className="text-xs text-text-secondary">{tn("players")}</p>
        </Card>
        <Card className="text-center">
          <Shield className="w-5 h-5 text-navy mx-auto mb-1" />
          <p className="text-2xl font-bold">{counts.staff}</p>
          <p className="text-xs text-text-secondary">{tn("staff")}</p>
        </Card>
        <Card className="text-center">
          <Hotel className="w-5 h-5 text-navy mx-auto mb-1" />
          <p className="text-2xl font-bold">{counts.hotel}</p>
          <p className="text-xs text-text-secondary">{t("hotelRooms")}</p>
        </Card>
        <Card className="text-center">
          <Bus className="w-5 h-5 text-navy mx-auto mb-1" />
          <p className="text-2xl font-bold">{counts.transfer}</p>
          <p className="text-xs text-text-secondary">{t("transferBooked")}</p>
        </Card>
      </div>

      {/* Finance summary */}
      <Card>
        <CardTitle>{t("financeSummary")}</CardTitle>
        <div className="mt-3 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wider">{t("totalOrdered")}</p>
            <p className="text-xl font-bold mt-1">{parseFloat(finance.totalOrdered).toFixed(0)} EUR</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wider">{t("totalPaid")}</p>
            <p className="text-xl font-bold mt-1 text-success">{parseFloat(finance.totalPaid).toFixed(0)} EUR</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wider">{t("balanceLabel")}</p>
            <p className={`text-xl font-bold mt-1 ${balanceNum < 0 ? "text-error" : "text-success"}`}>
              {balanceNum < 0 ? "" : "+"}{parseFloat(finance.balance).toFixed(0)} EUR
            </p>
          </div>
        </div>
      </Card>

      {/* Allergies */}
      {allergies.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-warning" />
            <CardTitle className="mb-0">{t("allergiesTitle")}</CardTitle>
          </div>
          <div className="space-y-2">
            {allergies.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-warning-light">
                <span className="text-sm font-medium">{a.firstName} {a.lastName}</span>
                <span className="text-sm text-text-secondary">— {a.allergies}</span>
                {a.dietaryRequirements && (
                  <Badge variant="warning">{a.dietaryRequirements}</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
