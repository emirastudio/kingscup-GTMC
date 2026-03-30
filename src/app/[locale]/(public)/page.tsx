import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const t = useTranslations("auth");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-md space-y-8 px-6">
        <div className="text-center">
          <Crown className="w-16 h-16 text-gold mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-navy tracking-tight">Kings Cup</h1>
          <p className="text-text-secondary mt-2">Elite Round</p>
        </div>

        <div className="space-y-3">
          <Link href="/login" className="block">
            <Button variant="primary" className="w-full" size="lg">
              {t("teamLogin")}
            </Button>
          </Link>
          <Link href="/admin/login" className="block">
            <Button variant="secondary" className="w-full" size="lg">
              {t("adminLogin")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
