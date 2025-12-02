"use client";

import { Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusHistory = {
  id: number;
  status: string;
  notes: string | null;
  created_at: string;
};

const statusConfig: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
  }
> = {
  pending: {
    label: "รอดำเนินการ",
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-500/10"
  },
  confirmed: {
    label: "ยืนยันแล้ว",
    icon: CheckCircle,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-500/10"
  },
  processing: {
    label: "กำลังเตรียมสินค้า",
    icon: Package,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-500/10"
  },
    shipped: {
      label: "จัดส่งแล้ว",
      icon: Truck,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-500/10"
    },
    completed: {
      label: "สำเร็จ",
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-500/10"
    },
    cancelled: {
      label: "ยกเลิก",
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    }
};

type OrderTimelineProps = {
  history: StatusHistory[];
  currentStatus: string;
};

export function OrderTimeline({ history, currentStatus }: OrderTimelineProps) {
  // กรองสถานะ "completed" ออกจากประวัติ (สำหรับ user)
  const filteredHistory = history.filter((h) => h.status !== "completed");
  
  // ถ้าสถานะปัจจุบันเป็น "completed" ให้แสดงเป็น "shipped" แทน
  const displayStatus = currentStatus === "completed" ? "shipped" : currentStatus;
  
  // เรียงลำดับจากใหม่ไปเก่า
  const sortedHistory = [...filteredHistory].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // หาสถานะที่แสดงใน timeline (รวมสถานะปัจจุบัน)
  const timelineStatuses = new Map<string, StatusHistory>();
  
  // เพิ่มสถานะปัจจุบันถ้ายังไม่มีในประวัติ
  const currentStatusHistory = sortedHistory.find(
    (h) => h.status === displayStatus
  );
  if (!currentStatusHistory && displayStatus !== "completed") {
    timelineStatuses.set(displayStatus, {
      id: 0,
      status: displayStatus,
      notes: null,
      created_at: new Date().toISOString()
    } as StatusHistory);
  }

  // เพิ่มประวัติทั้งหมด (กรอง completed ออกแล้ว)
  sortedHistory.forEach((h) => {
    if (!timelineStatuses.has(h.status)) {
      timelineStatuses.set(h.status, h);
    }
  });

    // เรียงลำดับตามสถานะ (pending -> confirmed -> processing -> shipped -> cancelled)
    // ไม่รวม completed เพราะ user ไม่ควรเห็น
    const statusOrder = ["pending", "confirmed", "processing", "shipped", "cancelled"];
  const timeline = Array.from(timelineStatuses.values()).sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">สถานะคำสั่งซื้อ</h3>
      <div className="relative">
        {/* เส้น timeline */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        {/* Timeline items */}
        <div className="space-y-6">
          {timeline.map((item, index) => {
            const config = statusConfig[item.status] || statusConfig.pending;
            const Icon = config.icon;
            const isActive = item.status === currentStatus;
            const isPast = statusOrder.indexOf(item.status) < statusOrder.indexOf(currentStatus);
            const isFuture = statusOrder.indexOf(item.status) > statusOrder.indexOf(currentStatus);

            return (
              <div key={item.id || item.status} className="relative flex gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                    isActive
                      ? `${config.bgColor} ${config.color} border-current`
                      : isPast
                        ? `${config.bgColor} ${config.color} border-current`
                        : "bg-muted border-muted-foreground/30"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isActive || isPast
                        ? config.color
                        : "text-muted-foreground"
                    )}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isActive
                          ? config.color
                          : isPast
                            ? "text-foreground"
                            : "text-muted-foreground"
                      )}
                    >
                      {config.label}
                    </p>
                    {isActive && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        ปัจจุบัน
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                  {item.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

