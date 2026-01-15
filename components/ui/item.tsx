"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Item = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "muted" | "outline";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variantClasses = {
    default: "bg-card border",
    muted: "bg-muted/50 border",
    outline: "border border-border bg-transparent"
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-3 rounded-lg p-3 transition-colors",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
});
Item.displayName = "Item";

const ItemMedia = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex-shrink-0", className)}
      {...props}
    />
  );
});
ItemMedia.displayName = "ItemMedia";

const ItemContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex-1 min-w-0", className)}
      {...props}
    />
  );
});
ItemContent.displayName = "ItemContent";

const ItemTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  );
});
ItemTitle.displayName = "ItemTitle";

export { Item, ItemMedia, ItemContent, ItemTitle };

