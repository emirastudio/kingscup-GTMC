"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export default function ClubLoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/club-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    if (res.ok) {
      router.push("/team/overview");
    } else {
      setError(t("invalidCredentials"));
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <Crown className="w-10 h-10 text-gold mx-auto mb-3" />
          <h1 className="text-xl font-bold text-navy">{t("loginTitle")}</h1>
          <p className="text-text-secondary text-sm mt-1">{t("loginSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            name="email"
            type="email"
            label={t("email")}
            placeholder="club@example.com"
            required
          />
          <Input
            id="password"
            name="password"
            type="password"
            label={t("password")}
            required
          />
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : t("login")}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/club/register" className="text-sm text-navy hover:underline font-medium">
            {t("registerNewClub")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
