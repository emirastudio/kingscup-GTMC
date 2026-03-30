"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Crown, ChevronRight, ChevronLeft, Check, Plus, Trash2, ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type TournamentClass = { id: number; name: string; minBirthYear: number | null };
type TeamEntry = { name: string; classId: string };

const STEPS = ["club", "teams", "contact", "review"] as const;
type Step = (typeof STEPS)[number];

export default function RegisterPage() {
  const t = useTranslations("register");
  const tc = useTranslations("common");
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("club");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState<TournamentClass[]>([]);

  // Club info
  const [clubName, setClubName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Teams list
  const [teamsList, setTeamsList] = useState<TeamEntry[]>([{ name: "", classId: "" }]);

  // Contact
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    fetch("/api/tournaments/active").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes ?? []);
      }
    });
  }, []);

  const stepIndex = STEPS.indexOf(step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const contactRoles = [
    { value: "manager", label: t("contact.roles.manager") },
    { value: "headCoach", label: t("contact.roles.headCoach") },
    { value: "assistant", label: t("contact.roles.assistant") },
    { value: "president", label: t("contact.roles.president") },
    { value: "other", label: t("contact.roles.other") },
  ];

  function next() {
    setError("");
    if (step === "club" && !clubName.trim()) { setError(t("errors.clubNameRequired")); return; }
    if (step === "club" && !country.trim()) { setError(t("errors.countryRequired")); return; }
    if (step === "teams") {
      for (const tm of teamsList) {
        if (!tm.name.trim()) { setError(t("errors.teamNameRequired")); return; }
        if (!tm.classId) { setError(t("errors.ageClassRequired")); return; }
      }
    }
    if (step === "contact") {
      if (!contactName.trim()) { setError(t("errors.contactNameRequired")); return; }
      if (!contactEmail.trim()) { setError(t("errors.emailRequired")); return; }
      if (!password) { setError(t("errors.passwordRequired")); return; }
      if (password.length < 6) { setError(t("errors.passwordTooShort")); return; }
      if (password !== passwordConfirm) { setError(t("errors.passwordMismatch")); return; }
    }
    if (!isLast) setStep(STEPS[stepIndex + 1]);
  }

  function prev() {
    setError("");
    if (!isFirst) setStep(STEPS[stepIndex - 1]);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  }

  function addTeam() {
    setTeamsList([...teamsList, { name: "", classId: "" }]);
  }

  function removeTeam(i: number) {
    setTeamsList(teamsList.filter((_, idx) => idx !== i));
  }

  function updateTeam(i: number, field: keyof TeamEntry, value: string) {
    setTeamsList(teamsList.map((tm, idx) => idx === i ? { ...tm, [field]: value } : tm));
  }

  function getClassName(classId: string) {
    const cls = classes.find((c) => String(c.id) === classId);
    return cls ? cls.name : classId;
  }

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("clubName", clubName);
      fd.append("country", country);
      fd.append("city", city);
      fd.append("contactName", contactName);
      fd.append("contactEmail", contactEmail);
      fd.append("contactPhone", contactPhone);
      fd.append("contactRole", contactRole);
      fd.append("password", password);
      fd.append("teams", JSON.stringify(teamsList));
      if (logoFile) fd.append("logo", logoFile);

      const res = await fetch("/api/clubs/register", { method: "POST", body: fd });
      if (res.ok) {
        router.push("/team/overview");
      } else {
        const data = await res.json();
        setError(data.error ?? t("errors.registrationFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const classOptions = classes.map((c) => ({
    value: String(c.id),
    label: c.minBirthYear ? `${c.name} (born ${c.minBirthYear}+)` : c.name,
  }));

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-3">
          <Crown className="w-8 h-8 text-gold" />
          <div>
            <h1 className="text-lg font-bold text-navy">{t("title")}</h1>
            <p className="text-sm text-text-secondary">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Step indicators */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                i < stepIndex ? "bg-success text-white" :
                i === stepIndex ? "bg-navy text-white shadow-md" :
                "bg-border text-text-secondary"
              )}>
                {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn(
                "text-sm font-medium hidden sm:inline",
                i === stepIndex ? "text-navy" : "text-text-secondary"
              )}>
                {t(`steps.${s}`)}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn("w-6 h-0.5 mx-1", i < stepIndex ? "bg-success" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <Card className="p-8">
          {/* ── STEP 1: Club ── */}
          {step === "club" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-text-primary">{t("club.title")}</h2>
                <p className="text-sm text-text-secondary mt-1">{t("club.description")}</p>
              </div>

              <Input id="clubName" label={t("club.name")} value={clubName}
                onChange={(e) => setClubName(e.target.value)} placeholder={t("club.namePlaceholder")} required />

              <div className="grid grid-cols-2 gap-4">
                <Input id="country" label={t("club.country")} value={country}
                  onChange={(e) => setCountry(e.target.value)} placeholder={t("club.countryPlaceholder")} required />
                <Input id="city" label={t("club.city")} value={city}
                  onChange={(e) => setCity(e.target.value)} placeholder={t("club.cityPlaceholder")} />
              </div>

              {/* Logo upload */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">
                  {t("club.badge")} <span className="text-text-secondary font-normal">{t("club.badgeOptional")}</span>
                </label>
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-navy/40 hover:bg-surface/50 transition-colors cursor-pointer"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="w-20 h-20 object-contain mx-auto rounded-lg" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
                      <p className="text-sm text-text-secondary">
                        <span className="text-navy font-medium">{t("club.uploadLogo")}</span> {t("club.dragDrop")}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">{t("club.fileTypes")}</p>
                    </>
                  )}
                  {logoFile && <p className="text-xs text-navy mt-2 font-medium">{logoFile.name}</p>}
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </div>
            </div>
          )}

          {/* ── STEP 2: Teams ── */}
          {step === "teams" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-text-primary">{t("teams.title")}</h2>
                <p className="text-sm text-text-secondary mt-1">{t("teams.description")}</p>
              </div>

              <div className="space-y-4">
                {teamsList.map((team, i) => (
                  <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-navy">{t("teams.teamLabel", { n: i + 1 })}</p>
                      {teamsList.length > 1 && (
                        <button onClick={() => removeTeam(i)} className="text-text-secondary hover:text-error cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <Input
                      id={`teamName-${i}`}
                      label={t("teams.teamName")}
                      value={team.name}
                      onChange={(e) => updateTeam(i, "name", e.target.value)}
                      placeholder={t("teams.teamNamePlaceholder", { club: clubName || "FC Club" })}
                      required
                    />
                    <Select
                      id={`classId-${i}`}
                      label={t("teams.ageClass")}
                      value={team.classId}
                      onChange={(e) => updateTeam(i, "classId", e.target.value)}
                      options={classOptions}
                      placeholder={t("teams.selectAgeClass")}
                    />
                  </div>
                ))}
              </div>

              <Button variant="ghost" onClick={addTeam} className="w-full border border-dashed border-border">
                <Plus className="w-4 h-4" />
                {t("teams.addAnother")}
              </Button>
            </div>
          )}

          {/* ── STEP 3: Contact ── */}
          {step === "contact" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-text-primary">{t("contact.title")}</h2>
                <p className="text-sm text-text-secondary mt-1">{t("contact.description")}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input id="contactName" label={t("contact.fullName")} value={contactName}
                  onChange={(e) => setContactName(e.target.value)} required />
                <Select id="contactRole" label={t("contact.role")} value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  options={contactRoles} placeholder={t("contact.selectRole")} />
              </div>

              <Input id="contactEmail" label={t("contact.email")} type="email" value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)} required />

              <Input id="contactPhone" label={t("contact.phone")} type="tel" value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)} />

              <div className="border-t border-border pt-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  {t("contact.passwordSection")}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Input id="password" label={t("contact.password")} type="password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("contact.passwordPlaceholder")} required />
                  <Input id="passwordConfirm" label={t("contact.confirmPassword")} type="password" value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)} required />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Review ── */}
          {step === "review" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-text-primary">{t("review.title")}</h2>
                <p className="text-sm text-text-secondary mt-1">{t("review.description")}</p>
              </div>

              <div className="space-y-3">
                {/* Club */}
                <div className="rounded-xl bg-surface p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{t("review.club")}</p>
                  <div className="flex items-center gap-3">
                    {logoPreview && (
                      <img src={logoPreview} alt="badge" className="w-10 h-10 object-contain rounded" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{clubName}</p>
                      <p className="text-sm text-text-secondary">{city}{city && country ? ", " : ""}{country}</p>
                    </div>
                  </div>
                </div>

                {/* Teams */}
                <div className="rounded-xl bg-surface p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    {t("review.teams")} ({teamsList.length})
                  </p>
                  {teamsList.map((tm, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <p className="text-sm font-medium">{tm.name}</p>
                      <p className="text-sm text-text-secondary">{getClassName(tm.classId)}</p>
                    </div>
                  ))}
                </div>

                {/* Contact */}
                <div className="rounded-xl bg-surface p-4 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{t("review.contact")}</p>
                  <p className="text-sm font-medium">{contactName}
                    {contactRole && <span className="text-text-secondary font-normal ml-2">
                      · {contactRoles.find(r => r.value === contactRole)?.label}
                    </span>}
                  </p>
                  <p className="text-sm text-text-secondary">{contactEmail}</p>
                  {contactPhone && <p className="text-sm text-text-secondary">{contactPhone}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button variant="ghost" onClick={prev} disabled={isFirst}>
              <ChevronLeft className="w-4 h-4" /> {tc("back")}
            </Button>

            {isLast ? (
              <Button variant="gold" size="lg" disabled={submitting} onClick={handleSubmit}>
                {submitting ? t("submitting") : t("submit")}
              </Button>
            ) : (
              <Button onClick={next}>
                {t("next")} <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
