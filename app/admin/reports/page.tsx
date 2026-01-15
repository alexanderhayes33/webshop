"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Select } from "@/components/ui/select";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

type SalesStats = {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalProducts: number;
  totalUsers: number;
  revenueChange: number;
  ordersChange: number;
};

type TopProduct = {
  id: number;
  name: string;
  totalSold: number;
  totalRevenue: number;
  image_url: string | null;
};

type OrderStatusStats = {
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  cancelled: number;
  completed: number;
};

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("month");
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [statusStats, setStatusStats] = useState<OrderStatusStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  function getDateRange() {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    return { startDate, endDate: now };
  }

  async function loadReports() {
    setLoading(true);
    const { startDate, endDate } = getDateRange();

    try {
      // โหลดสถิติยอดขาย
      let ordersQuery = supabase
        .from("orders")
        .select("id, total_amount, status, created_at")
        .neq("status", "cancelled");

      if (dateRange !== "all") {
        ordersQuery = ordersQuery.gte("created_at", startDate.toISOString());
      }

      const { data: ordersData, error: ordersError } = await ordersQuery;

      // โหลดสถิติช่วงก่อนหน้า (เพื่อเปรียบเทียบ)
      const prevStartDate = new Date(startDate);
      const prevEndDate = new Date(startDate);
      if (dateRange === "today") {
        prevStartDate.setDate(prevStartDate.getDate() - 1);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
      } else if (dateRange === "week") {
        prevStartDate.setDate(prevStartDate.getDate() - 7);
        prevEndDate.setDate(prevEndDate.getDate() - 7);
      } else if (dateRange === "month") {
        prevStartDate.setMonth(prevStartDate.getMonth() - 1);
        prevEndDate.setMonth(prevEndDate.getMonth() - 1);
      }

      const { data: prevOrdersData } = await supabase
        .from("orders")
        .select("total_amount, status, created_at")
        .neq("status", "cancelled")
        .gte("created_at", prevStartDate.toISOString())
        .lt("created_at", prevEndDate.toISOString());

      // คำนวณสถิติ
      const currentRevenue = ordersData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
      const prevRevenue = prevOrdersData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
      const revenueChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      const currentOrders = ordersData?.length || 0;
      const prevOrders = prevOrdersData?.length || 0;
      const ordersChange = prevOrders > 0 ? ((currentOrders - prevOrders) / prevOrders) * 100 : 0;

      const averageOrderValue = currentOrders > 0 ? currentRevenue / currentOrders : 0;

      // โหลดจำนวนสินค้าและผู้ใช้
      const [productsResult, usersResult] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("user_id").neq("status", "cancelled")
      ]);

      const uniqueUsers = new Set(usersResult.data?.map((o) => o.user_id) || []);

      setStats({
        totalRevenue: currentRevenue,
        totalOrders: currentOrders,
        averageOrderValue,
        totalProducts: productsResult.count || 0,
        totalUsers: uniqueUsers.size,
        revenueChange,
        ordersChange
      });

      // โหลดสินค้าขายดี
      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map((o: any) => o.id);
        const { data: itemsData } = await supabase
          .from("order_items")
          .select("product_id, quantity, price, product:products(id, name, image_url)")
          .in("order_id", orderIds);

        // คำนวณสินค้าขายดี
        const productMap = new Map<number, { name: string; sold: number; revenue: number; image_url: string | null }>();

        itemsData?.forEach((item: any) => {
          const productId = item.product_id;
          const product = item.product;
          if (!product) return;

          const existing = productMap.get(productId) || {
            name: product.name,
            sold: 0,
            revenue: 0,
            image_url: product.image_url
          };

          existing.sold += item.quantity || 0;
          existing.revenue += Number(item.price || 0) * (item.quantity || 0);

          productMap.set(productId, existing);
        });

        const topProductsList: TopProduct[] = Array.from(productMap.entries())
          .map(([id, data]) => ({
            id,
            name: data.name,
            totalSold: data.sold,
            totalRevenue: data.revenue,
            image_url: data.image_url
          }))
          .sort((a, b) => b.totalSold - a.totalSold)
          .slice(0, 10);

        setTopProducts(topProductsList);
      } else {
        setTopProducts([]);
      }

      // โหลดสถิติสถานะออเดอร์
      const statusCounts: OrderStatusStats = {
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        cancelled: 0,
        completed: 0
      };

      ordersData?.forEach((order: any) => {
        const status = order.status;
        if (status in statusCounts) {
          statusCounts[status as keyof OrderStatusStats]++;
        }
      });

      setStatusStats(statusCounts);

      // โหลดออเดอร์ล่าสุด
      const { data: recentOrdersData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentOrders(recentOrdersData || []);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "แอดมิน", href: "/admin" },
          { label: "รายงานและสถิติ" }
        ]}
      />
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              รายงานและสถิติ
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              ดูสถิติยอดขายและรายงานต่างๆ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="h-9 w-32 text-xs"
            >
              <option value="today">วันนี้</option>
              <option value="week">7 วันล่าสุด</option>
              <option value="month">เดือนนี้</option>
              <option value="all">ทั้งหมด</option>
            </Select>
          </div>
        </div>

        {/* สถิติหลัก */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">ยอดขายรวม</p>
                  <p className="mt-1 text-2xl font-semibold">
                    ฿{stats.totalRevenue.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    {stats.revenueChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span
                      className={cn(
                        stats.revenueChange >= 0 ? "text-emerald-600" : "text-destructive"
                      )}
                    >
                      {Math.abs(stats.revenueChange).toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">จากช่วงก่อน</span>
                  </div>
                </div>
                <div className="rounded-full bg-primary/10 p-3">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">จำนวนออเดอร์</p>
                  <p className="mt-1 text-2xl font-semibold">{stats.totalOrders}</p>
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    {stats.ordersChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span
                      className={cn(
                        stats.ordersChange >= 0 ? "text-emerald-600" : "text-destructive"
                      )}
                    >
                      {Math.abs(stats.ordersChange).toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">จากช่วงก่อน</span>
                  </div>
                </div>
                <div className="rounded-full bg-blue-500/10 p-3">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">ยอดซื้อเฉลี่ย</p>
                  <p className="mt-1 text-2xl font-semibold">
                    ฿{stats.averageOrderValue.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    ต่อออเดอร์
                  </p>
                </div>
                <div className="rounded-full bg-purple-500/10 p-3">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">สินค้าในระบบ</p>
                  <p className="mt-1 text-2xl font-semibold">{stats.totalProducts}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    รายการ
                  </p>
                </div>
                <div className="rounded-full bg-amber-500/10 p-3">
                  <Package className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          {/* สินค้าขายดี */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">สินค้าขายดี</h2>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : topProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>ขายได้ {product.totalSold} ชิ้น</span>
                        <span>•</span>
                        <span className="font-semibold text-primary">
                          ฿{product.totalRevenue.toLocaleString("th-TH")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* สถิติสถานะออเดอร์ */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">สถานะออเดอร์</h2>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : statusStats ? (
              <div className="space-y-3">
                {Object.entries(statusStats).map(([status, count]) => {
                  const statusLabels: Record<string, string> = {
                    pending: "รอดำเนินการ",
                    confirmed: "ยืนยันแล้ว",
                    processing: "กำลังเตรียมสินค้า",
                    shipped: "จัดส่งแล้ว",
                    cancelled: "ยกเลิก",
                    completed: "สำเร็จ"
                  };
                  const statusColors: Record<string, string> = {
                    pending: "bg-yellow-500/10 text-yellow-600",
                    confirmed: "bg-emerald-500/10 text-emerald-600",
                    processing: "bg-purple-500/10 text-purple-600",
                    shipped: "bg-emerald-500/10 text-emerald-600",
                    cancelled: "bg-destructive/10 text-destructive",
                    completed: "bg-primary/10 text-primary"
                  };
                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusColors[status] || "bg-muted text-muted-foreground")}>
                          {statusLabels[status] || status}
                        </span>
                      </div>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* ออเดอร์ล่าสุด */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">ออเดอร์ล่าสุด</h2>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground">ยังไม่มีออเดอร์</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">หมายเลขออเดอร์</th>
                    <th className="px-3 py-2">สถานะ</th>
                    <th className="px-3 py-2">ยอดรวม</th>
                    <th className="px-3 py-2">วันที่</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-2 font-mono text-[11px]">
                        {order.order_number}
                      </td>
                      <td className="px-3 py-2">
                        {(() => {
                          const statusLabels: Record<string, string> = {
                            pending: "รอดำเนินการ",
                            confirmed: "ชำระเงินแล้ว",
                            processing: "กำลังเตรียมสินค้า",
                            shipped: "จัดส่งแล้ว",
                            cancelled: "ยกเลิก",
                            completed: "สำเร็จ"
                          };
                          const statusColors: Record<string, string> = {
                            pending: "bg-yellow-500/10 text-yellow-600",
                            confirmed: "bg-emerald-500/10 text-emerald-600",
                            processing: "bg-purple-500/10 text-purple-600",
                            shipped: "bg-emerald-500/10 text-emerald-600",
                            cancelled: "bg-destructive/10 text-destructive",
                            completed: "bg-primary/10 text-primary"
                          };
                          return (
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusColors[order.status] || "bg-muted text-muted-foreground")}>
                              {statusLabels[order.status] || order.status}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        ฿{Number(order.total_amount).toLocaleString("th-TH")}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

