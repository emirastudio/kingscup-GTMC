"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trophy,
  GraduationCap,
  ShoppingBag,
  Plus,
  Trash2,
  Save,
  Loader2,
  Check,
} from "lucide-react";

/* ────────────────────────────────────────────────── types */

interface TournamentClass {
  id?: number;
  name: string;
  minBirthYear: number | null;
  maxPlayers: number | null;
  maxStaff: number | null;
  _deleted?: boolean;
}

interface TournamentProduct {
  id?: number;
  name: string;
  category: string;
  price: string;
  perPerson: boolean;
  isRequired: boolean;
  sortOrder: number;
  _deleted?: boolean;
}

interface TournamentData {
  id: number;
  name: string;
  year: number;
  startDate: string | null;
  endDate: string | null;
  registrationDeadline: string | null;
  registrationOpen: boolean;
  currency: string;
  classes: TournamentClass[];
  products: TournamentProduct[];
}

type Tab = "general" | "classes" | "products";

const CATEGORIES = [
  "registration",
  "accommodation",
  "transfer",
  "meals",
  "extra",
];

/* ────────────────────────────────────────── helpers */

function toDateInput(val: string | null): string {
  if (!val) return "";
  return val.slice(0, 10);
}

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

function SaveButton({
  saving,
  saved,
  onClick,
}: {
  saving: boolean;
  saved: boolean;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} disabled={saving}>
      {saving ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : saved ? (
        <Check className="w-4 h-4" />
      ) : (
        <Save className="w-4 h-4" />
      )}
      {saving ? "Saving..." : saved ? "Saved" : "Save"}
    </Button>
  );
}

/* ────────────────────────────────────────── page */

