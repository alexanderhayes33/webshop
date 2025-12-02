"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Order = {
  id: number;
  order_number: string;
  status: string;
  total_amount: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  tracking_number: string | null;
  shipping_company: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const statusConfig: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  pending: {
    label: "รอดำเนินการ",
    icon: Clock,
    color: "text-amber-600 bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300"
  },
  confirmed: {
    label: "ยืนยันแล้ว",
    icon: CheckCircle,
    color: "text-blue-600 bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300"
  },
  processing: {
    label: "กำลังเตรียมสินค้า",
    icon: Package,
    color: "text-purple-600 bg-purple-100 dark:bg-purple-500/10 dark:text-purple-300"
  },
  shipped: {
    label: "จัดส่งแล้ว",
    icon: Truck,
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300"
  },
  cancelled: {
    label: "ยกเลิก",
    icon: XCircle,
    color: "text-destructive bg-destructive/10"
  }
};

function getShippingCompanyName(company: string): string {
  const companies: Record<string, string> = {
    kerry: "Kerry Express",
    ems: "ไปรษณีย์ไทย (EMS)",
    jt: "J&T Express",
    flash: "Flash Express",
    ninja: "Ninja Van",
    dhl: "DHL",
    fedex: "FedEx",
    other: "อื่นๆ"
  };
  return companies[company] || company;
}

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadOrders() {
    if (!user) return;
    setFetching(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading orders:", error);
    } else {
      setOrders((data as Order[]) || []);
    }
    setFetching(false);
  }

  if (loading || fetching) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: "ประวัติคำสั่งซื้อ" }]} />
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          ประวัติคำสั่งซื้อ
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          ดูรายการคำสั่งซื้อทั้งหมดของคุณ
        </p>
      </section>

      {orders.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            ยังไม่มีคำสั่งซื้อ
          </p>
          <Button asChild>
            <Link href="/products">ไปเลือกซื้อสินค้า</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            // ถ้าสถานะเป็น completed ให้แสดงเป็น shipped แทน (สำหรับ user)
            const displayStatus = order.status === "completed" ? "shipped" : order.status;
            const status = statusConfig[displayStatus] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <div
                key={order.id}
                className="rounded-2xl border bg-card p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {order.order_number}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                          status.color
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium">วันที่สั่งซื้อ:</span>{" "}
                        {new Date(order.created_at).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                      <p>
                        <span className="font-medium">ยอดรวม:</span>{" "}
                        <span className="font-semibold text-primary">
                          ฿{Number(order.total_amount).toLocaleString("th-TH")}
                        </span>
                      </p>
                      {order.tracking_number && (
                        <p>
                          <span className="font-medium">เลขพัสดุ:</span>{" "}
                          {order.shipping_company && (
                            <span className="text-muted-foreground">
                              {getShippingCompanyName(order.shipping_company)} •{" "}
                            </span>
                          )}
                          <span className="font-mono">
                            {order.tracking_number}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/orders/${order.id}`}>ดูรายละเอียด</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
