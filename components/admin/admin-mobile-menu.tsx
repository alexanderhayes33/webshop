"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  Home,
  Menu,
  X,
  Tags,
  Megaphone,
  Image,
  Users,
  BarChart3,
  Truck,
  Notebook,
  Sparkles,
  MessageCircle,
  CreditCard
} from "lucide-react";
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
    title: "บทความ/วิธีสั่งซื้อ",
    href: "/admin/blogs",
    icon: Notebook
  },
  {
    title: "Popup โปรโมชัน",
    href: "/admin/promo-popups",
    icon: Sparkles
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
          <nav className="fixed bottom-20 right-4 z-50 w-64 space-y-1 rounded-2xl border bg-card p-2 shadow-lg max-h-[calc(100vh-6rem)] overflow-y-auto">
            {menuItems.map((item) => {
              // สำหรับ /admin ต้องเช็ค exact match เท่านั้น
              // สำหรับเมนูอื่นๆ เช็คว่า pathname ตรงกับ href หรือขึ้นต้นด้วย href + "/"
              const isActive = item.href === "/admin" 
                ? pathname === "/admin" || pathname === "/admin/"
                : pathname === item.href || pathname.startsWith(item.href + "/");
              const isSettings = item.href === "/admin/settings";
              return (
                <div key={item.href}>
                  <Link href={item.href} onClick={() => setOpen(false)}>
                    <Button
                      variant={isActive && !isSettings ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3",
                        isActive && !isSettings && "bg-primary text-primary-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm">{item.title}</span>
                    </Button>
                  </Link>
                  {isSettings && isActive && (
                    <div className="ml-4 mt-1 space-y-1 border-l pl-2">
                      <Link href="/admin/settings/line" onClick={() => setOpen(false)}>
                        <Button
                          variant={pathname === "/admin/settings/line" ? "default" : "ghost"}
                          size="sm"
                          className={cn(
                            "w-full justify-start gap-2 text-xs",
                            pathname === "/admin/settings/line" && "bg-primary text-primary-foreground"
                          )}
                        >
                          <MessageCircle className="h-3 w-3" />
                          LINE Login
                        </Button>
                      </Link>
                      <Link href="/admin/settings/slipok" onClick={() => setOpen(false)}>
                        <Button
                          variant={pathname === "/admin/settings/slipok" ? "default" : "ghost"}
                          size="sm"
                          className={cn(
                            "w-full justify-start gap-2 text-xs",
                            pathname === "/admin/settings/slipok" && "bg-primary text-primary-foreground"
                          )}
                        >
                          <CreditCard className="h-3 w-3" />
                          SlipOK Payment
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
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

