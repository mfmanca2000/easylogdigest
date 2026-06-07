"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Config { id: string; enabled: boolean; queryTemplate: string; lookbackHours: number; application: { name: string; displayName: string }; environment: { name: string }; datasource: { name: string; type: string }; }
interface App { id: string; name: string; displayName: string; }
interface Env { id: string; name: string; }
interface DS { id: string; name: string; type: string; }

const empty = { applicationId: "", environmentId: "", datasourceId: "", queryTemplate: '{app="{app}",env="{env}"} |= "error"', lookbackHours: 24, enabled: true };

export default function AppEnvConfigsPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [envs, setEnvs] = useState<Env[]>([]);
  const [dsList, setDsList] = useState<DS[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Config | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  async function load() {
    const [c, a, e, d] = await Promise.all([
      fetch("/api/admin/app-env-configs").then((r) => r.json()),
      fetch("/api/admin/applications").then((r) => r.json()),
      fetch("/api/admin/environments").then((r) => r.json()),
      fetch("/api/admin/datasources").then((r) => r.json()),
    ]);
    setConfigs(c); setApps(a); setEnvs(e); setDsList(d);
  }

  useEffect(() => { load(); }, []);

  function set(k: string, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }

  function openCreate() { setEditing(null); setForm(empty); setError(""); setOpen(true); }
  function openEdit(c: Config) {
    setEditing(c);
    setForm({ applicationId: "", environmentId: "", datasourceId: "", queryTemplate: c.queryTemplate, lookbackHours: c.lookbackHours, enabled: c.enabled });
    setError(""); setOpen(true);
  }

  async function save() {
    const url = editing ? `/api/admin/app-env-configs/${editing.id}` : "/api/admin/app-env-configs";
    const method = editing ? "PATCH" : "POST";
    const payload = editing
      ? { datasourceId: form.datasourceId || undefined, queryTemplate: form.queryTemplate, lookbackHours: form.lookbackHours, enabled: form.enabled }
      : form;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error saving"); return; }
    setOpen(false); load();
  }

  async function del(id: string) {
    if (!confirm("Delete this config? Related reports will be deleted.")) return;
    await fetch(`/api/admin/app-env-configs/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">App / Env Configurations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure which applications and environments to monitor</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2 shadow-sm"><Plus className="size-4" /> New Config</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Config" : "New Config"}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              {!editing && (<>
                <div className="space-y-1.5">
                  <Label>Application</Label>
                  <Select value={form.applicationId} onValueChange={(v) => set("applicationId", v)}>
                    <SelectTrigger><SelectValue placeholder="Select application" /></SelectTrigger>
                    <SelectContent>{apps.map((a) => <SelectItem key={a.id} value={a.id}>{a.displayName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Environment</Label>
                  <Select value={form.environmentId} onValueChange={(v) => set("environmentId", v)}>
                    <SelectTrigger><SelectValue placeholder="Select environment" /></SelectTrigger>
                    <SelectContent>{envs.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>)}
              <div className="space-y-1.5">
                <Label>Datasource</Label>
                <Select value={form.datasourceId} onValueChange={(v) => set("datasourceId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select datasource" /></SelectTrigger>
                  <SelectContent>{dsList.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.type})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Query template</Label>
                <Textarea value={form.queryTemplate} onChange={(e) => set("queryTemplate", e.target.value)} rows={3} className="font-mono text-xs" />
                <p className="text-xs text-muted-foreground">Use {"{app}"} and {"{env}"} as placeholders</p>
              </div>
              <div className="space-y-1.5">
                <Label>Lookback hours</Label>
                <Input type="number" value={form.lookbackHours} onChange={(e) => set("lookbackHours", parseInt(e.target.value))} min={1} max={720} className="h-9 rounded-lg" />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} id="enabled" />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="ring-1 ring-foreground/10 shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">
            Configurations
            <span className="ml-2 rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-muted-foreground">{configs.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Application</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Environment</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Datasource</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lookback</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((c) => (
                <TableRow key={c.id} className="border-b border-border/60 hover:bg-surface-50 transition-colors duration-100">
                  <TableCell className="pl-6 font-medium text-sm">{c.application.displayName}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{c.environment.name}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.datasource.name}</TableCell>
                  <TableCell className="text-sm">{c.lookbackHours}h</TableCell>
                  <TableCell>
                    {c.enabled
                      ? <Badge variant="success" className="text-xs">enabled</Badge>
                      : <Badge variant="secondary" className="text-xs">disabled</Badge>
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del(c.id)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {configs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">No configurations yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
