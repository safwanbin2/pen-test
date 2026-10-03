"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** `icon` is a rendered element, not a component: functions can't cross the server/client boundary. */
export type NavItem = { href: string; label: string; icon: React.ReactNode; exact?: boolean };

function useActive(item: NavItem) {
  const pathname = usePathname();
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}

/** Sidebar link: 32px row, icon + label, active background (UI guide: Staff shell).
 *  Below 1024px the sidebar is a 64px icon rail: 40px icon buttons, label kept for screen readers. */
export function SidebarLink({ item }: { item: NavItem }) {
  const active = useActive(item);
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md px-2 text-sidebar-foreground/90 hover:bg-sidebar-accent max-lg:size-10 max-lg:justify-center max-lg:px-0",
        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
      )}
    >
      <span aria-hidden className="[&_svg]:size-4">{item.icon}</span>
      <span className="max-lg:sr-only">{item.label}</span>
    </Link>
  );
}

/** Bottom tab on phones (both shells). */
export function TabBarLink({ item }: { item: NavItem }) {
  const active = useActive(item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] leading-[14px] text-muted-foreground",
        active && "font-semibold text-primary shadow-[inset_0_2px_0_var(--primary)]",
      )}
    >
      <span aria-hidden className="[&_svg]:size-5">{item.icon}</span>
      {item.label}
    </Link>
  );
}
