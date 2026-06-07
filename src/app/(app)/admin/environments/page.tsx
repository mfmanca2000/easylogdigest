"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Env { id: string; name: string; }

export default function EnvironmentsPage() {
  const [envs, setEnvs] = useState<Env[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Env | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/environments");
    setEnvs(await res.json());
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setName(""); setError(""); setOpen(true); }
  function openEdit(e: Env) { setEditing(e); setName(e.name); setError(""); setOpen(true); }

  async function save() {
    const url = editing ? `/api/admin/environments/${editing.id}` : "/api/admin/environments";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (!res.ok) { const d = await res.json(); setError(d.error?.fieldErrors?.name?.[0] ?? "Error saving"); return; }
    setOpen(false); load();
  }

  async function del(id: string) {
    if (!confirm("Delete this environment?")) return;
    await fetch(`/api/admin/environments/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Environments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage deployment environments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2 shadow-sm"><Plus className="size-4" /> New Environment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Environment" : "New Environment"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="production" className="h-9 rounded-lg" />
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
            Environments
            <span className="ml-2 rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-muted-foreground">{envs.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {envs.map((e) => (
                <TableRow key={e.id} className="border-b border-border/60 hover:bg-surface-50 transition-colors duration-100">
                  <TableCell className="pl-6 font-mono text-sm">{e.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del(e.id)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {envs.length === 0 && (
                <TableRow><TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-10">No environments yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
