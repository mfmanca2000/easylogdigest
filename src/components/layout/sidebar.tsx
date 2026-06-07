"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Server,
  Globe,
  Database,
  Users,
  Layers,
  LogOut,
  Activity,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
  adminOnly?: boolean;
}

const mainItems: NavItem[] = [
  { label: "Reports", href: "/reports", icon: <FileText className="size-4" /> },
];

const adminItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="size-4" />, exact: true, adminOnly: true },
  { label: "Applications", href: "/admin/applications", icon: <Server className="size-4" />, adminOnly: true },
  { label: "Environments", href: "/admin/environments", icon: <Globe className="size-4" />, adminOnly: true },
  { label: "Datasources", href: "/admin/datasources", icon: <Database className="size-4" />, adminOnly: true },
  { label: "App/Env Configs", href: "/admin/app-env-configs", icon: <Layers className="size-4" />, adminOnly: true },
  { label: "Users", href: "/admin/users", icon: <Users className="size-4" />, adminOnly: true },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="size-4" />, adminOnly: true },
];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
        isActive
          ? "bg-brand-600 text-white"
          : "text-slate-400 hover:bg-white/8 hover:text-white"
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const isAdmin = role === "ADMIN";

  return (
    <aside className="flex h-screen w-52 shrink-0 flex-col bg-brand-900 border-r border-white/8">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-white/8">
        <div className="flex size-7 items-center justify-center rounded-lg bg-brand-600">
          <Activity className="size-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-white tracking-tight">EasyLogDigest</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 px-2 py-4 overflow-y-auto">
        <div>
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Main
          </p>
          <div className="space-y-0.5">
            {mainItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>

        {isAdmin && (
          <div>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Admin
            </p>
            <div className="space-y-0.5">
              {adminItems.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Sign out */}
      <div className="border-t border-white/8 px-2 py-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/8 hover:text-white transition-colors duration-150"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
