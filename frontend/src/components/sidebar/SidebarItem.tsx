"use client";

import Link from "next/link";
import { cn } from "@shared/lib/utils";
import type { SidebarItem as SidebarItemType } from "@shared/config/sidebar.config";

interface SidebarItemProps {
  item: SidebarItemType;
  isActive: boolean;
}

export function SidebarItem({ item, isActive }: SidebarItemProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <Icon size={18} />
      <span>{item.label}</span>
    </Link>
  );
}
