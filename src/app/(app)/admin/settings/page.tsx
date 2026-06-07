"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Clock } from "lucide-react";

export default function SettingsPage() {
  const [email, setEmail] = useState({ host: "", port: 587, secure: false, user: "", password: "", fromAddress: "", recipients: "" });
  const [schedule, setSchedule] = useState({ cronExpr: "0 6 * * *", enabled: true });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => {
      if (d.email) setEmail(d.email);
      if (d.schedule) setSchedule(d.schedule);
    });
  }, []);

  async function saveEmail() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setSaving(false);
    setMsg(res.ok ? "Email settings saved." : "Error saving.");
  }

  async function saveSchedule() {
    setSaving(true); setMsg("");
    const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schedule }) });
    setSaving(false);
    setMsg(res.ok ? "Schedule settings saved." : "Error saving.");
  }

  function setE(k: string, v: unknown) { setEmail((f) => ({ ...f, [k]: v })); }
  function setS(k: string, v: unknown) { setSchedule((f) => ({ ...f, [k]: v })); }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure email dispatch and digest schedule</p>
      </div>

      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" /> Email</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2"><Clock className="h-4 w-4" /> Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <Card>
            <CardHeader><CardTitle>SMTP / Email Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>SMTP Host</Label><Input value={email.host} onChange={(e) => setE("host", e.target.value)} placeholder="smtp.example.com" /></div>
                <div className="space-y-1"><Label>Port</Label><Input type="number" value={email.port} onChange={(e) => setE("port", parseInt(e.target.value))} /></div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={email.secure} onCheckedChange={(v) => setE("secure", v)} id="secure" />
                <Label htmlFor="secure">Use TLS (port 465)</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Username</Label><Input value={email.user} onChange={(e) => setE("user", e.target.value)} /></div>
                <div className="space-y-1"><Label>Password</Label><Input type="password" value={email.password} onChange={(e) => setE("password", e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label>From address</Label><Input type="email" value={email.fromAddress} onChange={(e) => setE("fromAddress", e.target.value)} placeholder="noreply@example.com" /></div>
              <div className="space-y-1"><Label>Recipients (comma-separated)</Label><Input value={email.recipients} onChange={(e) => setE("recipients", e.target.value)} placeholder="alice@example.com, bob@example.com" /></div>
              {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
              <Button onClick={saveEmail} disabled={saving}>{saving ? "Saving..." : "Save email settings"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader><CardTitle>Digest Schedule</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Cron expression (UTC)</Label>
                <Input value={schedule.cronExpr} onChange={(e) => setS("cronExpr", e.target.value)} placeholder="0 6 * * *" className="font-mono" />
                <p className="text-xs text-muted-foreground">Default: <code>0 6 * * *</code> = every day at 06:00 UTC. The scheduler re-arms immediately after saving.</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={schedule.enabled} onCheckedChange={(v) => setS("enabled", v)} id="sched-enabled" />
                <Label htmlFor="sched-enabled">Enable automatic nightly digest</Label>
              </div>
              {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
              <Button onClick={saveSchedule} disabled={saving}>{saving ? "Saving..." : "Save schedule"}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
