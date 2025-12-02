"use client";

import { useEffect, useState } from "react";
import { Package, CheckCircle, ShoppingCart, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);

      const [productsResult, ordersResult] = await Promise.all([
        supabase.from("products").select("id, price, is_active"),
        supabase.from("orders").select("id, total_amount").limit(1000)
      ]);

      const products = (productsResult.data || []) as any[];
      const orders = (ordersResult.data || []) as any[];

      setStats({
        totalProducts: products.length,
        activeProducts: products.filter((p) => p.is_active).length,
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
      });

      setLoading(false);
    }

    loadStats();
  }, []);

  const statCards = [
    {
      title: "สินค้าทั้งหมด",
      value: stats.totalProducts,
      icon: Package,
      color: "text-blue-600 dark:text-blue-400"
    },
    {
      title: "สินค้าที่เปิดใช้งาน",
      value: stats.activeProducts,
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400"
    },
    {
      title: "คำสั่งซื้อทั้งหมด",
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: "text-purple-600 dark:text-purple-400"
    },
    {
      title: "รายได้รวม",
      value: `฿${stats.totalRevenue.toLocaleString("th-TH")}`,
      icon: DollarSign,
      color: "text-amber-600 dark:text-amber-400"
    }
  ];

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: "ภาพรวมระบบ" }]} />
      <section className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">ภาพรวมระบบ</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          สถิติและข้อมูลสรุปของร้านค้า
        </p>
      </section>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="rounded-2xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className={`text-2xl font-semibold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">เมนูด่วน</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="/admin/products"
            className="rounded-lg border p-3 text-sm transition hover:bg-muted"
          >
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">จัดการสินค้า</p>
                <p className="text-xs text-muted-foreground">
                  เพิ่ม แก้ไข ลบสินค้า
                </p>
              </div>
            </div>
          </a>
          <a
            href="/admin/orders"
            className="rounded-lg border p-3 text-sm transition hover:bg-muted"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">จัดการคำสั่งซื้อ</p>
                <p className="text-xs text-muted-foreground">
                  ดูและอัปเดตสถานะ
                </p>
              </div>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}