export default function AdminTournamentsPage() {
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* form state */
  const [name, setName] = useState("");
  const [year, setYear] = useState<number>(2026);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [regDeadline, setRegDeadline] = useState("");
  const [regOpen, setRegOpen] = useState(false);
  const [currency, setCurrency] = useState("EUR");

  const [classes, setClasses] = useState<TournamentClass[]>([]);
  const [products, setProducts] = useState<TournamentProduct[]>([]);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "class" | "product";
    idx: number;
  } | null>(null);

  /* ─── fetch ─── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tournaments");
      if (!res.ok) throw new Error("Failed to load tournament data");
      const d: TournamentData = await res.json();
      setData(d);
      setName(d.name);
      setYear(d.year);
      setStartDate(toDateInput(d.startDate));
      setEndDate(toDateInput(d.endDate));
      setRegDeadline(toDateInput(d.registrationDeadline));
      setRegOpen(d.registrationOpen);
      setCurrency(d.currency);
      setClasses(d.classes ?? []);
      setProducts(d.products ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── save ─── */
  const save = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/tournaments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated: TournamentData = await res.json();
      setData(updated);
      setClasses(updated.classes ?? []);
      setProducts(updated.products ?? []);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveGeneral = () =>
    save({
      name,
      year,
      startDate: startDate || null,
      endDate: endDate || null,
      registrationDeadline: regDeadline || null,
      registrationOpen: regOpen,
      currency,
    });

  const saveClasses = () =>
    save({
      classes: classes.filter((c) => !c._deleted),
    });

  const saveProducts = () =>
    save({
      products: products
        .filter((p) => !p._deleted)
        .map((p, i) => ({ ...p, sortOrder: i })),
    });

  /* ─── class mutations ─── */
  const addClass = () =>
    setClasses((prev) => [
      ...prev,
      { name: "", minBirthYear: null, maxPlayers: 25, maxStaff: 5 },
    ]);

  const updateClass = (idx: number, field: string, value: unknown) =>
    setClasses((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );

  const deleteClass = (idx: number) => {
    if (classes[idx].id) {
      // Mark existing for server-side handling
      setClasses((prev) =>
        prev.map((c, i) => (i === idx ? { ...c, _deleted: true } : c))
      );
    } else {
      setClasses((prev) => prev.filter((_, i) => i !== idx));
    }
    setDeleteConfirm(null);
  };

  /* ─── product mutations ─── */
  const addProduct = () =>
    setProducts((prev) => [
      ...prev,
      {
        name: "",
        category: "registration",
        price: "0",
        perPerson: false,
        isRequired: false,
        sortOrder: prev.length,
      },
    ]);

  const updateProduct = (idx: number, field: string, value: unknown) =>
    setProducts((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );

  const deleteProduct = (idx: number) => {
    if (products[idx].id) {
      setProducts((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, _deleted: true } : p))
      );
    } else {
      setProducts((prev) => prev.filter((_, i) => i !== idx));
    }
    setDeleteConfirm(null);
  };

  /* ─── render ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-navy" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">
          Tournament Management
        </h1>
        <Card>
          <p className="text-error text-sm">{error}</p>
          <Button onClick={fetchData} className="mt-4" variant="secondary">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const visibleClasses = classes.filter((c) => !c._deleted);
  const visibleProducts = products.filter((p) => !p._deleted);

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-text-primary">
        Tournament Management
      </h1>

      {error && (
        <div className="rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <SectionTab
          active={tab === "general"}
          onClick={() => setTab("general")}
          icon={Trophy}
          label="General Settings"
        />
        <SectionTab
          active={tab === "classes"}
          onClick={() => setTab("classes")}
          icon={GraduationCap}
          label="Classes"
        />
        <SectionTab
          active={tab === "products"}
          onClick={() => setTab("products")}
          icon={ShoppingBag}
          label="Products & Prices"
        />
      </div>

      {/* ─── General Settings ─── */}
      {tab === "general" && (
        <Card>
          <CardTitle>General Settings</CardTitle>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              id="name"
              label="Tournament name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              id="year"
              label="Year"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
            <Input
              id="startDate"
              label="Start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              id="endDate"
              label="End date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Input
              id="regDeadline"
              label="Registration deadline"
              type="date"
              value={regDeadline}
              onChange={(e) => setRegDeadline(e.target.value)}
            />
            <div className="space-y-1.5">
              <label
                htmlFor="currency"
                className="block text-sm font-medium text-text-primary"
              >
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="SEK">SEK</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="flex items-center gap-3 text-sm font-medium text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={regOpen}
                onChange={(e) => setRegOpen(e.target.checked)}
                className="accent-navy w-4 h-4"
              />
              Registration open
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <SaveButton saving={saving} saved={saved} onClick={saveGeneral} />
          </div>
        </Card>
      )}

      {/* ─── Classes ─── */}
      {tab === "classes" && (
        <Card padding={false}>
          <div className="p-6 border-b border-border flex items-center justify-between">
            <CardTitle>Age Classes</CardTitle>
            <Button size="sm" onClick={addClass}>
              <Plus className="w-4 h-4" />
              Add Class
            </Button>
          </div>

          {visibleClasses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                      Min Birth Year
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                      Max Players
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                      Max Staff
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase w-16">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls, idx) =>
                    cls._deleted ? null : (
                      <tr
                        key={cls.id ?? `new-${idx}`}
                        className="border-b border-border last:border-0 hover:bg-surface"
                      >
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={cls.name}
                            onChange={(e) =>
                              updateClass(idx, "name", e.target.value)
                            }
                            placeholder="e.g. U12"
                            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={cls.minBirthYear ?? ""}
                            onChange={(e) =>
                              updateClass(
                                idx,
                                "minBirthYear",
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            placeholder="2014"
                            className="w-28 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={cls.maxPlayers ?? ""}
                            onChange={(e) =>
                              updateClass(
                                idx,
                                "maxPlayers",
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            className="w-20 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={cls.maxStaff ?? ""}
                            onChange={(e) =>
                              updateClass(
                                idx,
                                "maxStaff",
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            className="w-20 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          {deleteConfirm?.type === "class" &&
                          deleteConfirm.idx === idx ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => deleteClass(idx)}
                                className="text-xs text-error font-medium cursor-pointer hover:underline"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="text-xs text-text-secondary cursor-pointer hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirm({ type: "class", idx })
                              }
                              className="text-text-secondary hover:text-error transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-text-secondary text-sm">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No classes defined. Click &quot;Add Class&quot; to create one.
            </div>
          )}

          <div className="p-4 border-t border-border flex justify-end">
            <SaveButton saving={saving} saved={saved} onClick={saveClasses} />
          </div>
        </Card>
      )}

      {/* ─── Products & Prices ─── */}
      {tab === "products" && (
        <Card padding={false}>
          <div className="p-6 border-b border-border flex items-center justify-between">
            <CardTitle>Products & Prices</CardTitle>
            <Button size="sm" onClick={addProduct}>
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </div>

          {visibleProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                      Category
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase">
                      Price ({currency})
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase text-center">
                      Per Person
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase text-center">
                      Required
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-text-secondary uppercase w-16">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((prod, idx) =>
                    prod._deleted ? null : (
                      <tr
                        key={prod.id ?? `new-${idx}`}
                        className="border-b border-border last:border-0 hover:bg-surface"
                      >
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={prod.name}
                            onChange={(e) =>
                              updateProduct(idx, "name", e.target.value)
                            }
                            placeholder="Product name"
                            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={prod.category}
                            onChange={(e) =>
                              updateProduct(idx, "category", e.target.value)
                            }
                            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-navy bg-white"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={prod.price}
                            onChange={(e) =>
                              updateProduct(idx, "price", e.target.value)
                            }
                            className="w-28 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-navy"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={prod.perPerson}
                            onChange={(e) =>
                              updateProduct(
                                idx,
                                "perPerson",
                                e.target.checked
                              )
                            }
                            className="accent-navy w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={prod.isRequired}
                            onChange={(e) =>
                              updateProduct(
                                idx,
                                "isRequired",
                                e.target.checked
                              )
                            }
                            className="accent-navy w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          {deleteConfirm?.type === "product" &&
                          deleteConfirm.idx === idx ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => deleteProduct(idx)}
                                className="text-xs text-error font-medium cursor-pointer hover:underline"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="text-xs text-text-secondary cursor-pointer hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteConfirm({ type: "product", idx })
                              }
                              className="text-text-secondary hover:text-error transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-text-secondary text-sm">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No products defined. Click &quot;Add Product&quot; to create one.
            </div>
          )}

          <div className="p-4 border-t border-border flex justify-end">
            <SaveButton saving={saving} saved={saved} onClick={saveProducts} />
          </div>
        </Card>
      )}
    </div>
  );
}
