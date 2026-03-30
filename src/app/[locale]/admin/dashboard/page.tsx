import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, Clock, Wallet } from "lucide-react";

const stats = [
  { key: "totalTeams", value: "0", icon: Users, color: "text-navy" },
  { key: "confirmedTeams", value: "0", icon: CheckCircle, color: "text-success" },
  { key: "pendingPayments", value: "0", icon: Clock, color: "text-warning" },
  { key: "totalRevenue", value: "0 EUR", icon: Wallet, color: "text-gold" },
];

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");
  const tTeams = useTranslations("admin.teams");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ key, value, icon: Icon, color }) => (
          <Card key={key}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-surface ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">{t(key)}</p>
                <p className="text-2xl font-bold text-text-primary">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent teams */}
      <Card>
        <CardTitle>{tTeams("recentRegistrations")}</CardTitle>
        <div className="mt-4 text-center py-8 text-text-secondary text-sm">
          No teams registered yet
        </div>
      </Card>
    </div>
  );
}
