"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Hotel,
  UtensilsCrossed,
  Car,
  BadgeDollarSign,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
} from "lucide-react";

/* ─────────────────────────────────────────── types */

interface AccommodationOption {
  id: number;
  name: string;
  nameRu: string;
  checkIn: string;
  checkOut: string;
  pricePerPlayer: string;
  pricePerStaff: string;
  pricePerAccompanying: string;
  includedMealsPerDay: number;
  mealNote: string | null;
  mealNoteRu: string | null;
}

interface MealOption {
  id: number;
  name: string;
  nameRu: string;
  description: string | null;
  descriptionRu: string | null;
  pricePerPerson: string;
  perDay: boolean;
}

interface TransferOption {
  id: number;
  name: string;
  nameRu: string;
  description: string | null;
  descriptionRu: string | null;
  pricePerPerson: string;
}

interface RegistrationFee {
  id?: number;
  name: string;
  nameRu: string;
  price: string;
  isRequired: boolean;
}

type Tab = "accommodation" | "meals" | "transfers" | "registration";

/* ─────────────────────────────────────────── helpers */

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatPrice(val: string | number | null): string {
  if (val === null || val === undefined || val === "") return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return `€${n.toFixed(2)}`;
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

/* ─────────────────────────────────────────── sub-components */

function SectionTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
        active
          ? "bg-navy text-white"
          : "bg-white text-text-secondary hover:bg-surface border border-border"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function SavedBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
      <Check className="w-3.5 h-3.5" />
      Saved!
    </span>
  );
}

