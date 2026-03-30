"use client";

import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Mail } from "lucide-react";

export default function AdminMessagesPage() {
  const t = useTranslations("admin.messages");

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>

      <Card>
        <CardTitle>{t("compose")}</CardTitle>
        <form className="mt-4 space-y-4">
          <Input id="subject" label={t("subject")} required />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">{t("body")}</label>
            <textarea
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm min-h-[200px] focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-navy" />
              {t("sendToAll")}
            </label>
            <Button>
              <Send className="w-4 h-4" />
              {t("send")}
            </Button>
          </div>
        </form>
      </Card>

      {/* Sent messages */}
      <Card>
        <CardTitle>{t("sentMessages")}</CardTitle>
        <div className="mt-4 text-center py-8 text-text-secondary text-sm">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
          {t("noMessages")}
        </div>
      </Card>
    </div>
  );
}
