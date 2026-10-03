import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {breadcrumb && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight aria-hidden className="size-3" />}
              {item.href ? (
                <Link href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-xl leading-7 font-semibold tracking-tight">{title}</h1>
          {description && <div className="mt-0.5 text-muted-foreground">{description}</div>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:[&>a]:flex-1 max-sm:[&>button]:flex-1">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
