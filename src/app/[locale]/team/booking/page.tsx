"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { MedicalSummaryCard } from "@/components/team/medical-summary-card";
import { HealthDisclaimer } from "@/components/team/health-disclaimer";
import { useTeam } from "@/lib/team-context";

type OrderItem = {
  productId: number;
  name: string;
  nameRu: string | null;
  nameEt: string | null;
  description: string | null;
  descriptionRu: string | null;
  descriptionEt: string | null;
  basePrice: string;
  effectivePrice: string;
  hasCustomPrice: boolean;
  category: string;
  isRequired: boolean;
  includedQuantity: number;
  perPerson: boolean;
  quantity: number;
  total: string;
};

type Person = {
  id: number;
  firstName: string;
  lastName: string;
  personType: "player" | "staff" | "accompanying";
  allergies: string | null;
  dietaryRequirements: string | null;
  medicalNotes: string | null;
};

export default function BookingPage() {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { teamId } = useTeam();

  function getLocalName(item: OrderItem) {
    if (locale === "ru" && item.nameRu) return item.nameRu;
    if (locale === "et" && item.nameEt) return item.nameEt;
    return item.name;
  }

  function getLocalDesc(item: OrderItem) {
    if (locale === "ru" && item.descriptionRu) return item.descriptionRu;
    if (locale === "et" && item.descriptionEt) return item.descriptionEt;
    return item.description;
  }

  const [items, setItems] = useState<OrderItem[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    Promise.all([
      fetch(`/api/teams/${teamId}/orders`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/teams/${teamId}/people`).then((r) => r.ok ? r.json() : []),
    ]).then(([orderData, peopleData]) => {
      setItems(orderData);
      setPeople(peopleData);
      setLoading(false);
    });
  }, [teamId]);

  function updateQuantity(productId: number, quantity: number) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const total = (parseFloat(item.effectivePrice) * quantity).toFixed(2);
        return { ...item, quantity, total };
      })
    );
    setSaved(false);
  }

  async function handleSave() {
    if (!teamId) return;
    setSaving(true);
    const payload = items
      .filter((i) => i.quantity > 0 || i.isRequired)
      .map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.effectivePrice,
      }));

    const res = await fetch(`/api/teams/${teamId}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) setSaved(true);
    setSaving(false);
  }

  const grandTotal = items.reduce((sum, i) => sum + parseFloat(i.total || "0"), 0);

  if (loading) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {saved && <Alert variant="success">{tc("save")} ✓</Alert>}

      {/* Orders table */}
      <Card>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 text-xs font-medium text-text-secondary uppercase">{t("type")}</th>
                <th className="pb-3 text-xs font-medium text-text-secondary uppercase text-center">{t("quantity")}</th>
                <th className="pb-3 text-xs font-medium text-text-secondary uppercase text-right">{t("price")}</th>
                <th className="pb-3 text-xs font-medium text-text-secondary uppercase text-right">{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.productId} className="border-b border-border last:border-0">
                  <td className="py-4">
                    <p className="text-sm font-medium text-text-primary">{getLocalName(item)}</p>
                    {getLocalDesc(item) && (
                      <p className="text-xs text-text-secondary mt-0.5">{getLocalDesc(item)}</p>
                    )}
                    {item.hasCustomPrice && (
                      <p className="text-xs text-gold-dark mt-0.5">
                        {t("customPrice", { price: item.basePrice })}
                      </p>
                    )}
                  </td>
                  <td className="py-4 text-center">
                    {item.isRequired && item.includedQuantity > 0 ? (
                      <span className="text-sm">{item.includedQuantity}</span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-navy/20"
                      />
                    )}
                  </td>
                  <td className="py-4 text-right text-sm text-text-secondary">
                    {item.effectivePrice} {tc("euro")}
                  </td>
                  <td className="py-4 text-right text-sm font-medium">
                    {parseFloat(item.total).toFixed(0)} {tc("euro")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-navy">
                <td colSpan={3} className="py-3 text-sm font-bold text-right">{t("total")}:</td>
                <td className="py-3 text-right text-sm font-bold text-navy">
                  {grandTotal.toFixed(0)} {tc("euro")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "..." : tc("save")}
          </Button>
        </div>
      </Card>

      {/* Medical & Dietary summary */}
      <MedicalSummaryCard people={people} />

      {/* Health disclaimer */}
      <HealthDisclaimer />
    </div>
  );
}
