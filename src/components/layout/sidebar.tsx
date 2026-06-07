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
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Reports", href: "/app/reports", icon: <FileText className="h-4 w-4" /> },
  { label: "Dashboard", href: "/app/admin", icon: <LayoutDashboard className="h-4 w-4" />, adminOnly: true },
  { label: "Applications", href: "/app/admin/applications", icon: <Server className="h-4 w-4" />, adminOnly: true },
  { label: "Environments", href: "/app/admin/environments", icon: <Globe className="h-4 w-4" />, adminOnly: true },
  { label: "Datasources", href: "/app/admin/datasources", icon: <Database className="h-4 w-4" />, adminOnly: true },
  { label: "App/Env Configs", href: "/app/admin/app-env-configs", icon: <Layers className="h-4 w-4" />, adminOnly: true },
  { label: "Users", href: "/app/admin/users", icon: <Users className="h-4 w-4" />, adminOnly: true },
  { label: "Settings", href: "/app/admin/settings", icon: <Settings className="h-4 w-4" />, adminOnly: true },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => !item.adminOnly || role === "ADMIN");

  return (
    <aside className="flex h-screen w-56 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <span className="text-lg font-bold text-white">EasyLogDigest</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--sidebar-active)] text-white"
                  : "hover:bg-white/10 hover:text-white"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-3 py-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
