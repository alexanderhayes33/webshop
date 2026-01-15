"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  Home,
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

const menuItems = [
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

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 flex-shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 flex-shrink-0 items-center border-b px-6">
        <h2 className="text-sm font-semibold">Admin Dashboard</h2>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {menuItems.map((item) => {
          // สำหรับ /admin ต้องเช็ค exact match เท่านั้น
          // สำหรับเมนูอื่นๆ เช็คว่า pathname ตรงกับ href หรือขึ้นต้นด้วย href + "/"
          const isActive = item.href === "/admin" 
            ? pathname === "/admin" || pathname === "/admin/"
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const isSettings = item.href === "/admin/settings";
          return (
            <div key={item.href}>
              <Link href={item.href}>
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
              {isSettings && isActive && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-2">
                  <Link href="/admin/settings/line">
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
                  <Link href="/admin/settings/slipok">
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
      </nav>
      <div className="flex-shrink-0 border-t p-4">
        <Button variant="ghost" className="w-full justify-start gap-3" asChild>
          <Link href="/">
            <Home className="h-4 w-4" />
            <span className="text-sm">กลับหน้าหลัก</span>
          </Link>
        </Button>
      </div>
    </aside>
  );
}

