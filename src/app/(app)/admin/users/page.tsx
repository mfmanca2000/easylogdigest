"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface User { id: string; email: string; name: string | null; role: string; createdAt: string; }

const emptyForm = { email: "", name: "", password: "", role: "AM" as "ADMIN" | "AM" };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/users");
    setUsers(await res.json());
  }

  useEffect(() => { load(); }, []);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function openCreate() { setEditing(null); setForm(emptyForm); setError(""); setOpen(true); }
  function openEdit(u: User) { setEditing(u); setForm({ email: u.email, name: u.name ?? "", password: "", role: u.role as "ADMIN" | "AM" }); setError(""); setOpen(true); }

  async function save() {
    const url = editing ? `/api/admin/users/${editing.id}` : "/api/admin/users";
    const method = editing ? "PATCH" : "POST";
    const payload = editing
      ? { name: form.name, role: form.role, ...(form.password ? { password: form.password } : {}) }
      : { email: form.email, name: form.name, password: form.password, role: form.role };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error saving"); return; }
    setOpen(false); load();
  }

  async function del(id: string) {
    if (!confirm("Delete this user?")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage who can access EasyLogDigest</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2 shadow-sm"><Plus className="size-4" /> New User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit User" : "New User"}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              {!editing && (
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="h-9 rounded-lg" /></div>
              )}
              <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-9 rounded-lg" /></div>
              <div className="space-y-1.5">
                <Label>{editing ? "New password (leave blank to keep)" : "Password"}</Label>
                <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} className="h-9 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => set("role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM (read-only)</SelectItem>
                    <SelectItem value="ADMIN">Admin (full access)</SelectItem>
                  </SelectContent>
                </Select>
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
            Users
            <span className="ml-2 rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-muted-foreground">{users.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="border-b border-border/60 hover:bg-surface-50 transition-colors duration-100">
                  <TableCell className="pl-6 text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm">{u.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "ADMIN" ? "default" : "secondary"} className="text-xs">{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del(u.id)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-10">No users yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
