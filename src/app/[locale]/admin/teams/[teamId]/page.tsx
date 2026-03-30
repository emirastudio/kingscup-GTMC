"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ArrowLeft, Users, Check, Copy, MessageSquare, Plus, Trash2,
  AlertTriangle, Plane, Train, Bus, Car, Hotel, Utensils,
  Calendar, ExternalLink, ChevronDown, ChevronUp, Eye, EyeOff,
  Phone, Mail, MapPin, Clock, FileText, CreditCard, UserCheck,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type TeamStatus = "draft" | "open" | "confirmed" | "cancelled";

interface TeamReport {
  team: { id: number; name: string; regNumber: number; status: TeamStatus; notes: string | null };
  club: {
    id: number; name: string; badgeUrl: string | null;
    contactName: string | null; contactEmail: string | null; contactPhone: string | null;
    country: string | null; city: string | null;
  } | null;
  class: { id: number; name: string; minBirthYear: number | null; maxBirthYear: number | null } | null;
  people: { all: Person[]; counts: { players: number; staff: number; accompanying: number; total: number } };
  package: { id: number; name: string; assignedAt: string; isPublished: boolean } | null;
  bookings: Booking[];
  overrides: Override[];
  finance: { totalFromBookings: number; totalPaid: number; balance: number };
  payments: Payment[];
  travel: Travel | null;
  tournamentInfo: TournamentInfo | null;
  services: Services;
}

interface Person {
  id: number; personType: "player" | "staff" | "accompanying";
  firstName: string; lastName: string; dateOfBirth: string | null;
  position: string | null; isResponsible: boolean; role: string | null;
  allergies: string | null; dietaryRequirements: string | null; medicalNotes: string | null;
  needsHotel: boolean; needsTransfer: boolean; shirtNumber: number | null;
}

interface Booking {
  id: number; bookingType: string; serviceId: number;
  quantity: number; unitPrice: string; total: string; notes: string | null;
}

interface Override {
  id: number; serviceType: string; serviceId: number;
  customPrice: string | null; isDisabled: boolean; reason: string | null;
}

interface Payment {
  id: number; amount: string; currency: string; method: string;
  status: "pending" | "received" | "refunded";
  reference: string | null; notes: string | null;
  receivedAt: string | null; createdAt: string;
}

interface Travel {
  arrivalType: string | null; arrivalDate: string | null;
  arrivalTime: string | null; arrivalDetails: string | null;
  departureType: string | null; departureDate: string | null;
  departureTime: string | null; departureDetails: string | null;
}

interface TournamentInfo {
  scheduleUrl: string | null; hotelName: string | null; hotelAddress: string | null;
  hotelCheckIn: string | null; hotelCheckOut: string | null; hotelNotes: string | null;
  venueName: string | null; venueAddress: string | null; venueMapUrl: string | null;
  mealTimes: string | null; mealLocation: string | null; mealNotes: string | null;
  emergencyContact: string | null; emergencyPhone: string | null;
}

interface Services {
  accommodation: { id: number; name: string; checkIn: string | null; checkOut: string | null }[];
  meals: { id: number; name: string }[];
  transfers: { id: number; name: string }[];
  registration: { id: number; name: string }[];
}

interface ServicePackage { id: number; name: string; isDefault: boolean }

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<TeamStatus, string> = {
  draft: "bg-surface text-text-secondary border-border",
  open: "bg-emerald-50 text-emerald-700 border-emerald-200",
  confirmed: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

const PAYMENT_STATUS_BADGE: Record<string, "warning" | "success" | "error"> = {
  pending: "warning", received: "success", refunded: "error",
};

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer", cash: "Cash", stripe: "Stripe",
};

const TRANSPORT_ICONS: Record<string, React.ReactNode> = {
  airport: <Plane className="w-4 h-4" />,
  port: <Plane className="w-4 h-4" />,
  railway: <Train className="w-4 h-4" />,
  bus_station: <Bus className="w-4 h-4" />,
  own_bus: <Bus className="w-4 h-4" />,
};

