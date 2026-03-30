"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useTeam } from "@/lib/team-context";
import { Upload, ImageIcon, Check } from "lucide-react";

export default function JerseyPage() {
  const t = useTranslations("jersey");
  const tc = useTranslations("common");
  const { clubId } = useTeam();
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!clubId) return;
    fetch(`/api/clubs/${clubId}/badge`).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (data.badgeUrl) setBadgeUrl(data.badgeUrl);
      }
    });
  }, [clubId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setSaved(false);
    setError("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setSaved(false);
    setError("");
  }

  async function handleUpload() {
    if (!file || !clubId) return;
    setUploading(true);
    setError("");

    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`/api/clubs/${clubId}/badge`, {
      method: "POST",
      body: form,
    });

    if (res.ok) {
      const data = await res.json();
      setBadgeUrl(data.badgeUrl);
      setSaved(true);
      setPreview(null);
      setFile(null);
    } else {
      const err = await res.json();
      setError(err.error ?? t("uploadFailed"));
    }
    setUploading(false);
  }

  const displayImage = preview ?? badgeUrl;

  return (
    <div className="space-y-6 max-w-4xl">
      {saved && <Alert variant="success">{t("submitted")} ✓</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description")}
          <br />
          {t("hint")}
        </CardDescription>

        <div className="mt-6 flex flex-col items-center">
          {/* Preview */}
          <div className="w-28 h-28 rounded-full bg-surface flex items-center justify-center mb-6 overflow-hidden border-2 border-border">
            {displayImage ? (
              <img src={displayImage} alt="Club badge" className="w-full h-full object-contain" />
            ) : (
              <span className="text-4xl text-text-secondary/40">?</span>
            )}
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-navy/40 hover:bg-surface/50 transition-colors cursor-pointer"
          >
            <ImageIcon className="w-10 h-10 text-text-secondary/40 mx-auto mb-3" />
            <p className="text-sm">
              <span className="text-navy font-medium">{t("uploadLink")}</span>
              {" "}{t("orDragDrop")}
            </p>
            <p className="text-xs text-text-secondary mt-1">{t("fileTypes")}</p>
            {file && (
              <p className="text-xs text-navy mt-2 font-medium">{file.name}</p>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="mt-6 flex justify-end w-full">
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "..." : (
                <>
                  {saved ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                  {t("submit")}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
