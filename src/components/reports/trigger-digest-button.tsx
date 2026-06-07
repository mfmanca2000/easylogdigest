"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
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
    <div className="flex flex-col items-end gap-1">
      <Button onClick={trigger} disabled={loading} size="sm">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
        {loading ? "Running…" : "Run Digest Now"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
