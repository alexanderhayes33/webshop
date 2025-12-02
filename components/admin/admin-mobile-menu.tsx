"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Settings, Home, Menu, X, Tags, Megaphone, Image, Users, BarChart3, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menuItems: Array<{
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    title: "ภาพรวม",
    href: "/admin",
    icon: LayoutDashboard
  },
  {
    title: "จัดการสินค้า",
    href: "/admin/products",
    icon: Package
  },
  {
    title: "จัดการหมวดหมู่",
    href: "/admin/categories",
    icon: Tags
  },
  {
    title: "คำสั่งซื้อ",
    href: "/admin/orders",
    icon: ShoppingCart
  },
  {
    title: "จัดการค่าจัดส่ง",
    href: "/admin/shipping",
    icon: Truck
  },
  {
    title: "จัดการผู้ใช้",
    href: "/admin/users",
    icon: Users
  },
  {
    title: "รายงานและสถิติ",
    href: "/admin/reports",
    icon: BarChart3
  },
  {
    title: "โปรโมชัน",
    href: "/admin/promotions",
    icon: Megaphone
  },
  {
    title: "แบนเนอร์",
    href: "/admin/banners",
    icon: Image
  },
  {
    title: "ตั้งค่า",
    href: "/admin/settings",
    icon: Settings
  }
];

export function AdminMobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <nav className="fixed bottom-20 right-4 z-50 w-64 space-y-1 rounded-2xl border bg-card p-2 shadow-lg">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      isActive && "bg-primary text-primary-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm">{item.title}</span>
                  </Button>
                </Link>
              );
            })}
            <div className="border-t pt-2">
              <Button variant="ghost" className="w-full justify-start gap-3" asChild>
                <Link href="/" onClick={() => setOpen(false)}>
                  <Home className="h-4 w-4" />
                  <span className="text-sm">กลับหน้าหลัก</span>
                </Link>
              </Button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

