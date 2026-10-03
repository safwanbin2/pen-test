import { SidebarLink, TabBarLink, type NavItem } from "./nav-link";

/** Full sidebar from 1024px, 64px icon rail from 640px, hidden on phones (bottom bar instead). */
export function Sidebar({ section, items, footer }: { section: string; items: NavItem[]; footer?: React.ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col border-r bg-sidebar p-2 pb-3 sm:flex max-lg:w-16 max-lg:items-center">
      <div className="mb-2 flex h-10 items-center px-2 text-[15px] font-semibold tracking-tight max-lg:justify-center max-lg:px-0">
        <span className="max-lg:hidden">Registry</span>
        <span aria-hidden className="text-base lg:hidden">R</span>
        <span className="sr-only lg:hidden">Registry</span>
      </div>
      <div className="px-2 pb-1 text-xs font-medium text-muted-foreground max-lg:hidden">{section}</div>
      <nav aria-label={`${section} navigation`} className="flex flex-col gap-0.5">
        {items.map((item) => (
          <SidebarLink key={item.href} item={item} />
        ))}
      </nav>
      {footer && <div className="mt-auto border-t p-2 text-xs text-muted-foreground max-lg:hidden">{footer}</div>}
    </aside>
  );
}

/** Sticky bottom navigation on phones (< 640px). */
export function BottomNav({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <nav
      aria-label={label}
      className="sticky bottom-0 z-10 mt-auto flex h-[60px] shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      {items.map((item) => (
        <TabBarLink key={item.href} item={item} />
      ))}
    </nav>
  );
}
