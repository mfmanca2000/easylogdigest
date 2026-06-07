"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface DS { id: string; name: string; type: string; baseUrl: string; lokiOrgId?: string | null; esIndex?: string | null; }

const empty = { name: "", type: "LOKI" as "LOKI" | "ELASTICSEARCH", baseUrl: "", apiKey: "", lokiOrgId: "", esIndex: "", esUsername: "", esPassword: "" };

export default function DatasourcesPage() {
  const [ds, setDs] = useState<DS[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DS | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/datasources");
    setDs(await res.json());
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(empty); setError(""); setOpen(true); }
  function openEdit(d: DS) {
    setEditing(d);
    setForm({ ...empty, name: d.name, type: d.type as "LOKI" | "ELASTICSEARCH", baseUrl: d.baseUrl, lokiOrgId: d.lokiOrgId ?? "", esIndex: d.esIndex ?? "" });
    setError(""); setOpen(true);
  }

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    const payload: Record<string, string | null> = { name: form.name, type: form.type, baseUrl: form.baseUrl, apiKey: form.apiKey };
    if (form.type === "LOKI") { payload.lokiOrgId = form.lokiOrgId || null; }
    else { payload.esIndex = form.esIndex || null; payload.esUsername = form.esUsername || null; payload.esPassword = form.esPassword || null; }

    const url = editing ? `/api/admin/datasources/${editing.id}` : "/api/admin/datasources";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) { const d = await res.json(); setError(d.error?.fieldErrors?.name?.[0] ?? d.error ?? "Error saving"); return; }
    setOpen(false); load();
  }

  async function del(id: string) {
    if (!confirm("Delete this datasource?")) return;
    await fetch(`/api/admin/datasources/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grafana Datasources</h1>
          <p className="text-muted-foreground">Configure Grafana connections (Loki or Elasticsearch)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Datasource</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Datasource" : "New Datasource"}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="production-loki" /></div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOKI">Loki (LogQL)</SelectItem>
                    <SelectItem value="ELASTICSEARCH">Elasticsearch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Grafana Base URL</Label><Input value={form.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} placeholder="https://grafana.example.com" /></div>
              <div className="space-y-1"><Label>API Key / Token</Label><Input type="password" value={form.apiKey} onChange={(e) => set("apiKey", e.target.value)} placeholder="glc_..." /></div>
              {form.type === "LOKI" && (
                <div className="space-y-1"><Label>Loki Org ID (optional)</Label><Input value={form.lokiOrgId} onChange={(e) => set("lokiOrgId", e.target.value)} placeholder="1" /></div>
              )}
              {form.type === "ELASTICSEARCH" && (<>
                <div className="space-y-1"><Label>Index pattern</Label><Input value={form.esIndex} onChange={(e) => set("esIndex", e.target.value)} placeholder="logs-*" /></div>
                <div className="space-y-1"><Label>Username (if not using API key)</Label><Input value={form.esUsername} onChange={(e) => set("esUsername", e.target.value)} /></div>
                <div className="space-y-1"><Label>Password</Label><Input type="password" value={form.esPassword} onChange={(e) => set("esPassword", e.target.value)} /></div>
              </>)}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Datasources ({ds.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>URL</TableHead><TableHead className="w-20"></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {ds.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell><Badge variant="outline">{d.type}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.baseUrl}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {ds.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No datasources yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