function DeleteConfirm({
  onConfirm,
  onCancel,
  label,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onConfirm}
        className="text-xs text-error font-medium cursor-pointer hover:underline"
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs text-text-secondary cursor-pointer hover:underline"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════ ACCOMMODATION TAB */

function AccommodationTab() {
  const t = useTranslations("admin.services");
  const [items, setItems] = useState<AccommodationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | "new" | null>(null);

  const emptyForm = {
    name: "",
    nameRu: "",
    checkIn: "",
    checkOut: "",
    pricePerPlayer: "",
    pricePerStaff: "",
    pricePerAccompanying: "",
    includedMealsPerDay: 0,
    mealNote: "",
    mealNoteRu: "",
  };

  const [form, setForm] = useState(emptyForm);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/services/accommodation");
      if (!res.ok) throw new Error("Failed to load");
      setItems(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const openNew = () => {
    setForm(emptyForm);
    setEditId("new");
  };

  const openEdit = (item: AccommodationOption) => {
    setForm({
      name: item.name,
      nameRu: item.nameRu,
      checkIn: toDateInput(item.checkIn),
      checkOut: toDateInput(item.checkOut),
      pricePerPlayer: item.pricePerPlayer,
      pricePerStaff: item.pricePerStaff,
      pricePerAccompanying: item.pricePerAccompanying,
      includedMealsPerDay: item.includedMealsPerDay,
      mealNote: item.mealNote ?? "",
      mealNoteRu: item.mealNoteRu ?? "",
    });
    setEditId(item.id);
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(emptyForm);
  };

  const saveForm = async () => {
    setSaving(true);
    setError(null);
    try {
      const isNew = editId === "new";
      const res = await fetch(
        isNew
          ? "/api/admin/services/accommodation"
          : `/api/admin/services/accommodation/${editId}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      await fetch_();
      setEditId(null);
      setForm(emptyForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/services/accommodation/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteId(null);
      await fetch_();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const setField = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <Card padding={false}>
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle>{t("accommodation")}</CardTitle>
          <SavedBadge visible={saved} />
        </div>
        {editId === null && (
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4" />
            {t("addOption")}
          </Button>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Inline form */}
      {editId !== null && (
        <div className="p-6 border-b border-border bg-surface/40">
          <p className="text-sm font-semibold text-text-primary mb-4">
            {editId === "new" ? t("addOption") : t("save")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              id="acc-name"
              label={t("name")}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
            <Input
              id="acc-nameRu"
              label={t("nameRu")}
              value={form.nameRu}
              onChange={(e) => setField("nameRu", e.target.value)}
            />
            <Input
              id="acc-checkIn"
              label={t("checkIn")}
              type="date"
              value={form.checkIn}
              onChange={(e) => setField("checkIn", e.target.value)}
            />
            <Input
              id="acc-checkOut"
              label={t("checkOut")}
              type="date"
              value={form.checkOut}
              onChange={(e) => setField("checkOut", e.target.value)}
            />
            <Input
              id="acc-pricePlayer"
              label={t("pricePerPlayer")}
              type="number"
              step="0.01"
              value={form.pricePerPlayer}
              onChange={(e) => setField("pricePerPlayer", e.target.value)}
            />
            <Input
              id="acc-priceStaff"
              label={t("pricePerStaff")}
              type="number"
              step="0.01"
              value={form.pricePerStaff}
              onChange={(e) => setField("pricePerStaff", e.target.value)}
            />
            <Input
              id="acc-priceAccomp"
              label={t("pricePerAccompanying")}
              type="number"
              step="0.01"
              value={form.pricePerAccompanying}
              onChange={(e) =>
                setField("pricePerAccompanying", e.target.value)
              }
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                {t("includedMeals")}
              </label>
              <input
                type="number"
                min="0"
                max="3"
                value={form.includedMealsPerDay}
                onChange={(e) =>
                  setField("includedMealsPerDay", Number(e.target.value))
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
            <Input
              id="acc-mealNote"
              label={t("mealNote")}
              value={form.mealNote}
              onChange={(e) => setField("mealNote", e.target.value)}
            />
            <Input
              id="acc-mealNoteRu"
              label={t("mealNoteRu")}
              value={form.mealNoteRu}
              onChange={(e) => setField("mealNoteRu", e.target.value)}
            />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={saveForm} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t("save")}
            </Button>
            <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                {[
                  t("name"),
                  t("nameRu"),
                  t("checkIn"),
                  t("checkOut"),
                  t("pricePerPlayer"),
                  t("pricePerStaff"),
                  t("pricePerAccompanying"),
                  t("includedMeals"),
                  "",
                ].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-xs font-medium text-text-secondary uppercase whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0 hover:bg-surface/50"
                >
                  <td className="px-4 py-3 text-sm text-text-primary font-medium">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {item.nameRu}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                    {formatDate(item.checkIn)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                    {formatDate(item.checkOut)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                    {formatPrice(item.pricePerPlayer)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                    {formatPrice(item.pricePerStaff)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                    {formatPrice(item.pricePerAccompanying)}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary text-center">
                    {item.includedMealsPerDay}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {deleteId === item.id ? (
                        <DeleteConfirm
                          label={t("confirmDelete")}
                          onConfirm={() => doDelete(item.id)}
                          onCancel={() => setDeleteId(null)}
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="text-text-secondary hover:text-navy transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            className="text-text-secondary hover:text-error transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !editId && (
          <div className="text-center py-12 text-text-secondary text-sm">
            <Hotel className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {t("noOptions")}
          </div>
        )
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════ MEALS TAB */

function MealsTab() {
  const t = useTranslations("admin.services");
  const [items, setItems] = useState<MealOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | "new" | null>(null);

  const emptyForm = {
    name: "",
    nameRu: "",
    description: "",
    descriptionRu: "",
    pricePerPerson: "",
    perDay: false,
  };
  const [form, setForm] = useState(emptyForm);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/services/meals");
      if (!res.ok) throw new Error("Failed to load");
      setItems(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const openNew = () => {
    setForm(emptyForm);
    setEditId("new");
  };

  const openEdit = (item: MealOption) => {
    setForm({
      name: item.name,
      nameRu: item.nameRu,
      description: item.description ?? "",
      descriptionRu: item.descriptionRu ?? "",
      pricePerPerson: item.pricePerPerson,
      perDay: item.perDay,
    });
    setEditId(item.id);
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(emptyForm);
  };

  const saveForm = async () => {
    setSaving(true);
    setError(null);
    try {
      const isNew = editId === "new";
      const res = await fetch(
        isNew ? "/api/admin/services/meals" : `/api/admin/services/meals/${editId}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      await fetch_();
      setEditId(null);
      setForm(emptyForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/services/meals/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteId(null);
      await fetch_();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const setField = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <Card padding={false}>
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle>{t("meals")}</CardTitle>
          <SavedBadge visible={saved} />
        </div>
        {editId === null && (
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4" />
            {t("addOption")}
          </Button>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {editId !== null && (
        <div className="p-6 border-b border-border bg-surface/40">
          <p className="text-sm font-semibold text-text-primary mb-4">
            {editId === "new" ? t("addOption") : t("save")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="meal-name"
              label={t("name")}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
            <Input
              id="meal-nameRu"
              label={t("nameRu")}
              value={form.nameRu}
              onChange={(e) => setField("nameRu", e.target.value)}
            />
            <Input
              id="meal-desc"
              label={t("description")}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
            />
            <Input
              id="meal-descRu"
              label={t("descriptionRu")}
              value={form.descriptionRu}
              onChange={(e) => setField("descriptionRu", e.target.value)}
            />
            <Input
              id="meal-price"
              label={t("pricePerPerson")}
              type="number"
              step="0.01"
              value={form.pricePerPerson}
              onChange={(e) => setField("pricePerPerson", e.target.value)}
            />
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="meal-perDay"
                checked={form.perDay}
                onChange={(e) => setField("perDay", e.target.checked)}
                className="accent-navy w-4 h-4"
              />
              <label
                htmlFor="meal-perDay"
                className="text-sm font-medium text-text-primary cursor-pointer"
              >
                {t("perDay")}
              </label>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={saveForm} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t("save")}
            </Button>
            <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                {[t("name"), t("nameRu"), t("pricePerPerson"), t("perDay"), ""].map(
                  (h, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-xs font-medium text-text-secondary uppercase whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0 hover:bg-surface/50"
                >
                  <td className="px-4 py-3 text-sm text-text-primary font-medium">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {item.nameRu}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                    {formatPrice(item.pricePerPerson)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.perDay ? (
                      <Check className="w-4 h-4 text-green-600 mx-auto" />
                    ) : (
                      <span className="text-text-secondary/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {deleteId === item.id ? (
                        <DeleteConfirm
                          label={t("confirmDelete")}
                          onConfirm={() => doDelete(item.id)}
                          onCancel={() => setDeleteId(null)}
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="text-text-secondary hover:text-navy transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            className="text-text-secondary hover:text-error transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !editId && (
          <div className="text-center py-12 text-text-secondary text-sm">
            <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {t("noOptions")}
          </div>
        )
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════ TRANSFERS TAB */

function TransfersTab() {
  const t = useTranslations("admin.services");
  const [items, setItems] = useState<TransferOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | "new" | null>(null);

  const emptyForm = {
    name: "",
    nameRu: "",
    description: "",
    descriptionRu: "",
    pricePerPerson: "",
  };
  const [form, setForm] = useState(emptyForm);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/services/transfers");
      if (!res.ok) throw new Error("Failed to load");
      setItems(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const openNew = () => {
    setForm(emptyForm);
    setEditId("new");
  };

  const openEdit = (item: TransferOption) => {
    setForm({
      name: item.name,
      nameRu: item.nameRu,
      description: item.description ?? "",
      descriptionRu: item.descriptionRu ?? "",
      pricePerPerson: item.pricePerPerson,
    });
    setEditId(item.id);
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(emptyForm);
  };

  const saveForm = async () => {
    setSaving(true);
    setError(null);
    try {
      const isNew = editId === "new";
      const res = await fetch(
        isNew
          ? "/api/admin/services/transfers"
          : `/api/admin/services/transfers/${editId}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      await fetch_();
      setEditId(null);
      setForm(emptyForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/services/transfers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteId(null);
      await fetch_();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const setField = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <Card padding={false}>
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle>{t("transfers")}</CardTitle>
          <SavedBadge visible={saved} />
        </div>
        {editId === null && (
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4" />
            {t("addOption")}
          </Button>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {editId !== null && (
        <div className="p-6 border-b border-border bg-surface/40">
          <p className="text-sm font-semibold text-text-primary mb-4">
            {editId === "new" ? t("addOption") : t("save")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="tr-name"
              label={t("name")}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
            <Input
              id="tr-nameRu"
              label={t("nameRu")}
              value={form.nameRu}
              onChange={(e) => setField("nameRu", e.target.value)}
            />
            <Input
              id="tr-desc"
              label={t("description")}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
            />
            <Input
              id="tr-descRu"
              label={t("descriptionRu")}
              value={form.descriptionRu}
              onChange={(e) => setField("descriptionRu", e.target.value)}
            />
            <Input
              id="tr-price"
              label={t("pricePerPerson")}
              type="number"
              step="0.01"
              value={form.pricePerPerson}
              onChange={(e) => setField("pricePerPerson", e.target.value)}
            />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={saveForm} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t("save")}
            </Button>
            <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                {[
                  t("name"),
                  t("nameRu"),
                  t("description"),
                  t("pricePerPerson"),
                  "",
                ].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-xs font-medium text-text-secondary uppercase whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0 hover:bg-surface/50"
                >
                  <td className="px-4 py-3 text-sm text-text-primary font-medium">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {item.nameRu}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary max-w-xs truncate">
                    {item.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                    {formatPrice(item.pricePerPerson)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {deleteId === item.id ? (
                        <DeleteConfirm
                          label={t("confirmDelete")}
                          onConfirm={() => doDelete(item.id)}
                          onCancel={() => setDeleteId(null)}
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="text-text-secondary hover:text-navy transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            className="text-text-secondary hover:text-error transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !editId && (
          <div className="text-center py-12 text-text-secondary text-sm">
            <Car className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {t("noOptions")}
          </div>
        )
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════ REGISTRATION FEE TAB */

function RegistrationTab() {
  const t = useTranslations("admin.services");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    nameRu: "",
    price: "",
    isRequired: true,
  });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/services/registration");
      if (!res.ok) throw new Error("Failed to load");
      const data: RegistrationFee = await res.json();
      setForm({
        name: data.name ?? "",
        nameRu: data.nameRu ?? "",
        price: data.price ?? "",
        isRequired: data.isRequired ?? true,
      });
    } catch {
      // No existing record is OK — keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const saveForm = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/services/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const setField = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <CardTitle>{t("registration")}</CardTitle>
        <SavedBadge visible={saved} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-xl">
        <Input
          id="reg-name"
          label={t("name")}
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
        />
        <Input
          id="reg-nameRu"
          label={t("nameRu")}
          value={form.nameRu}
          onChange={(e) => setField("nameRu", e.target.value)}
        />
        <Input
          id="reg-price"
          label={t("price")}
          type="number"
          step="0.01"
          value={form.price}
          onChange={(e) => setField("price", e.target.value)}
        />
        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            id="reg-required"
            checked={form.isRequired}
            onChange={(e) => setField("isRequired", e.target.checked)}
            className="accent-navy w-4 h-4"
          />
          <label
            htmlFor="reg-required"
            className="text-sm font-medium text-text-primary cursor-pointer"
          >
            {t("required")}
          </label>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={saveForm} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {t("save")}
        </Button>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════ PAGE */

export default function AdminServicesPage() {
  const t = useTranslations("admin.services");
  const [tab, setTab] = useState<Tab>("accommodation");

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        <SectionTab
          active={tab === "accommodation"}
          onClick={() => setTab("accommodation")}
          icon={Hotel}
          label={t("accommodation")}
        />
        <SectionTab
          active={tab === "meals"}
          onClick={() => setTab("meals")}
          icon={UtensilsCrossed}
          label={t("meals")}
        />
        <SectionTab
          active={tab === "transfers"}
          onClick={() => setTab("transfers")}
          icon={Car}
          label={t("transfers")}
        />
        <SectionTab
          active={tab === "registration"}
          onClick={() => setTab("registration")}
          icon={BadgeDollarSign}
          label={t("registration")}
        />
      </div>

      {/* Tab content */}
      {tab === "accommodation" && <AccommodationTab />}
      {tab === "meals" && <MealsTab />}
      {tab === "transfers" && <TransfersTab />}
      {tab === "registration" && <RegistrationTab />}
    </div>
  );
}
