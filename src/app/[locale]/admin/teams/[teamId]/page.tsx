"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ArrowLeft,
  Users,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  MessageSquare,
  Plus,
  Trash2,
  AlertTriangle,
  Plane,
  Train,
  Bus,
  Car,
} from "lucide-react";

// ---------- Types ----------

type TeamStatus = "draft" | "open" | "confirmed" | "cancelled";

interface TeamReport {
  team: {
    id: number;
    name: string;
    regNumber: number;
    status: TeamStatus;
    notes: string | null;
  };
  club: {
    id: number;
    name: string;
    badgeUrl: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    country: string | null;
    city: string | null;
  } | null;
  class: {
    id: number;
    name: string;
    minBirthYear: number | null;
    maxBirthYear: number | null;
  } | null;
  people: {
    all: Person[];
    counts: { players: number; staff: number; accompanying: number; total: number };
  };
  package: { id: number; name: string; assignedAt: string } | null;
  bookings: Booking[];
  overrides: Override[];
  finance: { totalFromBookings: number; totalPaid: number; balance: number };
  payments: Payment[];
  travel: Travel | null;
}

interface Person {
  id: number;
  personType: "player" | "staff" | "accompanying";
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  position: string | null;
  isResponsible: boolean;
  hotelOptionId: number | null;
  transferOptionId: number | null;
  allergies: string | null;
  dietaryRequirements: string | null;
}

interface Booking {
  id: number;
  serviceType: string;
  serviceId: number;
  quantity: number;
  unitPrice: string;
  total: string;
  createdAt: string;
}

interface Override {
  id: number;
  serviceType: string;
  serviceId: number;
  customPrice: string | null;
  isDisabled: boolean;
  reason: string | null;
}

interface Payment {
  id: number;
  amount: string;
  currency: string;
  method: string;
  status: "pending" | "received" | "refunded";
  reference: string | null;
  notes: string | null;
  receivedAt: string | null;
  createdAt: string;
}

interface Travel {
  id: number;
  arrivalType: string | null;
  arrivalDate: string | null;
  arrivalTime: string | null;
  arrivalDetails: string | null;
  departureType: string | null;
  departureDate: string | null;
  departureTime: string | null;
  departureDetails: string | null;
}

interface ServicePackage {
  id: number;
  name: string;
  isDefault: boolean;
}

// ---------- Helpers ----------

const STATUS_BADGE: Record<TeamStatus, "default" | "success" | "gold" | "error"> = {
  draft: "default",
  open: "success",
  confirmed: "gold",
  cancelled: "error",
};

const PAYMENT_STATUS_BADGE: Record<string, "warning" | "success" | "error"> = {
  pending: "warning",
  received: "success",
  refunded: "error",
};

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  stripe: "Stripe",
};

const TRAVEL_ICONS: Record<string, React.ReactNode> = {
  plane: <Plane className="w-4 h-4" />,
  train: <Train className="w-4 h-4" />,
  bus: <Bus className="w-4 h-4" />,
  car: <Car className="w-4 h-4" />,
};

