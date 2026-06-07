"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function TriggerDigestButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function trigger() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/trigger", { method: "POST" });
      const data = await res.json();
      if (!data.ok) setError(data.message);
      else router.refresh();
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button onClick={trigger} disabled={loading} size="sm" className="gap-2 shadow-sm">
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Play className="size-3.5" />
        )}
        {loading ? "Running…" : "Run Digest Now"}
      </Button>
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="size-3" />
          {error}
        </p>
      )}
    </div>
  );
}
