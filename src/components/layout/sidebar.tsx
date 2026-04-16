"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { NavLink } from "./nav-link";

// Inline SVG icons to avoid extra dependencies

function DashboardIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function SessionsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("transition-transform duration-300", collapsed && "rotate-180")}
    >
      <polyline points="11 17 6 12 11 7" />
      <polyline points="18 17 13 12 18 7" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "flex flex-col border-r border-neutral-800/50 bg-[#0a0a0a] transition-all duration-300",
          // Desktop: always visible, respects collapsed width
          "hidden md:flex",
          collapsed ? "md:w-16" : "md:w-64",
          // Mobile: overlay drawer
          mobileOpen && "fixed inset-y-0 left-0 z-50 flex w-64",
        )}
      >
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-neutral-800/50 px-4">
        {!collapsed ? (
          <span className="text-lg font-bold tracking-tight text-neutral-100">
            <span className="text-amber-500">Un</span>bottle
          </span>
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center text-base font-bold text-amber-500">
            U
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 p-3" onClick={onMobileClose}>
        {collapsed ? (
          <>
            <NavLink
              href="/dashboard"
              icon={<DashboardIcon />}
              label=""
            />
            <NavLink
              href="/session/new"
              icon={<SessionsIcon />}
              label=""
            />
          </>
        ) : (
          <>
            <NavLink
              href="/dashboard"
              icon={<DashboardIcon />}
              label="Dashboard"
            />
            <NavLink
              href="/session/new"
              icon={<SessionsIcon />}
              label="New Session"
            />
          </>
        )}
      </nav>

      {/* Settings + logout + collapse */}
      <div className="border-t border-neutral-800/50 p-3">
        {collapsed ? (
          <NavLink href="/settings" icon={<SettingsIcon />} label="" />
        ) : (
          <NavLink href="/settings" icon={<SettingsIcon />} label="Settings" />
        )}
        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push("/login");
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 transition-colors duration-300 hover:bg-neutral-800/70 hover:text-neutral-300"
          aria-label="Log out"
        >
          <span className="flex h-5 w-5 items-center justify-center">
            <LogoutIcon />
          </span>
          {!collapsed && <span>Log out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-500 transition-colors duration-300 hover:bg-neutral-800/70 hover:text-neutral-300"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <CollapseIcon collapsed={collapsed} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
