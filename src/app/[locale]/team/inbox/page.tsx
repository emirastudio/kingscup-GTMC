"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/lib/team-context";
import { Mail, ChevronRight, ChevronDown, ArrowLeft } from "lucide-react";

type Message = {
  id: number;
  subject: string;
  body: string;
  sentAt: string | null;
  isRead: boolean;
};

export default function InboxPage() {
  const t = useTranslations("inbox");
  const { teamId } = useTeam();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/teams/${teamId}/inbox`).then(async (res) => {
      if (res.ok) setMessages(await res.json());
      setLoading(false);
    });
  }, [teamId]);

  async function markAsRead(msgId: number) {
    if (!teamId) return;
    await fetch(`/api/teams/${teamId}/inbox`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: msgId }),
    });
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, isRead: true } : m)));
  }

  function handleOpen(msg: Message) {
    if (openId === msg.id) {
      setOpenId(null);
    } else {
      setOpenId(msg.id);
      if (!msg.isRead) markAsRead(msg.id);
    }
  }

  if (loading) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>

        {messages.length > 0 ? (
          <div className="mt-6 divide-y divide-border">
            {messages.map((msg) => (
              <div key={msg.id}>
                <button
                  onClick={() => handleOpen(msg)}
                  className="flex items-center gap-3 w-full py-4 text-left hover:bg-surface rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                >
                  <Mail className={`w-5 h-5 shrink-0 ${msg.isRead ? "text-text-secondary" : "text-success"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${msg.isRead ? "text-text-secondary" : "font-semibold text-text-primary"}`}>
                      {msg.subject}
                    </p>
                    {msg.sentAt && (
                      <p className="text-xs text-text-secondary">
                        {new Date(msg.sentAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {!msg.isRead && <Badge variant="info">New</Badge>}
                  {openId === msg.id ? (
                    <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
                  )}
                </button>
                {openId === msg.id && (
                  <div className="px-10 pb-4 text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                    {msg.body}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 text-center py-8 text-text-secondary text-sm">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {t("noMessages")}
          </div>
        )}
      </Card>
    </div>
  );
}
