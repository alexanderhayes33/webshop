"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useAlert } from "@/lib/alert";
import { Package, Truck, CheckCircle, Clock, XCircle, Search, X, User, Phone, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
  user_id: string;
};

type OrderItem = {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  product_name: string;
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
  completed: {
    label: "สำเร็จ",
    icon: CheckCircle,
    color: "text-green-600 bg-green-100 dark:bg-green-500/10 dark:text-green-300"
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

export default function AdminOrdersPage() {
  const { showAlert, showConfirm } = useAlert();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"all" | "completed">("all");
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [form, setForm] = useState({
    status: "",
    tracking_number: "",
    shipping_company: ""
  });


  async function loadOrders() {
    setFetching(true);
    let query = supabase.from("orders").select("*");

    if (selectedTab === "completed") {
      query = query.eq("status", "completed");
    } else {
      query = query.neq("status", "completed");
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading orders:", error);
    } else {
      setOrders((data as Order[]) || []);
    }
    setFetching(false);
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab]);

  function startEdit(order: Order) {
    setSelectedOrder(order);
    setForm({
      status: order.status,
      tracking_number: order.tracking_number || "",
      shipping_company: order.shipping_company || ""
    });
  }

  function cancelEdit() {
    setSelectedOrder(null);
    setForm({ status: "", tracking_number: "", shipping_company: "" });
  }

  async function handleUpdate() {
    if (!selectedOrder) return;
    setUpdating(true);

    const updateData: any = {
      status: form.status
    };

    if (form.status === "shipped") {
      if (form.tracking_number) {
        updateData.tracking_number = form.tracking_number;
      }
      if (form.shipping_company) {
        updateData.shipping_company = form.shipping_company;
      }
    }

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", selectedOrder.id);

    // Trigger จะบันทึกประวัติอัตโนมัติ

    if (error) {
      await showAlert("เกิดข้อผิดพลาดในการอัปเดต", {
        title: "เกิดข้อผิดพลาด"
      });
    } else {
      await loadOrders();
      cancelEdit();
      await showAlert("อัปเดตสถานะเรียบร้อยแล้ว", {
        title: "สำเร็จ"
      });
    }

    setUpdating(false);
  }

  function toggleOrderSelection(orderId: number) {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }

  async function handleBulkAction() {
    if (selectedOrders.size === 0) {
      await showAlert("กรุณาเลือกออเดอร์ที่ต้องการจัดการ", {
        title: "แจ้งเตือน"
      });
      return;
    }

    if (bulkAction === "delete") {
      const confirmed = await showConfirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบ ${selectedOrders.size} ออเดอร์?`,
        {
          title: "ยืนยันการลบ",
          description: "การกระทำนี้ไม่สามารถยกเลิกได้"
        }
      );
      if (!confirmed) return;

      setUpdating(true);
      const { error } = await supabase
        .from("orders")
        .delete()
        .in("id", Array.from(selectedOrders));

      if (error) {
        await showAlert("เกิดข้อผิดพลาดในการลบ", {
          title: "เกิดข้อผิดพลาด"
        });
      } else {
        await loadOrders();
        setSelectedOrders(new Set());
        await showAlert("ลบออเดอร์เรียบร้อยแล้ว", {
          title: "สำเร็จ"
        });
      }
      setUpdating(false);
    } else if (bulkAction === "completed") {
      setUpdating(true);
      const { error } = await supabase
        .from("orders")
        .update({ status: "completed" })
        .in("id", Array.from(selectedOrders));

      if (error) {
        await showAlert("เกิดข้อผิดพลาดในการอัปเดต", {
          title: "เกิดข้อผิดพลาด"
        });
      } else {
        await loadOrders();
        setSelectedOrders(new Set());
        await showAlert("อัปเดตสถานะเรียบร้อยแล้ว", {
          title: "สำเร็จ"
        });
      }
      setUpdating(false);
    }

    setBulkAction("");
  }

  async function deleteOrder(id: number) {
    const confirmed = await showConfirm(
      "คุณแน่ใจหรือไม่ว่าต้องการลบออเดอร์นี้?",
      {
        title: "ยืนยันการลบ",
        description: "การกระทำนี้ไม่สามารถยกเลิกได้"
      }
    );
    if (!confirmed) return;

    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) {
      await showAlert("เกิดข้อผิดพลาดในการลบ", {
        title: "เกิดข้อผิดพลาด"
      });
    } else {
      await loadOrders();
      if (selectedOrder?.id === id) {
        cancelEdit();
      }
      await showAlert("ลบออเดอร์เรียบร้อยแล้ว", {
        title: "สำเร็จ"
      });
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(query) ||
      order.shipping_name.toLowerCase().includes(query) ||
      order.shipping_phone.includes(query) ||
      (order.tracking_number?.toLowerCase().includes(query) ?? false)
    );
  });

  function toggleSelectAll() {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)));
    }
  }

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "แอดมิน", href: "/admin" },
          { label: "จัดการคำสั่งซื้อ" }
        ]}
      />
      <section className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            จัดการคำสั่งซื้อ
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            ดูและอัปเดตสถานะคำสั่งซื้อทั้งหมด
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            type="button"
            onClick={() => {
              setSelectedTab("all");
              setSelectedOrders(new Set());
            }}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              selectedTab === "all"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            ทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTab("completed");
              setSelectedOrders(new Set());
            }}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              selectedTab === "completed"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            สำเร็จ
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedOrders.size > 0 && (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
            <span className="text-xs text-muted-foreground">
              เลือกแล้ว {selectedOrders.size} ออเดอร์
            </span>
            <Select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="h-8 text-xs"
            >
              <option value="">-- เลือกการจัดการ --</option>
              <option value="completed">เปลี่ยนเป็นสำเร็จ</option>
              <option value="delete">ลบออเดอร์</option>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={handleBulkAction}
              disabled={!bulkAction || updating}
            >
              {updating ? "กำลังดำเนินการ..." : "ดำเนินการ"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setSelectedOrders(new Set())}
            >
              ยกเลิก
            </Button>
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-[1fr,400px]">
        {/* รายการคำสั่งซื้อ */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                รายการคำสั่งซื้อ ({filteredOrders.length}/{orders.length})
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ค้นหา (หมายเลข, ชื่อ, เบอร์, เลขพัสดุ)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-7 pr-7 text-xs"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {fetching ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "ไม่พบคำสั่งซื้อ" : "ยังไม่มีคำสั่งซื้อ"}
            </p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredOrders.length > 0 && (
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      selectedOrders.size > 0 &&
                      selectedOrders.size === filteredOrders.length
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">
                    เลือกทั้งหมด
                  </span>
                </div>
              )}
              {filteredOrders.map((order) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                const isSelected = selectedOrders.has(order.id);
                return (
                  <div
                    key={order.id}
                    className={cn(
                      "rounded-lg border p-3 transition cursor-pointer hover:border-primary/50",
                      selectedOrder?.id === order.id && "border-primary bg-primary/5",
                      isSelected && "border-primary/50 bg-primary/5"
                    )}
                    onClick={() => startEdit(order)}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleOrderSelection(order.id);
                        }}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold truncate">
                            {order.order_number}
                          </h3>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                              status.color
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {order.shipping_name} •{" "}
                          {new Date(order.created_at).toLocaleDateString("th-TH")}
                        </p>
                        <p className="text-xs font-semibold text-primary">
                          ฿{Number(order.total_amount).toLocaleString("th-TH")}
                        </p>
                        {order.tracking_number && (
                          <p className="text-[10px] text-muted-foreground">
                            {order.shipping_company && (
                              <span className="font-medium">
                                {getShippingCompanyName(order.shipping_company)} •{" "}
                              </span>
                            )}
                            <span className="font-mono">
                              {order.tracking_number}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(order);
                          }}
                        >
                          จัดการ
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px] text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteOrder(order.id);
                          }}
                        >
                          ลบ
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ข้อมูลลูกค้าและฟอร์มอัปเดตสถานะ */}
        <div className="space-y-4">
          {/* ข้อมูลลูกค้า */}
          {selectedOrder && (
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold">ข้อมูลลูกค้า</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">ชื่อผู้รับ</p>
                    <p className="text-sm font-medium break-words">{selectedOrder.shipping_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">เบอร์โทรศัพท์</p>
                    <p className="text-sm font-medium">{selectedOrder.shipping_phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">ที่อยู่จัดส่ง</p>
                    <p className="text-sm font-medium whitespace-pre-line break-words">
                      {selectedOrder.shipping_address}
                    </p>
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">หมายเหตุ</p>
                    <p className="text-sm whitespace-pre-line break-words">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* ฟอร์มอัปเดตสถานะ */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          {selectedOrder ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">อัปเดตสถานะ</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={cancelEdit}
                >
                  ยกเลิก
                </Button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-xs">
                    สถานะ
                  </Label>
                  <Select
                    id="status"
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                    className="h-9 text-sm"
                  >
                    <option value="pending">รอดำเนินการ</option>
                    <option value="confirmed">ยืนยันแล้ว</option>
                    <option value="processing">กำลังเตรียมสินค้า</option>
                    <option value="shipped">จัดส่งแล้ว</option>
                    <option value="completed">สำเร็จ</option>
                    <option value="cancelled">ยกเลิก</option>
                  </Select>
                </div>
                {form.status === "shipped" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="shipping_company" className="text-xs">
                        บริษัทขนส่ง
                      </Label>
                      <Select
                        id="shipping_company"
                        value={form.shipping_company}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            shipping_company: e.target.value
                          }))
                        }
                        className="h-9 text-sm"
                      >
                        <option value="">-- เลือกขนส่ง --</option>
                        <option value="kerry">Kerry Express</option>
                        <option value="ems">ไปรษณีย์ไทย (EMS)</option>
                        <option value="jt">J&T Express</option>
                        <option value="flash">Flash Express</option>
                        <option value="ninja">Ninja Van</option>
                        <option value="dhl">DHL</option>
                        <option value="fedex">FedEx</option>
                        <option value="other">อื่นๆ</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tracking_number" className="text-xs">
                        เลขพัสดุ
                      </Label>
                      <Input
                        id="tracking_number"
                        value={form.tracking_number}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            tracking_number: e.target.value
                          }))
                        }
                        placeholder="เช่น TH123456789TH"
                        className="h-9 text-sm"
                      />
                    </div>
                  </>
                )}
                <Button
                  className="w-full text-xs"
                  onClick={handleUpdate}
                  disabled={updating}
                >
                  {updating ? "กำลังอัปเดต..." : "อัปเดตสถานะ"}
                </Button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-xs text-muted-foreground">
                เลือกคำสั่งซื้อเพื่ออัปเดตสถานะ
              </p>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
