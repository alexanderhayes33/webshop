"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileMenu } from "@/components/admin/admin-mobile-menu";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAdmin =
    !!user &&
    (user.app_metadata?.role === "admin" ||
      user.user_metadata?.role === "admin" ||
      user.app_metadata?.is_super_admin === true);

  // ต้องเรียก hooks ทั้งหมดก่อน conditional return
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace("/");
    }
  }, [loading, user, isAdmin, router]);

  useEffect(() => {
    // ซ่อน Navbar และ Footer เมื่อเข้าหน้า admin
    const navbar = document.querySelector("header");
    const footer = document.querySelector("footer");
    const main = document.querySelector("main");
    
    if (navbar) navbar.style.display = "none";
    if (footer) footer.style.display = "none";
    if (main) {
      main.style.maxWidth = "none";
      main.style.padding = "0";
    }

    return () => {
      // แสดง Navbar และ Footer อีกครั้งเมื่อออกจากหน้า admin
      if (navbar) navbar.style.display = "";
      if (footer) footer.style.display = "";
      if (main) {
        main.style.maxWidth = "";
        main.style.padding = "";
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex h-screen w-screen overflow-hidden">
        <div className="hidden w-64 border-r bg-card md:block">
          <Skeleton className="h-16 w-full" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-background p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen overflow-hidden bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="h-full p-4 sm:p-6 md:p-8">{children}</div>
      </main>
      <AdminMobileMenu />
    </div>
  );
}