const TRANSPORT_LABELS: Record<string, string> = {
  airport: "Airport", port: "Port", railway: "Railway station",
  bus_station: "Bus station", own_bus: "Own bus",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtEuro(v: number | string) {
  return `€${Number(v).toFixed(2)}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function calcAge(dob: string | null) {
  if (!dob) return "—";
  const b = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return String(age);
}

function todayISO() { return new Date().toISOString().split("T")[0]; }

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatTile({ label, value, sub, color = "default" }: {
  label: string; value: string | number; sub?: string;
  color?: "default" | "green" | "red" | "amber";
}) {
  const colors = {
    default: "border-border bg-surface/50",
    green: "border-emerald-200 bg-emerald-50",
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
  };
  const textColors = {
    default: "text-text-primary",
    green: "text-emerald-700",
    red: "text-red-600",
    amber: "text-amber-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${textColors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ label, count, open, onToggle }: {
  label: string; count: number; open: boolean; onToggle: () => void;
}) {
  return (
    <button onClick={onToggle}
      className="flex items-center gap-2 text-sm font-semibold text-text-primary hover:text-navy transition-colors cursor-pointer w-full text-left py-1">
      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      {label}
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface border border-border text-xs font-medium text-text-secondary">
        {count}
      </span>
    </button>
  );
}

function InfoRow({ icon, label, value, href }: {
  icon: React.ReactNode; label: string; value: string | null | undefined; href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-text-secondary mt-0.5 shrink-0">{icon}</span>
      <div>
        <span className="text-xs text-text-secondary block">{label}</span>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-navy hover:underline font-medium flex items-center gap-1">
            {value} <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-text-primary font-medium">{value}</span>
        )}
      </div>
    </div>
  );
}

function MedicalBadge({ allergies, dietary, medical }: {
  allergies: string | null; dietary: string | null; medical: string | null;
}) {
  if (!allergies && !dietary && !medical) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {allergies && (
        <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
          ⚠ {allergies}
        </span>
      )}
      {dietary && (
        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
          🥗 {dietary}
        </span>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminTeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const router = useRouter();
  const locale = useLocale();

  const [report, setReport] = useState<TeamReport | null>(null);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notes
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Status
  const [savingStatus, setSavingStatus] = useState(false);

  // Package
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [assigningPackage, setAssigningPackage] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);

  // Overrides
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [overrideType, setOverrideType] = useState("accommodation");
  const [overrideServiceId, setOverrideServiceId] = useState("");
  const [overrideCustomPrice, setOverrideCustomPrice] = useState("");
  const [overrideIsDisabled, setOverrideIsDisabled] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  // Section toggles
  const [showPlayers, setShowPlayers] = useState(true);
  const [showStaff, setShowStaff] = useState(true);
  const [showAccompanying, setShowAccompanying] = useState(false);
  const [showPayments, setShowPayments] = useState(true);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentStatus, setPaymentStatus] = useState("received");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [copied, setCopied] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/report`);
      if (!res.ok) { setError("Team not found"); return; }
      const data: TeamReport = await res.json();
      setReport(data);
      setNotes(data.team.notes ?? "");
    } catch {
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const fetchPackages = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/packages");
      if (res.ok) { const d = await res.json(); setPackages(Array.isArray(d) ? d : []); }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchReport(); fetchPackages(); }, [fetchReport, fetchPackages]);
  useEffect(() => { if (report?.package) setSelectedPackageId(String(report.package.id)); }, [report?.package]);

  // ─── Mutations ───────────────────────────────────────────────────────────

  async function handleStatusChange(newStatus: TeamStatus) {
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) await fetchReport();
    } finally { setSavingStatus(false); }
  }

  function handleNotesBlur() {
    if (!report || notes === (report.team.notes ?? "")) return;
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(async () => {
      setSavingNotes(true);
      try {
        await fetch(`/api/admin/teams/${teamId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        });
        await fetchReport();
      } finally { setSavingNotes(false); }
    }, 300);
  }

  async function handleAssignPackage() {
    if (!selectedPackageId) return;
    setAssigningPackage(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/assign-package`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: Number(selectedPackageId) }),
      });
      if (res.ok) await fetchReport();
    } finally { setAssigningPackage(false); }
  }

  async function handleRemovePackage() {
    setAssigningPackage(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/assign-package`, { method: "DELETE" });
      if (res.ok) { setSelectedPackageId(""); await fetchReport(); }
    } finally { setAssigningPackage(false); }
  }

  async function handleTogglePublish() {
    if (!report?.package) return;
    setTogglingPublish(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/assign-package`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !report.package.isPublished }),
      });
      if (res.ok) await fetchReport();
    } finally { setTogglingPublish(false); }
  }

  async function handleAddOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!overrideType || !overrideServiceId) return;
    setSavingOverride(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/overrides`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: overrideType,
          serviceId: Number(overrideServiceId),
          customPrice: overrideCustomPrice ? Number(overrideCustomPrice) : undefined,
          isDisabled: overrideIsDisabled,
          reason: overrideReason || undefined,
        }),
      });
      if (res.ok) {
        setShowAddOverride(false);
        setOverrideType("accommodation"); setOverrideServiceId("");
        setOverrideCustomPrice(""); setOverrideIsDisabled(false); setOverrideReason("");
        await fetchReport();
      }
    } finally { setSavingOverride(false); }
  }

  async function handleRemoveOverride(id: number) {
    await fetch(`/api/admin/teams/${teamId}/overrides?id=${id}`, { method: "DELETE" });
    await fetchReport();
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentAmount) return;
    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: Number(teamId), amount: Number(paymentAmount),
          method: paymentMethod, status: paymentStatus,
          reference: paymentReference || null, notes: paymentNotes || null,
          receivedAt: paymentDate || null,
        }),
      });
      if (res.ok) { setShowPaymentModal(false); resetPaymentForm(); await fetchReport(); }
    } finally { setSubmittingPayment(false); }
  }

  function resetPaymentForm() {
    setPaymentAmount(""); setPaymentMethod("bank_transfer"); setPaymentStatus("received");
    setPaymentReference(""); setPaymentNotes(""); setPaymentDate(todayISO());
  }

  async function handleCopyInvite() {
    if (!report?.club) return;
    try {
      const res = await fetch("/api/admin/generate-invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: report.club.id }),
      });
      const data = await res.json();
      if (data.inviteUrl) {
        await navigator.clipboard.writeText(data.inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch { /* silent */ }
  }

  // ─── Loading / Error ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-40 bg-surface rounded" />
        <div className="h-32 bg-surface rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-surface rounded-xl" />
          <div className="h-48 bg-surface rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.push(`/${locale}/admin/teams`)}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-navy cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Teams
        </button>
        <Alert variant="error">{error ?? "Team not found"}</Alert>
      </div>
    );
  }

  const { team, club, class: teamClass, people, finance, payments, travel, tournamentInfo: tInfo, services, overrides } = report;
  const players = people.all.filter((p) => p.personType === "player");
  const staff = people.all.filter((p) => p.personType === "staff");
  const accompanying = people.all.filter((p) => p.personType === "accompanying");

  const hasMedical = people.all.some((p) => p.allergies || p.dietaryRequirements || p.medicalNotes);
  const medicalPeople = people.all.filter((p) => p.allergies || p.dietaryRequirements || p.medicalNotes);
  const allStatuses: TeamStatus[] = ["draft", "open", "confirmed", "cancelled"];

  // Booking summary helpers
  function resolveServiceName(type: string, id: number): string {
    if (!services) return `#${id}`;
    if (type === "accommodation") return services.accommodation.find((a) => a.id === id)?.name ?? `#${id}`;
    if (type === "meal") return services.meals.find((m) => m.id === id)?.name ?? `#${id}`;
    if (type === "transfer") return services.transfers.find((t) => t.id === id)?.name ?? `#${id}`;
    if (type === "registration") return services.registration.find((r) => r.id === id)?.name ?? "Registration";
    return `#${id}`;
  }

  // Services options for override form
  function getServiceOptions(type: string) {
    if (!services) return [];
    if (type === "accommodation") return services.accommodation;
    if (type === "meal") return services.meals;
    if (type === "transfer") return services.transfers;
    if (type === "registration") return services.registration;
    return [];
  }

  const balanceColor = finance.balance <= 0 ? "green" : "red";

  return (
    <div className="space-y-5">

      {/* ── Back nav ── */}
      <button onClick={() => router.push(`/${locale}/admin/teams`)}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-navy transition-colors cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> All Teams
      </button>

      {/* ══════════════════════════════════════════════════════════════════
          CARD 1 — Team Identity
      ══════════════════════════════════════════════════════════════════ */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: badge + info */}
          <div className="flex items-start gap-4">
            {club?.badgeUrl ? (
              <img src={club.badgeUrl} alt={club.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-border shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center border-2 border-border shrink-0">
                <Users className="w-7 h-7 text-text-secondary" />
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-text-primary">{team.name}</h1>
                <span className="text-lg font-semibold text-text-secondary">#{team.regNumber}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[team.status]}`}>
                  {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
                </span>
              </div>
              {club && (
                <p className="text-sm text-text-secondary">
                  {club.name}
                  {club.city ? ` · ${club.city}` : ""}
                  {club.country ? `, ${club.country}` : ""}
                </p>
              )}
              {teamClass && (
                <p className="text-xs text-text-secondary mt-0.5">
                  Class: <span className="font-semibold text-text-primary">{teamClass.name}</span>
                  {(teamClass.minBirthYear || teamClass.maxBirthYear) &&
                    ` (${teamClass.minBirthYear ?? ""}–${teamClass.maxBirthYear ?? ""})`}
                </p>
              )}
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status dropdown */}
            <select value={team.status} onChange={(e) => handleStatusChange(e.target.value as TeamStatus)}
              disabled={savingStatus}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy appearance-none cursor-pointer disabled:opacity-50">
              {allStatuses.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>

            {/* Copy login link */}
            <Button variant="secondary" size="sm" onClick={handleCopyInvite} disabled={!club}>
              {copied ? <><Check className="w-4 h-4 text-success" /><span className="text-success">Copied!</span></>
                : <><Copy className="w-4 h-4" />Login link</>}
            </Button>

            {/* Send message */}
            <Button variant="secondary" size="sm" onClick={() => router.push(`/${locale}/admin/messages`)}>
              <MessageSquare className="w-4 h-4" /> Message
            </Button>

            {/* Schedule link */}
            {tInfo?.scheduleUrl && (
              <a href={tInfo.scheduleUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm">
                  <Calendar className="w-4 h-4" /> Schedule
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Contact info */}
        {club && (club.contactName || club.contactEmail || club.contactPhone) && (
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-x-6 gap-y-2">
            {club.contactName && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <UserCheck className="w-4 h-4" />
                <span className="font-medium text-text-primary">{club.contactName}</span>
              </div>
            )}
            {club.contactEmail && (
              <a href={`mailto:${club.contactEmail}`}
                className="flex items-center gap-2 text-sm text-navy hover:underline">
                <Mail className="w-4 h-4" />
                {club.contactEmail}
              </a>
            )}
            {club.contactPhone && (
              <a href={`tel:${club.contactPhone}`}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-navy">
                <Phone className="w-4 h-4" />
                {club.contactPhone}
              </a>
            )}
          </div>
        )}
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          STATS ROW
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Players" value={people.counts.players} sub={`+ ${people.counts.staff} staff`} />
        <StatTile
          label="Accommodation"
          value={report.bookings.find((b) => b.bookingType === "accommodation")
            ? resolveServiceName("accommodation", report.bookings.find((b) => b.bookingType === "accommodation")!.serviceId)
            : "—"}
          sub={report.bookings.find((b) => b.bookingType === "accommodation") ? "booked" : "not booked"}
          color={report.bookings.find((b) => b.bookingType === "accommodation") ? "green" : "default"}
        />
        <StatTile
          label="Package"
          value={report.package ? report.package.name : "—"}
          sub={report.package?.isPublished ? "✓ Published" : report.package ? "⚠ Not published" : "Not assigned"}
          color={report.package?.isPublished ? "green" : report.package ? "amber" : "default"}
        />
        <StatTile
          label="Balance"
          value={fmtEuro(Math.abs(finance.balance))}
          sub={finance.balance <= 0 ? "Paid in full" : `${fmtEuro(finance.balance)} outstanding`}
          color={balanceColor}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ROW 2: Bookings + Finance summary
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Booking Summary */}
        <Card>
          <CardHeader><CardTitle>Booking Summary</CardTitle></CardHeader>
          {report.bookings.length === 0 ? (
            <p className="text-sm text-text-secondary italic">No bookings saved yet.</p>
          ) : (
            <div className="space-y-2">
              {(() => {
                // Group accommodation bookings
                const accRows = report.bookings.filter((b) => b.bookingType === "accommodation");
                const otherRows = report.bookings.filter((b) => b.bookingType !== "accommodation");
                const accTotal = accRows.reduce((s, b) => s + Number(b.total), 0);

                return (
                  <>
                    {accRows.length > 0 && (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2.5 bg-surface/50">
                          <div className="flex items-center gap-2">
                            <Hotel className="w-4 h-4 text-text-secondary" />
                            <span className="text-sm font-medium text-text-primary">
                              {resolveServiceName("accommodation", accRows[0].serviceId)}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-navy">{fmtEuro(accTotal)}</span>
                        </div>
                        <div className="px-3 py-2 space-y-1">
                          {accRows.map((b) => (
                            <div key={b.id} className="flex justify-between text-xs text-text-secondary">
                              <span className="capitalize">{b.notes ?? "persons"} × {fmtEuro(b.unitPrice)}</span>
                              <span>{b.quantity} ppl → {fmtEuro(b.total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {otherRows.map((b) => {
                      const icons: Record<string, React.ReactNode> = {
                        transfer: <Car className="w-4 h-4 text-text-secondary" />,
                        meal: <Utensils className="w-4 h-4 text-text-secondary" />,
                        registration: <FileText className="w-4 h-4 text-text-secondary" />,
                      };
                      return (
                        <div key={b.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {icons[b.bookingType] ?? <FileText className="w-4 h-4 text-text-secondary" />}
                            <div>
                              <span className="text-sm font-medium text-text-primary">
                                {resolveServiceName(b.bookingType, b.serviceId)}
                              </span>
                              {b.quantity > 1 && (
                                <span className="text-xs text-text-secondary ml-2">× {b.quantity}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-navy">{fmtEuro(b.total)}</span>
                        </div>
                      );
                    })}

                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-sm font-semibold text-text-primary">Grand Total</span>
                      <span className="text-lg font-bold text-navy">{fmtEuro(finance.totalFromBookings)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </Card>

        {/* Finance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Finance</CardTitle>
              <Button size="sm" onClick={() => setShowPaymentModal(true)}>
                <Plus className="w-4 h-4" /> Add Payment
              </Button>
            </div>
          </CardHeader>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border border-border bg-surface/50 p-3 text-center">
              <p className="text-xs text-text-secondary">Ordered</p>
              <p className="text-lg font-bold text-text-primary">{fmtEuro(finance.totalFromBookings)}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-xs text-text-secondary">Paid</p>
              <p className="text-lg font-bold text-emerald-700">{fmtEuro(finance.totalPaid)}</p>
            </div>
            <div className={`rounded-lg border p-3 text-center ${
              finance.balance <= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
            }`}>
              <p className="text-xs text-text-secondary">Balance</p>
              <p className={`text-lg font-bold ${finance.balance <= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {finance.balance > 0 ? "-" : ""}{fmtEuro(Math.abs(finance.balance))}
              </p>
            </div>
          </div>

          {/* Payment history (compact) */}
          {payments.length > 0 && (
            <div>
              <button onClick={() => setShowPayments(!showPayments)}
                className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-navy cursor-pointer mb-2">
                {showPayments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Payment history ({payments.length})
              </button>
              {showPayments && (
                <div className="space-y-1.5">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={PAYMENT_STATUS_BADGE[p.status] ?? "default"}>
                          {p.status}
                        </Badge>
                        <span className="text-text-secondary text-xs">{fmtDate(p.receivedAt ?? p.createdAt)}</span>
                        <span className="text-text-secondary text-xs">{METHOD_LABELS[p.method] ?? p.method}</span>
                      </div>
                      <span className="font-semibold tabular-nums text-text-primary">{fmtEuro(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {payments.length === 0 && (
            <p className="text-xs text-text-secondary italic">No payments recorded yet.</p>
          )}
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ROW 3: Package & Pricing + Hotel & Logistics
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Package & Pricing */}
        <Card>
          <CardHeader><CardTitle>Package & Pricing</CardTitle></CardHeader>

          {/* Current package + publish toggle */}
          <div className="mb-5">
            {report.package ? (
              <div className="rounded-xl border-2 border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-surface/50">
                  <div>
                    <p className="font-semibold text-text-primary">{report.package.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Assigned {fmtDate(report.package.assignedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Publish toggle */}
                    <button
                      onClick={handleTogglePublish}
                      disabled={togglingPublish}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors cursor-pointer disabled:opacity-50 ${
                        report.package.isPublished
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                          : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                      }`}
                    >
                      {report.package.isPublished
                        ? <><Eye className="w-3.5 h-3.5" /> Published</>
                        : <><EyeOff className="w-3.5 h-3.5" /> Hidden</>}
                    </button>
                    <Button variant="danger" size="sm" onClick={handleRemovePackage} disabled={assigningPackage}>
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="text-sm text-text-secondary">No package assigned — team cannot see booking page</p>
              </div>
            )}
          </div>

          {/* Assign / change */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
              {report.package ? "Change Package" : "Assign Package"}
            </label>
            <div className="flex gap-2">
              <select value={selectedPackageId} onChange={(e) => setSelectedPackageId(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy appearance-none cursor-pointer">
                <option value="">Select package...</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name}{pkg.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
              <Button onClick={handleAssignPackage} disabled={!selectedPackageId || assigningPackage} size="sm">
                {assigningPackage ? "..." : "Assign"}
              </Button>
            </div>
          </div>

          {/* Price overrides */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-text-primary">Custom Pricing</h4>
              <Button variant="secondary" size="sm" onClick={() => setShowAddOverride(!showAddOverride)}>
                <Plus className="w-3.5 h-3.5" /> Add override
              </Button>
            </div>

            {showAddOverride && (
              <form onSubmit={handleAddOverride}
                className="mb-4 p-3 rounded-lg border border-navy/20 bg-navy/3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Service type</label>
                    <select value={overrideType} onChange={(e) => { setOverrideType(e.target.value); setOverrideServiceId(""); }}
                      className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20">
                      <option value="accommodation">Accommodation</option>
                      <option value="meal">Meal</option>
                      <option value="transfer">Transfer</option>
                      <option value="registration">Registration</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Specific service</label>
                    <select value={overrideServiceId} onChange={(e) => setOverrideServiceId(e.target.value)} required
                      className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20">
                      <option value="">Select...</option>
                      {getServiceOptions(overrideType).map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Custom price (€)" type="number" step="0.01"
                    value={overrideCustomPrice}
                    onChange={(e) => setOverrideCustomPrice(e.target.value)}
                    placeholder="Leave blank to keep original" />
                  <Input label="Reason" value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. Partner club" />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={overrideIsDisabled}
                    onChange={(e) => setOverrideIsDisabled(e.target.checked)}
                    className="rounded border-border" />
                  <span className="text-text-secondary">Disable this service for team</span>
                </label>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setShowAddOverride(false)}>Cancel</Button>
                  <Button size="sm" type="submit" disabled={savingOverride}>{savingOverride ? "Saving..." : "Save"}</Button>
                </div>
              </form>
            )}

            {overrides.length === 0 ? (
              <p className="text-xs text-text-secondary italic">No custom pricing set</p>
            ) : (
              <div className="space-y-1.5">
                {overrides.map((ov) => (
                  <div key={ov.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border text-sm bg-surface/30">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium bg-surface border border-border rounded px-1.5 py-0.5 capitalize">
                        {ov.serviceType}
                      </span>
                      <span className="font-medium text-text-primary">
                        {resolveServiceName(ov.serviceType, ov.serviceId)}
                      </span>
                      {ov.customPrice && (
                        <span className="text-navy font-semibold">{fmtEuro(ov.customPrice)}</span>
                      )}
                      {ov.isDisabled && <Badge variant="error">Disabled</Badge>}
                      {ov.reason && <span className="text-xs text-text-secondary italic">"{ov.reason}"</span>}
                    </div>
                    <button onClick={() => handleRemoveOverride(ov.id)}
                      className="text-text-secondary hover:text-error transition-colors cursor-pointer ml-2 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Hotel & Logistics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Hotel & Logistics</CardTitle>
              {tInfo?.scheduleUrl && (
                <a href={tInfo.scheduleUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm">
                    <ExternalLink className="w-3.5 h-3.5" /> Match Schedule
                  </Button>
                </a>
              )}
            </div>
          </CardHeader>

          {!tInfo ? (
            <p className="text-sm text-text-secondary italic">
              Tournament info not set. Go to{" "}
              <button onClick={() => router.push(`/${locale}/admin/settings`)}
                className="text-navy hover:underline cursor-pointer">Settings</button>
              {" "}to add hotel & logistics details.
            </p>
          ) : (
            <div className="space-y-5">
              {/* Hotel */}
              {(tInfo.hotelName || tInfo.hotelAddress) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3 flex items-center gap-1.5">
                    <Hotel className="w-3.5 h-3.5" /> Hotel
                  </h4>
                  <div className="space-y-2">
                    <InfoRow icon={<Hotel className="w-4 h-4" />} label="Name" value={tInfo.hotelName} />
                    <InfoRow icon={<MapPin className="w-4 h-4" />} label="Address" value={tInfo.hotelAddress} />
                    {(tInfo.hotelCheckIn || tInfo.hotelCheckOut) && (
                      <div className="flex items-start gap-3 text-sm">
                        <span className="text-text-secondary mt-0.5 shrink-0"><Clock className="w-4 h-4" /></span>
                        <div>
                          <span className="text-xs text-text-secondary block">Check-in / Check-out</span>
                          <span className="text-text-primary font-medium">
                            {tInfo.hotelCheckIn ?? "—"} / {tInfo.hotelCheckOut ?? "—"}
                          </span>
                        </div>
                      </div>
                    )}
                    {tInfo.hotelNotes && (
                      <div className="rounded-lg bg-surface border border-border p-2.5 text-xs text-text-secondary">
                        {tInfo.hotelNotes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Meals */}
              {(tInfo.mealTimes || tInfo.mealLocation || tInfo.mealNotes) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3 flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5" /> Meals
                  </h4>
                  <div className="space-y-2">
                    <InfoRow icon={<Clock className="w-4 h-4" />} label="Meal times" value={tInfo.mealTimes} />
                    <InfoRow icon={<MapPin className="w-4 h-4" />} label="Location" value={tInfo.mealLocation} />
                    {tInfo.mealNotes && (
                      <div className="rounded-lg bg-surface border border-border p-2.5 text-xs text-text-secondary">
                        {tInfo.mealNotes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Venue */}
              {(tInfo.venueName || tInfo.venueAddress) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Venue
                  </h4>
                  <div className="space-y-2">
                    <InfoRow icon={<MapPin className="w-4 h-4" />} label="Venue" value={tInfo.venueName} />
                    <InfoRow icon={<MapPin className="w-4 h-4" />} label="Address" value={tInfo.venueAddress}
                      href={tInfo.venueMapUrl ?? undefined} />
                  </div>
                </div>
              )}

              {/* Emergency */}
              {(tInfo.emergencyContact || tInfo.emergencyPhone) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Emergency Contact
                  </h4>
                  <div className="space-y-2">
                    <InfoRow icon={<UserCheck className="w-4 h-4" />} label="Name" value={tInfo.emergencyContact} />
                    <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={tInfo.emergencyPhone}
                      href={tInfo.emergencyPhone ? `tel:${tInfo.emergencyPhone}` : undefined} />
                  </div>
                </div>
              )}

              {!tInfo.hotelName && !tInfo.mealTimes && !tInfo.scheduleUrl && (
                <p className="text-sm text-text-secondary italic">No logistics info set yet.</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ROW 4: Travel
      ══════════════════════════════════════════════════════════════════ */}
      {travel && (travel.arrivalType || travel.departureType) && (
        <Card>
          <CardHeader><CardTitle>Travel</CardTitle></CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Arrival */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3">Arrival</h4>
              {travel.arrivalType ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    {TRANSPORT_ICONS[travel.arrivalType] ?? <Plane className="w-4 h-4" />}
                    <span>{TRANSPORT_LABELS[travel.arrivalType] ?? travel.arrivalType}</span>
                  </div>
                  {travel.arrivalDate && (
                    <p className="text-sm text-text-secondary">
                      {fmtDate(travel.arrivalDate)}{travel.arrivalTime && ` at ${travel.arrivalTime}`}
                    </p>
                  )}
                  {travel.arrivalDetails && (
                    <p className="text-sm font-medium text-text-primary">{travel.arrivalDetails}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-secondary italic">Not specified</p>
              )}
            </div>

            {/* Departure */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3">Departure</h4>
              {travel.departureType ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    {TRANSPORT_ICONS[travel.departureType] ?? <Plane className="w-4 h-4" />}
                    <span>{TRANSPORT_LABELS[travel.departureType] ?? travel.departureType}</span>
                  </div>
                  {travel.departureDate && (
                    <p className="text-sm text-text-secondary">
                      {fmtDate(travel.departureDate)}{travel.departureTime && ` at ${travel.departureTime}`}
                    </p>
                  )}
                  {travel.departureDetails && (
                    <p className="text-sm font-medium text-text-primary">{travel.departureDetails}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-secondary italic">Not specified</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PEOPLE
      ══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>People</CardTitle>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <span>{people.counts.players} players</span>
              <span>·</span>
              <span>{people.counts.staff} staff</span>
              {people.counts.accompanying > 0 && (
                <><span>·</span><span>{people.counts.accompanying} accompanying</span></>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Medical alert */}
        {hasMedical && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" /> Medical / Dietary ({medicalPeople.length} persons)
            </p>
            <div className="space-y-1">
              {medicalPeople.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium text-amber-900">{p.firstName} {p.lastName}</span>
                  {p.allergies && <span className="bg-white border border-amber-200 rounded-full px-2 py-0.5 text-amber-700">⚠ {p.allergies}</span>}
                  {p.dietaryRequirements && <span className="bg-white border border-blue-200 rounded-full px-2 py-0.5 text-blue-700">🥗 {p.dietaryRequirements}</span>}
                  {p.medicalNotes && <span className="bg-white border border-red-200 rounded-full px-2 py-0.5 text-red-600">💊 {p.medicalNotes}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-5">
          {/* Players */}
          {players.length > 0 && (
            <div>
              <SectionHeader label="Players" count={players.length} open={showPlayers} onToggle={() => setShowPlayers(!showPlayers)} />
              {showPlayers && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["#", "Name", "DOB / Age", "Pos", "Hotel", "Transfer"].map((h, i) => (
                          <th key={i} className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((p, i) => (
                        <tr key={p.id} className={`border-b border-border last:border-0 ${(p.allergies || p.dietaryRequirements) ? "bg-amber-50/60" : ""}`}>
                          <td className="py-2.5 pr-3 text-text-secondary tabular-nums">{p.shirtNumber ?? i + 1}</td>
                          <td className="py-2.5 pr-3 font-medium text-text-primary whitespace-nowrap">
                            {p.firstName} {p.lastName}
                            {(p.allergies || p.dietaryRequirements) && (
                              <AlertTriangle className="inline w-3.5 h-3.5 text-amber-500 ml-1" />
                            )}
                          </td>
                          <td className="py-2.5 pr-3 text-text-secondary text-xs whitespace-nowrap">
                            {p.dateOfBirth ? (
                              <>{fmtDate(p.dateOfBirth)} <span className="opacity-60">({calcAge(p.dateOfBirth)}y)</span></>
                            ) : "—"}
                          </td>
                          <td className="py-2.5 pr-3 text-text-secondary text-xs">{p.position ?? "—"}</td>
                          <td className="py-2.5 pr-3 text-xs">
                            {p.needsHotel ? <span className="text-emerald-600 font-medium">✓</span> : <span className="text-text-secondary">—</span>}
                          </td>
                          <td className="py-2.5 text-xs">
                            {p.needsTransfer ? <span className="text-emerald-600 font-medium">✓</span> : <span className="text-text-secondary">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Staff */}
          {staff.length > 0 && (
            <div>
              <SectionHeader label="Staff" count={staff.length} open={showStaff} onToggle={() => setShowStaff(!showStaff)} />
              {showStaff && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Name", "Role", "Hotel", "Transfer"].map((h, i) => (
                          <th key={i} className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <td className="py-2.5 pr-3 font-medium text-text-primary whitespace-nowrap">
                            {p.firstName} {p.lastName}
                            {p.isResponsible && <Badge variant="info" className="ml-2">Responsible</Badge>}
                          </td>
                          <td className="py-2.5 pr-3 text-text-secondary text-xs">{p.role ?? p.position ?? "—"}</td>
                          <td className="py-2.5 pr-3 text-xs">
                            {p.needsHotel ? <span className="text-emerald-600 font-medium">✓</span> : <span className="text-text-secondary">—</span>}
                          </td>
                          <td className="py-2.5 text-xs">
                            {p.needsTransfer ? <span className="text-emerald-600 font-medium">✓</span> : <span className="text-text-secondary">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Accompanying */}
          {accompanying.length > 0 && (
            <div>
              <SectionHeader label="Accompanying" count={accompanying.length} open={showAccompanying} onToggle={() => setShowAccompanying(!showAccompanying)} />
              {showAccompanying && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Name", "Hotel", "Transfer"].map((h, i) => (
                          <th key={i} className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {accompanying.map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <td className="py-2.5 pr-3 font-medium text-text-primary">{p.firstName} {p.lastName}</td>
                          <td className="py-2.5 pr-3 text-xs">
                            {p.needsHotel ? <span className="text-emerald-600 font-medium">✓</span> : <span className="text-text-secondary">—</span>}
                          </td>
                          <td className="py-2.5 text-xs">
                            {p.needsTransfer ? <span className="text-emerald-600 font-medium">✓</span> : <span className="text-text-secondary">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {people.counts.total === 0 && (
            <p className="text-sm text-text-secondary italic">No people registered yet.</p>
          )}
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          Admin Notes
      ══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Admin Notes</CardTitle>
            {savingNotes && <span className="text-xs text-text-secondary">Saving...</span>}
          </div>
        </CardHeader>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          rows={3}
          placeholder="Internal notes visible only to admins..."
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-y"
        />
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          ADD PAYMENT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle><CreditCard className="w-5 h-5 inline mr-2" />Add Payment</CardTitle>
                <button onClick={() => { setShowPaymentModal(false); resetPaymentForm(); }}
                  className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer text-xl leading-none">×</button>
              </div>
            </CardHeader>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <Input label="Amount (EUR)" type="number" step="0.01" min="0.01"
                value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required placeholder="0.00" />
              <Select label="Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                options={[
                  { value: "bank_transfer", label: "Bank Transfer" },
                  { value: "cash", label: "Cash" },
                  { value: "stripe", label: "Stripe" },
                ]} />
              <Select label="Status" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}
                options={[
                  { value: "received", label: "Received" },
                  { value: "pending", label: "Pending" },
                ]} />
              <Input label="Date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              <Input label="Reference (optional)" value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)} placeholder="Invoice number, etc." />
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Notes (optional)</label>
                <textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2}
                  placeholder="Additional notes..."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" type="button" onClick={() => { setShowPaymentModal(false); resetPaymentForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingPayment}>
                  {submittingPayment ? "Saving..." : "Save Payment"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
