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
    label: "ชำระเงินแล้ว",
    icon: CheckCircle,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-500/10"
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
  
  // เรียงลำดับตามสถานะ (pending -> confirmed -> processing -> shipped -> cancelled)
  // ไม่รวม completed เพราะ user ไม่ควรเห็น
  const statusOrder = ["pending", "confirmed", "processing", "shipped", "cancelled"];

  // สร้าง timeline ที่มีทุกขั้นตอน
  const allStatuses = statusOrder.map((status) => {
    const historyItem = filteredHistory.find((item) => item.status === status);
    if (historyItem) {
      return historyItem;
    }
    // ถ้ายังไม่มีในประวัติ ให้สร้าง item ใหม่ (สำหรับแสดงขั้นตอนที่ยังไม่ถึง)
    return {
      id: 0,
      status,
      notes: null,
      created_at: new Date().toISOString()
    } as StatusHistory;
  });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">สถานะคำสั่งซื้อ</h3>
      <div className="relative">
        {/* Timeline แนวนอน */}
        <div className="flex items-start gap-0 overflow-x-auto pb-6">
          {allStatuses.map((item, index) => {
            const config = statusConfig[item.status] || statusConfig.pending;
            const Icon = config.icon;
            const isActive = item.status === displayStatus;
            const isPast = statusOrder.indexOf(item.status) < statusOrder.indexOf(displayStatus);
            const isLast = index === allStatuses.length - 1;

            return (
              <div key={item.status} className="flex flex-col items-center flex-shrink-0 flex-1 min-w-[120px]">
                {/* Icon และเส้นเชื่อม */}
                <div className="flex items-center w-full relative">
                  {/* Icon */}
                  <div
                    className={cn(
                      "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all flex-shrink-0 mx-auto",
                      isActive
                        ? `${config.bgColor} ${config.color} border-current`
                        : isPast
                          ? `${config.bgColor} ${config.color} border-current opacity-70`
                          : "bg-muted border-muted-foreground/30"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        isActive || isPast
                          ? config.color
                          : "text-muted-foreground"
                      )}
                    />
                  </div>

                  {/* เส้นเชื่อม (ไม่แสดงเส้นสุดท้าย) */}
                  {!isLast && (() => {
                    // หาสีของเส้นเชื่อมตามสถานะ
                    let lineColor = "bg-border";
                    
                    if (isPast) {
                      // ถ้าขั้นตอนปัจจุบันผ่านแล้ว ให้ใช้สีของขั้นตอนปัจจุบัน
                      if (config.color.includes("amber")) {
                        lineColor = "bg-amber-500";
                      } else if (config.color.includes("emerald")) {
                        lineColor = "bg-emerald-500";
                      } else if (config.color.includes("purple")) {
                        lineColor = "bg-purple-500";
                      } else if (config.color.includes("green")) {
                        lineColor = "bg-green-500";
                      } else if (config.color.includes("destructive")) {
                        lineColor = "bg-destructive";
                      }
                    } else if (isActive) {
                      // ถ้าขั้นตอนปัจจุบันเป็นขั้นตอนปัจจุบัน ให้ใช้สีของขั้นตอนปัจจุบัน
                      if (config.color.includes("amber")) {
                        lineColor = "bg-amber-500";
                      } else if (config.color.includes("emerald")) {
                        lineColor = "bg-emerald-500";
                      } else if (config.color.includes("purple")) {
                        lineColor = "bg-purple-500";
                      } else if (config.color.includes("green")) {
                        lineColor = "bg-green-500";
                      } else if (config.color.includes("destructive")) {
                        lineColor = "bg-destructive";
                      }
                    }
                    
                    return (
                      <div
                        className={cn(
                          "absolute left-1/2 right-0 h-0.5 top-1/2 -translate-y-1/2 z-0",
                          lineColor
                        )}
                        style={{ left: "50%", right: "-50%" }}
                      />
                    );
                  })()}
                </div>

                {/* Content */}
                <div className="mt-3 text-center w-full px-2">
                  <p
                    className={cn(
                      "text-xs font-medium mb-1.5 leading-tight",
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
                    <span className="inline-block rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary mb-1">
                      ปัจจุบัน
                    </span>
                  )}
                  {item.id !== 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                      {new Date(item.created_at).toLocaleDateString("th-TH", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
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
