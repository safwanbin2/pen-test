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

/** Sidebar link: 32px row, icon + label, active background (UI guide: Staff shell). */
export function SidebarLink({ item }: { item: NavItem }) {
  const active = useActive(item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md px-2 text-sidebar-foreground/90 hover:bg-sidebar-accent",
        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
      )}
    >
      <span aria-hidden className="[&_svg]:size-4">{item.icon}</span>
      {item.label}
    </Link>
  );
}

/** Bottom tab on phones (student shell). */
export function TabBarLink({ item }: { item: NavItem }) {
  const active = useActive(item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground",
        active && "font-medium text-primary",
      )}
    >
      <span aria-hidden className="[&_svg]:size-5">{item.icon}</span>
      {item.label}
    </Link>
  );
}
