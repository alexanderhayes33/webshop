"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  User,
  ShoppingCart,
  Home,
  Package,
  LogOut,
  Phone,
  Mail,
  MessageCircle,
  Globe,
  Instagram,
  Facebook,
  Link2,
  Sparkles as SparklesIcon,
  Pen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { useCart } from "@/components/cart/cart-provider";
import { supabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductSearch } from "./product-search";

type ContactLink = {
  id: number;
  label: string;
  type: string;
  url: string;
  display_order: number;
  is_active: boolean;
};

function getIcon(type: string) {
  switch (type) {
    case "phone":
      return Phone;
    case "email":
      return Mail;
    case "line":
      return MessageCircle;
    case "website":
      return Globe;
    case "instagram":
      return Instagram;
    case "facebook":
      return Facebook;
    default:
      return Link2;
  }
}

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { getTotalItems } = useCart();
  const cartItemsCount = getTotalItems();
  const isAdmin = !!user && user.user_metadata?.role === "admin";
  const [contacts, setContacts] = useState<ContactLink[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    async function loadContacts() {
      setLoadingContacts(true);
      const { data, error } = await supabase
        .from("contact_links")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && data) {
        setContacts(data as ContactLink[]);
      }
      setLoadingContacts(false);
    }
    loadContacts();
  }, []);

  const visibleContacts = useMemo(
    () => contacts.filter((c) => c.is_active),
    [contacts]
  );

  const guestLinks = [
    { href: "/", label: "หน้าหลัก", icon: Home },
    { href: "/products", label: "สินค้าทั้งหมด", icon: Package },
    { href: "/blog", label: "บทความ", icon: Pen }
  ];

  const authedLinks = [
    ...guestLinks,
    { href: "/cart", label: "ตะกร้าสินค้า", icon: ShoppingCart }
  ];

  const links = user ? authedLinks : guestLinks;

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        // ถ้ามี error ก็ยัง redirect ไปหน้าแรก
      }
      setOpen(false);
      // รอสักครู่เพื่อให้ auth state อัปเดต
      await new Promise(resolve => setTimeout(resolve, 100));
      window.location.href = "/";
    } catch (err) {
      console.error("Logout error:", err);
      setOpen(false);
      window.location.href = "/";
    }
  }

  const menuContent = open && mounted ? (
    <>
      <div
        className="fixed inset-0 z-[99998] bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        style={{ isolation: "isolate", position: "fixed" }}
      />
      <nav 
        className="fixed right-0 top-0 z-[99999] h-full w-64 border-l bg-background p-4 shadow-2xl animate-in slide-in-from-right duration-300"
        style={{ isolation: "isolate", position: "fixed" }}
      >
            <div className="flex h-16 items-center justify-between border-b">
              <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-primary/40 text-xs font-semibold text-primary-foreground shadow-[0_10px_30px_rgba(37,99,235,0.35)]">
                  168
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold tracking-tight">
                    168VAPE
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-[0.22em]">
                    ร้านขายพอต
                  </span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 mb-4">
              <ProductSearch />
            </div>

            <div className="mt-6 space-y-1">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  {links.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                      >
                        <Button
                          variant={isActive ? "default" : "ghost"}
                          className={cn(
                            "w-full justify-start gap-3",
                            isActive && "bg-primary text-primary-foreground"
                          )}
                        >
                          <link.icon className="h-4 w-4" />
                          <span className="text-sm">{link.label}</span>
                          {link.href === "/cart" && cartItemsCount > 0 && (
                            <span className="ml-auto rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-bold">
                              {cartItemsCount > 99 ? "99+" : cartItemsCount}
                            </span>
                          )}
                        </Button>
                      </Link>
                    );
                  })}

                  {user && (
                    <>
                      <div className="my-4 border-t" />
                      <div className="space-y-1">
                        <div className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-xs font-medium truncate">
                                {user.email}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                ผู้ใช้งานปัจจุบัน
                              </p>
                            </div>
                          </div>
                        </div>
                        <Link
                          href="/profile"
                          onClick={() => setOpen(false)}
                        >
                          <Button
                            variant={pathname === "/profile" ? "default" : "ghost"}
                            className={cn(
                              "w-full justify-start gap-3",
                              pathname === "/profile" && "bg-primary text-primary-foreground"
                            )}
                          >
                            <User className="h-4 w-4" />
                            <span className="text-sm">ดูข้อมูลโปรไฟล์</span>
                          </Button>
                        </Link>
                        <Link
                          href="/orders"
                          onClick={() => setOpen(false)}
                        >
                          <Button
                            variant={pathname === "/orders" ? "default" : "ghost"}
                            className={cn(
                              "w-full justify-start gap-3",
                              pathname === "/orders" && "bg-primary text-primary-foreground"
                            )}
                          >
                            <ShoppingCart className="h-4 w-4" />
                            <span className="text-sm">ประวัติคำสั่งซื้อ</span>
                          </Button>
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setOpen(false)}
                          >
                            <Button
                              variant={pathname.startsWith("/admin") ? "default" : "ghost"}
                              className={cn(
                                "w-full justify-start gap-3",
                                pathname.startsWith("/admin") && "bg-primary text-primary-foreground"
                              )}
                            >
                              <Package className="h-4 w-4" />
                              <span className="text-sm">ไปยังหน้าแอดมิน</span>
                            </Button>
                          </Link>
                        )}
                      </div>
                    </>
                  )}

                  {!user && (
                    <>
                      <div className="my-4 border-t" />
                      <div className="space-y-2">
                        <Button
                          asChild
                          variant="outline"
                          className="w-full"
                          onClick={() => setOpen(false)}
                        >
                          <Link href="/register">สมัครสมาชิก</Link>
                        </Button>
                        <Button
                          asChild
                          className="w-full"
                          onClick={() => setOpen(false)}
                        >
                          <Link href="/login">เข้าสู่ระบบ</Link>
                        </Button>
                      </div>
                    </>
                  )}

                  {user && (
                    <>
                      <div className="my-4 border-t" />
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4" />
                        <span className="text-sm">ออกจากระบบ</span>
                      </Button>
                    </>
                  )}

                  <div className="my-4 border-t" />
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      ช่องทางติดต่อ
                    </p>
                    {loadingContacts ? (
                      <div className="space-y-2">
                        <Skeleton className="h-9 w-full" />
                        <Skeleton className="h-9 w-full" />
                      </div>
                    ) : visibleContacts.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">ยังไม่มีข้อมูล</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {visibleContacts.map((c) => {
                          const Icon = getIcon(c.type);
                          return (
                            <Link
                              key={c.id}
                              href={c.url}
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-2 rounded-lg border bg-background/80 px-2 py-2 text-[11px] transition hover:border-primary/50"
                              target={c.url.startsWith("http") ? "_blank" : undefined}
                              rel="noreferrer"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="line-clamp-1">{c.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </nav>
        </>
      ) : null;

  return (
    <>
      <div className="md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(!open)}
          className="h-8 w-8"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>
      {mounted && createPortal(menuContent, document.body)}
    </>
  );
}

