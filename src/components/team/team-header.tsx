"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Crown, LogOut } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";

interface TeamHeaderProps {
  teamName?: string;
  regNumber?: number;
  year?: number;
}

export function TeamHeader({ teamName, regNumber, year }: TeamHeaderProps) {
  return (
    <header className="border-b border-border bg-white">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-gold" />
            <span className="text-lg font-bold text-navy tracking-tight">Kings Cup</span>
          </div>
          {teamName && (
            <span className="text-sm text-text-secondary font-medium hidden sm:inline">
              / {teamName}
            </span>
          )}
          {regNumber && (
            <Badge variant="gold" className="hidden sm:inline-flex text-[10px]">
              #{regNumber}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {year && (
            <Badge className="text-[10px]">{year}</Badge>
          )}
          <LanguageSwitcher />
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-text-secondary hover:text-text-primary cursor-pointer p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  const locales = [
    { code: "en", label: "EN" },
    { code: "ru", label: "RU" },
    { code: "et", label: "ET" },
  ];

  return (
    <div className="flex items-center gap-0.5 border border-border rounded-md p-0.5">
      {locales.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => router.replace(pathname, { locale: code })}
          className="px-1.5 py-0.5 text-[10px] font-semibold rounded hover:bg-surface transition-colors text-text-secondary hover:text-text-primary cursor-pointer"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
