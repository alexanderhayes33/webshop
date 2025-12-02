"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { ThemeToggle } from "./theme-toggle";
import { ProductSearch } from "./product-search";
import { MobileMenu } from "./mobile-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabaseClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const guestLinks = [
  { href: "/", label: "หน้าหลัก" },
  { href: "/products", label: "สินค้าทั้งหมด" }
];

const authedLinks = [
  { href: "/", label: "หน้าหลัก" },
  { href: "/products", label: "สินค้าทั้งหมด" }
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { getTotalItems } = useCart();

  const links = user ? authedLinks : guestLinks;

  const isAdmin = !!user && user.user_metadata?.role === "admin";
  const cartItemsCount = getTotalItems();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
      <nav className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* LOGO / BRAND */}
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-primary/40 text-xs font-semibold text-primary-foreground shadow-[0_10px_30px_rgba(37,99,235,0.35)]">
            168
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm md:text-base font-semibold tracking-tight">
              168VAPE
            </span>
            <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-[0.22em]">
              ร้านขายพอต
            </span>
          </div>
        </Link>

        {/* CENTER NAV - SEARCH */}
        <div className="hidden flex-1 items-center justify-center px-4 md:flex">
          <ProductSearch />
        </div>

        {/* MOBILE MENU */}
        <MobileMenu />

        {/* RIGHT ACTIONS - DESKTOP */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex gap-5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm md:text-base font-medium text-muted-foreground transition hover:text-primary",
                  pathname === link.href && "text-primary"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {loading ? (
            <Skeleton className="h-7 w-7 rounded-full" />
          ) : (
            <>
              {user ? (
                <>
                  <Button
                    size="icon"
                    variant="outline"
                    className="relative h-8 w-8 rounded-full"
                    onClick={() => router.push("/cart")}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {cartItemsCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {cartItemsCount > 99 ? "99+" : cartItemsCount}
                      </span>
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-full border-primary/30"
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 z-[60]">
                      <DropdownMenuLabel className="flex flex-col gap-0.5">
                        <span className="text-xs text-muted-foreground">
                          ผู้ใช้งานปัจจุบัน
                        </span>
                        <span className="truncate text-xs font-medium text-foreground">
                          {user.email}
                        </span>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => router.push("/profile")}
                      >
                        ดูข้อมูลโปรไฟล์
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => router.push("/orders")}
                      >
                        ประวัติคำสั่งซื้อ
                      </DropdownMenuItem>
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-xs"
                            onClick={() => router.push("/admin")}
                          >
                            ไปยังหน้าแอดมิน
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="text-xs text-destructive focus:text-destructive"
                      >
                        ออกจากระบบ
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-xs md:text-sm"
                  >
                    <Link href="/register">สมัครสมาชิก</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="rounded-full text-xs md:text-sm shadow-sm"
                  >
                    <Link href="/login">เข้าสู่ระบบ</Link>
                  </Button>
                </div>
              )}
            </>
          )}

          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}

