"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const allItems = [{ label: "หน้าหลัก", href: "/" }, ...items];

  return (
    <nav
      className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}
      aria-label="Breadcrumb"
    >
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        return (
          <div key={index} className="flex items-center gap-1">
            {index === 0 ? (
              <Home className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            {isLast ? (
              <span className="font-medium text-foreground">{item.label}</span>
            ) : item.href ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