function formatEuro(val: number | string): string {
  return `€${Number(val).toFixed(2)}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function calcAge(dob: string | null): string {
  if (!dob) return "-";
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return String(age);
}

// ---------- Skeleton ----------

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-surface rounded-lg" />
      <div className="grid grid-cols-1 gap-6">
        <div className="h-48 bg-surface rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-surface rounded-xl" />
          <div className="h-64 bg-surface rounded-xl" />
        </div>
        <div className="h-48 bg-surface rounded-xl" />
      </div>
    </div>
  );
}

// ---------- Section Toggle ----------

function SectionToggle({
  label,
  count,
  open,
  onToggle,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 text-sm font-medium text-text-primary hover:text-navy transition-colors cursor-pointer"
    >
      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      {label}
      <Badge variant="default">{count}</Badge>
    </button>
  );
}

// ---------- Main Component ----------

export default function AdminTeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin");

  // Data
  const [report, setReport] = useState<TeamReport | null>(null);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Team info editing
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  // Package
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [assigningPackage, setAssigningPackage] = useState(false);

  // Overrides
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [overrideServiceType, setOverrideServiceType] = useState("");
  const [overrideServiceId, setOverrideServiceId] = useState("");
  const [overrideCustomPrice, setOverrideCustomPrice] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  // People section toggles
  const [showPlayers, setShowPlayers] = useState(true);
  const [showStaff, setShowStaff] = useState(true);
  const [showAccompanying, setShowAccompanying] = useState(false);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Invite
  const [copied, setCopied] = useState(false);

  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- Fetch ----------

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/report`);
      if (!res.ok) {
        setError("Team not found");
        return;
      }
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
      if (res.ok) {
        const data = await res.json();
        setPackages(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchReport();
    fetchPackages();
  }, [fetchReport, fetchPackages]);

  useEffect(() => {
    if (report?.package) {
      setSelectedPackageId(String(report.package.id));
    }
  }, [report?.package]);

  // ---------- Team mutations ----------

  async function handleStatusChange(newStatus: TeamStatus) {
    if (!report) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) await fetchReport();
    } finally {
      setSavingStatus(false);
    }
  }

  function handleNotesBlur() {
    if (!report || notes === (report.team.notes ?? "")) return;
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(async () => {
      setSavingNotes(true);
      try {
        await fetch(`/api/admin/teams/${teamId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        });
        await fetchReport();
      } finally {
        setSavingNotes(false);
      }
    }, 300);
  }

  // ---------- Package mutations ----------

  async function handleAssignPackage() {
    if (!selectedPackageId) return;
    setAssigningPackage(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/assign-package`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: Number(selectedPackageId) }),
      });
      if (res.ok) await fetchReport();
    } finally {
      setAssigningPackage(false);
    }
  }

  async function handleRemovePackage() {
    setAssigningPackage(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/assign-package`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedPackageId("");
        await fetchReport();
      }
    } finally {
      setAssigningPackage(false);
    }
  }

  // ---------- Override mutations ----------

  async function handleAddOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!overrideServiceType || !overrideServiceId) return;
    setSavingOverride(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: overrideServiceType,
          serviceId: Number(overrideServiceId),
          customPrice: overrideCustomPrice ? Number(overrideCustomPrice) : undefined,
          reason: overrideReason || undefined,
        }),
      });
      if (res.ok) {
        setShowAddOverride(false);
        setOverrideServiceType("");
        setOverrideServiceId("");
        setOverrideCustomPrice("");
        setOverrideReason("");
        await fetchReport();
      }
    } finally {
      setSavingOverride(false);
    }
  }

  async function handleRemoveOverride(id: number) {
    try {
      await fetch(`/api/admin/teams/${teamId}/overrides?id=${id}`, {
        method: "DELETE",
      });
      await fetchReport();
    } catch {
      // silently fail
    }
  }

  // ---------- Payment ----------

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentAmount) return;
    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: Number(teamId),
          amount: Number(paymentAmount),
          method: paymentMethod,
          status: paymentStatus,
          reference: paymentReference || null,
          notes: paymentNotes || null,
          receivedAt: paymentDate || null,
        }),
      });
      if (res.ok) {
        setShowPaymentModal(false);
        resetPaymentForm();
        await fetchReport();
      }
    } finally {
      setSubmittingPayment(false);
    }
  }

  function resetPaymentForm() {
    setPaymentAmount("");
    setPaymentMethod("bank_transfer");
    setPaymentStatus("pending");
    setPaymentReference("");
    setPaymentNotes("");
    setPaymentDate(todayISO());
  }

  // ---------- Invite ----------

  async function handleCopyInvite() {
    if (!report?.club) return;
    try {
      const res = await fetch("/api/admin/generate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: report.club.id }),
      });
      const data = await res.json();
      if (data.inviteUrl) {
        await navigator.clipboard.writeText(data.inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // silently fail
    }
  }

  // ---------- Render ----------

  if (loading) return <Skeleton />;

  if (error || !report) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push(`/${locale}/admin/teams`)}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-navy transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </button>
        <Alert variant="error">{error ?? "Team not found"}</Alert>
      </div>
    );
  }

  const { team, club, class: teamClass, people, finance, payments, travel, overrides } = report;

  const players = people.all.filter((p) => p.personType === "player");
  const staff = people.all.filter((p) => p.personType === "staff");
  const accompanying = people.all.filter((p) => p.personType === "accompanying");

  const hasMedical = people.all.some((p) => p.allergies || p.dietaryRequirements);
  const allStatuses: TeamStatus[] = ["open", "confirmed", "cancelled"];

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <button
        onClick={() => router.push(`/${locale}/admin/teams`)}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-navy transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("teams.title")}
      </button>

      {/* ── Card 1: Team Info ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Club badge */}
              {club?.badgeUrl ? (
                <img
                  src={club.badgeUrl}
                  alt={club.name}
                  className="w-12 h-12 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center border border-border">
                  <Users className="w-6 h-6 text-text-secondary" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-text-primary">{team.name}</h1>
                  <Badge variant="gold">#{team.regNumber}</Badge>
                  <Badge variant={STATUS_BADGE[team.status]}>{team.status}</Badge>
                </div>
                {club && (
                  <p className="text-sm text-text-secondary mt-0.5">
                    {club.name}
                    {club.city ? ` · ${club.city}` : ""}
                    {club.country ? `, ${club.country}` : ""}
                  </p>
                )}
                {teamClass && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    Class: <span className="font-medium text-text-primary">{teamClass.name}</span>
                    {teamClass.minBirthYear || teamClass.maxBirthYear
                      ? ` (${teamClass.minBirthYear ?? ""}–${teamClass.maxBirthYear ?? ""})`
                      : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Status selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">Status:</span>
              <select
                value={team.status}
                onChange={(e) => handleStatusChange(e.target.value as TeamStatus)}
                disabled={savingStatus}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy appearance-none cursor-pointer disabled:opacity-50"
              >
                {allStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        {/* Admin notes */}
        <div className="mt-4 space-y-1.5">
          <label className="block text-sm font-medium text-text-primary">
            Admin Notes
            {savingNotes && (
              <span className="ml-2 text-xs text-text-secondary font-normal">Saving...</span>
            )}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            rows={3}
            placeholder="Internal notes about this team..."
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-y"
          />
        </div>
      </Card>

      {/* ── Row: Package + People ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Card 2: Package & Pricing ── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("services.packages")}</CardTitle>
          </CardHeader>

          {/* Current package */}
          <div className="mb-4">
            {report.package ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
                <div>
                  <p className="text-sm font-medium text-text-primary">{report.package.name}</p>
                  <p className="text-xs text-text-secondary">
                    Assigned {formatDate(report.package.assignedAt)}
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleRemovePackage}
                  disabled={assigningPackage}
                >
                  {t("services.removePackage")}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-text-secondary italic">No package assigned</p>
            )}
          </div>

          {/* Assign/change package */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
              {t("services.assignPackage")}
            </label>
            <div className="flex gap-2">
              <select
                value={selectedPackageId}
                onChange={(e) => setSelectedPackageId(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy appearance-none cursor-pointer"
              >
                <option value="">Select package...</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name}
                    {pkg.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleAssignPackage}
                disabled={!selectedPackageId || assigningPackage}
                size="sm"
              >
                {assigningPackage ? "..." : t("services.save")}
              </Button>
            </div>
          </div>

          {/* Overrides */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-text-primary">{t("services.overrides")}</h4>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAddOverride(!showAddOverride)}
              >
                <Plus className="w-3.5 h-3.5" />
                {t("services.addOption")}
              </Button>
            </div>

            {showAddOverride && (
              <form onSubmit={handleAddOverride} className="mb-4 p-3 rounded-lg border border-border bg-surface space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Service Type"
                    value={overrideServiceType}
                    onChange={(e) => setOverrideServiceType(e.target.value)}
                    placeholder="e.g. accommodation"
                    required
                  />
                  <Input
                    label="Service ID"
                    type="number"
                    value={overrideServiceId}
                    onChange={(e) => setOverrideServiceId(e.target.value)}
                    placeholder="ID"
                    required
                  />
                </div>
                <Input
                  label={t("services.customPrice")}
                  type="number"
                  step="0.01"
                  value={overrideCustomPrice}
                  onChange={(e) => setOverrideCustomPrice(e.target.value)}
                  placeholder="0.00"
                />
                <Input
                  label={t("services.reason")}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Reason for override"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setShowAddOverride(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" disabled={savingOverride}>
                    {savingOverride ? "Saving..." : t("services.save")}
                  </Button>
                </div>
              </form>
            )}

            {overrides.length === 0 ? (
              <p className="text-sm text-text-secondary italic">{t("services.noOptions")}</p>
            ) : (
              <div className="space-y-2">
                {overrides.map((ov) => (
                  <div
                    key={ov.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border text-sm"
                  >
                    <div>
                      <span className="font-medium text-text-primary capitalize">{ov.serviceType}</span>
                      <span className="text-text-secondary ml-1">#{ov.serviceId}</span>
                      {ov.customPrice && (
                        <span className="ml-2 text-navy font-medium">
                          {formatEuro(ov.customPrice)}
                        </span>
                      )}
                      {ov.isDisabled && (
                        <Badge variant="error" className="ml-2">Disabled</Badge>
                      )}
                      {ov.reason && (
                        <span className="text-xs text-text-secondary ml-2 italic">"{ov.reason}"</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveOverride(ov.id)}
                      className="text-text-secondary hover:text-error transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* ── Card 3: People ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>People</CardTitle>
              <div className="flex items-center gap-3 text-sm text-text-secondary">
                <span>{people.counts.players} players</span>
                <span>·</span>
                <span>{people.counts.staff} staff</span>
                {people.counts.accompanying > 0 && (
                  <>
                    <span>·</span>
                    <span>{people.counts.accompanying} accompanying</span>
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          {hasMedical && (
            <Alert variant="warning" className="mb-4">
              <span className="font-medium">Medical info:</span> Some members have allergies or dietary requirements — check player details below.
            </Alert>
          )}

          <div className="space-y-4">
            {/* Players */}
            {players.length > 0 && (
              <div>
                <SectionToggle
                  label="Players"
                  count={players.length}
                  open={showPlayers}
                  onToggle={() => setShowPlayers(!showPlayers)}
                />
                {showPlayers && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary">#</th>
                          <th className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary">Name</th>
                          <th className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary">DOB / Age</th>
                          <th className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary">Pos</th>
                          <th className="text-left pb-2 text-xs font-medium text-text-secondary">Hotel</th>
                          <th className="text-left pb-2 text-xs font-medium text-text-secondary">Transfer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((p, i) => (
                          <tr
                            key={p.id}
                            className={`border-b border-border last:border-0 ${
                              p.allergies || p.dietaryRequirements ? "bg-warning-light/40" : ""
                            }`}
                          >
                            <td className="py-2 pr-3 text-text-secondary">{i + 1}</td>
                            <td className="py-2 pr-3 font-medium text-text-primary">
                              {p.firstName} {p.lastName}
                              {(p.allergies || p.dietaryRequirements) && (
                                <AlertTriangle className="inline-block w-3 h-3 text-warning ml-1" />
                              )}
                            </td>
                            <td className="py-2 pr-3 text-text-secondary whitespace-nowrap">
                              {p.dateOfBirth ? (
                                <>
                                  <span>{formatDate(p.dateOfBirth)}</span>
                                  <span className="text-xs ml-1 opacity-60">({calcAge(p.dateOfBirth)})</span>
                                </>
                              ) : "-"}
                            </td>
                            <td className="py-2 pr-3 text-text-secondary">{p.position ?? "-"}</td>
                            <td className="py-2 pr-3 text-text-secondary text-xs">
                              {p.hotelOptionId ? `#${p.hotelOptionId}` : "-"}
                            </td>
                            <td className="py-2 text-text-secondary text-xs">
                              {p.transferOptionId ? `#${p.transferOptionId}` : "-"}
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
                <SectionToggle
                  label="Staff"
                  count={staff.length}
                  open={showStaff}
                  onToggle={() => setShowStaff(!showStaff)}
                />
                {showStaff && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary">Name</th>
                          <th className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary">Role</th>
                          <th className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary">Hotel</th>
                          <th className="text-left pb-2 text-xs font-medium text-text-secondary">Transfer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staff.map((p) => (
                          <tr key={p.id} className="border-b border-border last:border-0">
                            <td className="py-2 pr-3 font-medium text-text-primary">
                              {p.firstName} {p.lastName}
                              {p.isResponsible && (
                                <Badge variant="info" className="ml-2">Responsible</Badge>
                              )}
                            </td>
                            <td className="py-2 pr-3 text-text-secondary">{p.position ?? "-"}</td>
                            <td className="py-2 pr-3 text-text-secondary text-xs">
                              {p.hotelOptionId ? `#${p.hotelOptionId}` : "-"}
                            </td>
                            <td className="py-2 text-text-secondary text-xs">
                              {p.transferOptionId ? `#${p.transferOptionId}` : "-"}
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
                <SectionToggle
                  label="Accompanying"
                  count={accompanying.length}
                  open={showAccompanying}
                  onToggle={() => setShowAccompanying(!showAccompanying)}
                />
                {showAccompanying && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary">Name</th>
                          <th className="text-left pb-2 pr-3 text-xs font-medium text-text-secondary">Hotel</th>
                          <th className="text-left pb-2 text-xs font-medium text-text-secondary">Transfer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accompanying.map((p) => (
                          <tr key={p.id} className="border-b border-border last:border-0">
                            <td className="py-2 pr-3 font-medium text-text-primary">
                              {p.firstName} {p.lastName}
                            </td>
                            <td className="py-2 pr-3 text-text-secondary text-xs">
                              {p.hotelOptionId ? `#${p.hotelOptionId}` : "-"}
                            </td>
                            <td className="py-2 text-text-secondary text-xs">
                              {p.transferOptionId ? `#${p.transferOptionId}` : "-"}
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
      </div>

      {/* ── Card 4: Finance ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Finance</CardTitle>
            <Button onClick={() => setShowPaymentModal(true)}>
              <Plus className="w-4 h-4" />
              Add Payment
            </Button>
          </div>
        </CardHeader>

        {/* Finance summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl border border-border bg-surface/50">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Total Ordered</p>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {formatEuro(finance.totalFromBookings)}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Paid</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {formatEuro(finance.totalPaid)}
            </p>
          </div>
          <div className={`p-4 rounded-xl border ${
            finance.balance >= 0
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Balance</p>
            <p className={`text-2xl font-bold mt-1 ${
              finance.balance >= 0 ? "text-emerald-600" : "text-red-600"
            }`}>
              {finance.balance >= 0 ? "" : "-"}{formatEuro(Math.abs(finance.balance))}
            </p>
          </div>
        </div>

        {/* Payment history */}
        {payments.length === 0 ? (
          <p className="text-sm text-text-secondary italic">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-3 pr-4 text-xs font-medium text-text-secondary uppercase">Date</th>
                  <th className="text-right pb-3 pr-4 text-xs font-medium text-text-secondary uppercase">Amount</th>
                  <th className="text-left pb-3 pr-4 text-xs font-medium text-text-secondary uppercase">Method</th>
                  <th className="text-left pb-3 pr-4 text-xs font-medium text-text-secondary uppercase">Status</th>
                  <th className="text-left pb-3 pr-4 text-xs font-medium text-text-secondary uppercase">Reference</th>
                  <th className="text-left pb-3 text-xs font-medium text-text-secondary uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface/40">
                    <td className="py-3 pr-4 whitespace-nowrap text-text-secondary">
                      {formatDate(p.receivedAt ?? p.createdAt)}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium tabular-nums text-text-primary">
                      {formatEuro(p.amount)}
                    </td>
                    <td className="py-3 pr-4 text-text-secondary">
                      {METHOD_LABELS[p.method] ?? p.method}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={PAYMENT_STATUS_BADGE[p.status] ?? "default"}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-text-secondary">{p.reference ?? "-"}</td>
                    <td className="py-3 text-text-secondary max-w-[200px] truncate">
                      {p.notes ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Card 5: Travel ── */}
      <Card>
        <CardHeader>
          <CardTitle>Travel</CardTitle>
        </CardHeader>

        {!travel || (!travel.arrivalType && !travel.departureType) ? (
          <p className="text-sm text-text-secondary italic">No travel info provided.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Arrival */}
            <div>
              <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Arrival</h4>
              {travel.arrivalType ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    {travel.arrivalType && TRAVEL_ICONS[travel.arrivalType.toLowerCase()] ? (
                      TRAVEL_ICONS[travel.arrivalType.toLowerCase()]
                    ) : (
                      <Plane className="w-4 h-4" />
                    )}
                    <span className="capitalize">{travel.arrivalType}</span>
                  </div>
                  {travel.arrivalDate && (
                    <p className="text-sm text-text-secondary">
                      {formatDate(travel.arrivalDate)}
                      {travel.arrivalTime && ` at ${travel.arrivalTime}`}
                    </p>
                  )}
                  {travel.arrivalDetails && (
                    <p className="text-sm text-text-secondary">{travel.arrivalDetails}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-secondary italic">Not specified</p>
              )}
            </div>

            {/* Departure */}
            <div>
              <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Departure</h4>
              {travel.departureType ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    {travel.departureType && TRAVEL_ICONS[travel.departureType.toLowerCase()] ? (
                      TRAVEL_ICONS[travel.departureType.toLowerCase()]
                    ) : (
                      <Plane className="w-4 h-4" />
                    )}
                    <span className="capitalize">{travel.departureType}</span>
                  </div>
                  {travel.departureDate && (
                    <p className="text-sm text-text-secondary">
                      {formatDate(travel.departureDate)}
                      {travel.departureTime && ` at ${travel.departureTime}`}
                    </p>
                  )}
                  {travel.departureDetails && (
                    <p className="text-sm text-text-secondary">{travel.departureDetails}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-secondary italic">Not specified</p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ── Card 6: Quick Actions ── */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push(`/${locale}/admin/messages`)}
          >
            <MessageSquare className="w-4 h-4" />
            {t("messages.compose")}
          </Button>
          <Button
            variant="secondary"
            onClick={handleCopyInvite}
            disabled={!club}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-success" />
                <span className="text-success">{t("teams.copied")}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                {t("teams.copyLink")}
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* ── Add Payment Modal ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add Payment</CardTitle>
                <button
                  onClick={() => { setShowPaymentModal(false); resetPaymentForm(); }}
                  className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </CardHeader>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <Input
                label="Amount (EUR)"
                type="number"
                step="0.01"
                min="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
                placeholder="0.00"
              />
              <Select
                label="Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={[
                  { value: "bank_transfer", label: "Bank Transfer" },
                  { value: "cash", label: "Cash" },
                  { value: "stripe", label: "Stripe" },
                ]}
              />
              <Select
                label="Status"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "received", label: "Received" },
                ]}
              />
              <Input
                label="Reference (optional)"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. invoice number"
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">
                  Notes (optional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  placeholder="Additional notes..."
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-y"
                />
              </div>
              <Input
                label="Date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => { setShowPaymentModal(false); resetPaymentForm(); }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingPayment}>
                  {submittingPayment ? "Adding..." : "Add Payment"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
