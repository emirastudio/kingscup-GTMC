"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/lib/team-context";
import { Link } from "@/i18n/navigation";
import {
  Users, Shield, UserPlus, Plane, ShoppingCart, CheckCircle, AlertTriangle,
  Hotel, Bus, AlertCircle, MapPin, Utensils, Phone, Calendar, ExternalLink,
} from "lucide-react";

type TournamentInfo = {
  venueName: string | null;
  venueAddress: string | null;
  venueMapUrl: string | null;
  mealTimes: string | null;
  mealLocation: string | null;
  mealNotes: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  scheduleUrl: string | null;
  scheduleDescription: string | null;
  additionalNotes: string | null;
};

type AssignedHotel = {
  name: string;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
};

type OverviewData = {
  counts: { players: number; staff: number; accompanying: number; hotel: number; transfer: number };
  finance: { totalOrdered: string; totalPaid: string; balance: string };
  checks: { hasPlayers: boolean; hasStaff: boolean; hasResponsible: boolean; hasTravel: boolean; hasOrders: boolean };
  completionPercent: number;
  allergies: { firstName: string; lastName: string; allergies: string; dietaryRequirements: string | null }[];
  tournamentInfo: TournamentInfo | null;
  assignedHotel: AssignedHotel | null;
  accomPlayers: number;
  accomStaff: number;
  accomAccompanying: number;
  accomCheckIn: string | null;
  accomCheckOut: string | null;
  accomNotes: string | null;
  accomDeclined: boolean;
  accomConfirmed: boolean;
};

// ─── Accommodation Quest Card ─────────────────────────────────────────────────

type AccomState = "unanswered" | "form" | "confirmed" | "declined";

function AccommodationQuestCard({
  teamId,
  initial,
  onUpdate,
}: {
  teamId: string;
  initial: Pick<OverviewData, "accomPlayers" | "accomStaff" | "accomAccompanying" | "accomCheckIn" | "accomCheckOut" | "accomNotes" | "accomDeclined" | "accomConfirmed">;
  onUpdate: () => void;
}) {
  const ta = useTranslations("overview.accom");
  const getInitialState = (): AccomState => {
    if (initial.accomConfirmed) return "confirmed";
    if (initial.accomDeclined) return "declined";
    return "unanswered";
  };

  const [state, setState] = useState<AccomState>(getInitialState());
  const [saving, setSaving] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);

  // Form state — strings to avoid "012" issue with number inputs
  const [players, setPlayers] = useState(String(initial.accomPlayers ?? 0));
  const [staff, setStaff] = useState(String(initial.accomStaff ?? 0));
  const [accompanying, setAccompanying] = useState(String(initial.accomAccompanying ?? 0));
  const [checkIn, setCheckIn] = useState(initial.accomCheckIn ?? "");
  const [checkOut, setCheckOut] = useState(initial.accomCheckOut ?? "");
  const [notes, setNotes] = useState(initial.accomNotes ?? "");

  // Summary data (used after confirmation)
  const [summary, setSummary] = useState({
    players: initial.accomPlayers ?? 0,
    staff: initial.accomStaff ?? 0,
    accompanying: initial.accomAccompanying ?? 0,
    checkIn: initial.accomCheckIn ?? "",
    checkOut: initial.accomCheckOut ?? "",
    notes: initial.accomNotes ?? "",
  });

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/accommodation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        onUpdate();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    const pNum = parseInt(players) || 0;
    const sNum = parseInt(staff) || 0;
    const aNum = parseInt(accompanying) || 0;
    await patch({
      accomPlayers: pNum,
      accomStaff: sNum,
      accomAccompanying: aNum,
      accomCheckIn: checkIn || null,
      accomCheckOut: checkOut || null,
      accomNotes: notes || null,
      accomDeclined: false,
      accomConfirmed: true,
    });
    setSummary({ players: pNum, staff: sNum, accompanying: aNum, checkIn, checkOut, notes });
    setState("confirmed");
  }

  async function handleDecline() {
    await patch({
      accomDeclined: true,
      accomConfirmed: false,
    });
    setState("declined");
    setConfirmDecline(false);
  }

  function handleEdit() {
    setState("form");
  }

  function handleResetToUnanswered() {
    patch({
      accomDeclined: false,
      accomConfirmed: false,
    });
    setState("unanswered");
  }

  // ── State 4: Declined ────────────────────────────────────────────────────────
  if (state === "declined") {
    return (
      <div className="rounded-xl border-2 border-border bg-surface p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Hotel className="w-5 h-5 text-text-secondary shrink-0" />
          <div>
            <p className="text-sm font-semibold text-text-primary">{ta("declinedTitle")}</p>
            <p className="text-xs text-text-secondary">{ta("declinedSubtitle")}</p>
          </div>
        </div>
        <button
          onClick={handleResetToUnanswered}
          className="text-xs text-navy hover:underline shrink-0 cursor-pointer"
        >
          {ta("editBtn")}
        </button>
      </div>
    );
  }

  // ── State 3: Confirmed ───────────────────────────────────────────────────────
  if (state === "confirmed") {
    return (
      <div className="rounded-xl border-2 border-success bg-emerald-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-success shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-bold text-emerald-800 mb-1">{ta("confirmedTitle")}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-emerald-700">
                {summary.players > 0 && <span>{summary.players} {ta("players").toLowerCase()}</span>}
                {summary.staff > 0 && <span>{summary.staff} {ta("staff").toLowerCase()}</span>}
                {summary.accompanying > 0 && <span>{summary.accompanying} {ta("accompanying").toLowerCase()}</span>}
              </div>
              {(summary.checkIn || summary.checkOut) && (
                <div className="mt-1.5 text-sm text-emerald-700">
                  {summary.checkIn && <span>{ta("arrivalLabel")}: {summary.checkIn}</span>}
                  {summary.checkIn && summary.checkOut && <span> · </span>}
                  {summary.checkOut && <span>{ta("departureLabel")}: {summary.checkOut}</span>}
                </div>
              )}
              {summary.notes && (
                <p className="mt-1.5 text-xs text-emerald-600 italic">{summary.notes}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleEdit}
            className="text-xs text-emerald-700 border border-emerald-300 rounded-lg px-3 py-1.5 hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer"
          >
            {ta("editBtn")}
          </button>
        </div>
      </div>
    );
  }

  // ── State 2: Form expanded ───────────────────────────────────────────────────
  if (state === "form") {
    return (
      <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-5 space-y-5">
        <div className="flex items-center gap-3">
          <Hotel className="w-6 h-6 text-amber-700 shrink-0" />
          <div>
            <p className="text-base font-bold text-amber-900">{ta("formTitle")}</p>
            <p className="text-sm text-amber-700">{ta("formSubtitle")}</p>
          </div>
        </div>

        {/* Counts row */}
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { label: ta("players"), val: players, set: setPlayers },
              { label: ta("staff"), val: staff, set: setStaff },
              { label: ta("accompanying"), val: accompanying, set: setAccompanying },
            ] as { label: string; val: string; set: (v: string) => void }[]
          ).map(({ label, val, set }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-amber-800 mb-1">{label}</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={val}
                onFocus={(e) => { if (e.target.value === "0") set(""); }}
                onBlur={(e) => { if (e.target.value === "") set("0"); }}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  set(raw === "" ? "" : String(parseInt(raw, 10)));
                }}
                className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>
          ))}
        </div>

        {/* Dates row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-amber-800 mb-1">{ta("checkIn")}</label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-800 mb-1">{ta("checkOut")}</label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-amber-800 mb-1">{ta("notes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={ta("notesPlaceholder")}
            className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 bg-navy text-white font-semibold rounded-xl py-3 text-sm hover:bg-navy/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? ta("saving") : ta("confirmBtn")}
          </button>
          <button
            onClick={() => setState("unanswered")}
            className="text-sm text-text-secondary hover:text-text-primary cursor-pointer"
          >
            {ta("cancel")}
          </button>
        </div>
      </div>
    );
  }

  // ── State 1: Unanswered ──────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-5">
      <div className="flex items-start gap-3 mb-4">
        <Hotel className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <p className="text-base font-bold text-amber-900">{ta("questTitle")}</p>
          <p className="text-sm text-amber-700 mt-0.5">{ta("questSubtitle")}</p>
        </div>
      </div>

      {confirmDecline ? (
        <div className="rounded-lg bg-amber-100 border border-amber-300 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-900">{ta("confirmDeclineQuestion")}</p>
          <div className="flex gap-2">
            <button
              onClick={handleDecline}
              disabled={saving}
              className="flex-1 bg-amber-600 text-white font-semibold rounded-lg py-2 text-sm hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? "..." : ta("confirmDeclineYes")}
            </button>
            <button
              onClick={() => setConfirmDecline(false)}
              className="flex-1 border border-amber-400 text-amber-800 font-semibold rounded-lg py-2 text-sm hover:bg-amber-100 cursor-pointer"
            >
              {ta("confirmDeclineBack")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setState("form")}
            className="flex-1 bg-navy text-white font-semibold rounded-xl py-3 text-sm hover:bg-navy/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> {ta("yesBtn")}
          </button>
          <button
            onClick={() => setConfirmDecline(true)}
            className="flex-1 border-2 border-amber-400 text-amber-800 font-semibold rounded-xl py-3 text-sm hover:bg-amber-100 transition-colors cursor-pointer"
          >
            {ta("noBtn")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamOverviewPage() {
  const t = useTranslations("overview");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const { teamId } = useTeam();
  const [data, setData] = useState<OverviewData | null>(null);
  const activeTeamIdRef = useRef(teamId);

  useEffect(() => {
    if (!teamId) return;
    activeTeamIdRef.current = teamId;
    let cancelled = false;
    setData(null);
    fetch(`/api/teams/${teamId}/overview`).then(async (r) => {
      if (!cancelled && r.ok) setData(await r.json());
    });
    return () => { cancelled = true; };
  }, [teamId]);

  function fetchData() {
    if (!teamId) return;
    const tid = teamId;
    fetch(`/api/teams/${tid}/overview`).then(async (r) => {
      // Игнорировать ответ если команда уже изменилась
      if (r.ok && activeTeamIdRef.current === tid) setData(await r.json());
    });
  }

  if (!data) return null;

  const { counts, finance, checks, completionPercent, allergies, tournamentInfo: tInfo, assignedHotel } = data;

  const checklist = [
    { key: "hasPlayers", label: tn("players"), done: checks.hasPlayers, href: "/team/players", icon: Users },
    { key: "hasStaff", label: tn("staff"), done: checks.hasStaff, href: "/team/staff", icon: Shield },
    { key: "hasResponsible", label: t("responsiblePerson"), done: checks.hasResponsible, href: "/team/staff", icon: Shield },
    { key: "hasTravel", label: tn("travel"), done: checks.hasTravel, href: "/team/travel", icon: Plane },
    { key: "hasOrders", label: tn("booking"), done: data.accomConfirmed || data.accomDeclined, href: "/team/booking", icon: ShoppingCart },
  ];

  const balanceNum = parseFloat(finance.balance);

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Accommodation Quest Card ── */}
      {teamId && (
        <AccommodationQuestCard
          key={teamId}
          teamId={String(teamId)}
          initial={{
            accomPlayers: data.accomPlayers,
            accomStaff: data.accomStaff,
            accomAccompanying: data.accomAccompanying,
            accomCheckIn: data.accomCheckIn,
            accomCheckOut: data.accomCheckOut,
            accomNotes: data.accomNotes,
            accomDeclined: data.accomDeclined,
            accomConfirmed: data.accomConfirmed,
          }}
          onUpdate={fetchData}
        />
      )}

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

      {/* Tournament Info */}
      {(assignedHotel || (tInfo && (tInfo.venueName || tInfo.mealTimes || tInfo.scheduleUrl || tInfo.emergencyContact))) && (
        <Card>
          <CardTitle>🏆 {t("tournamentInfoTitle")}</CardTitle>
          <div className="mt-4 space-y-4">

            {/* Assigned hotel (team-specific only) */}
            {assignedHotel && (
              <div className="flex gap-3">
                <Hotel className="w-5 h-5 text-navy shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">{assignedHotel.name}</p>
                  {assignedHotel.address && <p className="text-sm text-text-secondary">{assignedHotel.address}</p>}
                  {assignedHotel.contactName && <p className="text-xs text-text-secondary mt-0.5">{t("contact")}: {assignedHotel.contactName}</p>}
                  {assignedHotel.contactPhone && (
                    <a href={`tel:${assignedHotel.contactPhone}`} className="text-xs text-navy hover:underline block mt-0.5">{assignedHotel.contactPhone}</a>
                  )}
                  {assignedHotel.notes && <p className="text-xs text-text-secondary italic mt-0.5">{assignedHotel.notes}</p>}
                </div>
              </div>
            )}

            {/* Venue */}
            {tInfo?.venueName && (
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-navy shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">{tInfo.venueName}</p>
                  {tInfo.venueAddress && <p className="text-sm text-text-secondary">{tInfo.venueAddress}</p>}
                  {tInfo.venueMapUrl && (
                    <a
                      href={tInfo.venueMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-navy hover:underline mt-0.5"
                    >
                      <ExternalLink className="w-3 h-3" /> {t("onMap")}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Meals */}
            {tInfo?.mealTimes && (
              <div className="flex gap-3">
                <Utensils className="w-5 h-5 text-navy shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t("meals")}</p>
                  <p className="text-sm text-text-secondary">{tInfo.mealTimes}</p>
                  {tInfo.mealLocation && <p className="text-xs text-text-secondary">{tInfo.mealLocation}</p>}
                  {tInfo.mealNotes && <p className="text-xs text-text-secondary italic">{tInfo.mealNotes}</p>}
                </div>
              </div>
            )}

            {/* Schedule */}
            {tInfo?.scheduleUrl && (
              <div className="flex gap-3">
                <Calendar className="w-5 h-5 text-navy shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t("schedule")}</p>
                  {tInfo.scheduleDescription && <p className="text-sm text-text-secondary">{tInfo.scheduleDescription}</p>}
                  <a
                    href={tInfo.scheduleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-navy hover:underline mt-0.5"
                  >
                    <ExternalLink className="w-3 h-3" /> {t("openSchedule")}
                  </a>
                </div>
              </div>
            )}

            {/* Emergency */}
            {tInfo?.emergencyContact && (
              <div className="flex gap-3 bg-red-50 rounded-lg p-3 -mx-1">
                <Phone className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-error">{t("emergencyContact")}</p>
                  <p className="text-sm text-text-primary">{tInfo.emergencyContact}</p>
                  {tInfo.emergencyPhone && (
                    <a href={`tel:${tInfo.emergencyPhone}`} className="text-sm font-medium text-error hover:underline">
                      {tInfo.emergencyPhone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Additional notes */}
            {tInfo?.additionalNotes && (
              <div className="bg-surface rounded-lg p-3 text-sm text-text-secondary">
                {tInfo.additionalNotes}
              </div>
            )}
          </div>
        </Card>
      )}

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
                {a.allergies && (
                  <span className="text-sm text-text-secondary">— {a.allergies}</span>
                )}
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
