"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";
import { Package, Truck, CheckCircle, Clock, XCircle, MapPin, Phone, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { PaymentDialog } from "@/components/payment/payment-dialog";
import { SlipVerificationDialog } from "@/components/payment/slip-verification-dialog";
import { CreditCard, Receipt, Copy, Check } from "lucide-react";
import { getBankName } from "@/lib/bank-codes";

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

type OrderItem = {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  product_name: string;
  product: {
    id: number;
    name: string;
    image_url: string | null;
  } | null;
};

type StatusHistory = {
  id: number;
  status: string;
  notes: string | null;
  created_at: string;
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
    label: "ชำระเงินแล้ว",
    icon: CheckCircle,
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300"
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

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSlipDialog, setShowSlipDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("qrcode");
  const [userBankAccount, setUserBankAccount] = useState<{
    accountName: string;
    accountNo: string;
    bankCode: string;
  } | null>(null);
  const [loadingBankAccount, setLoadingBankAccount] = useState(true);
  const [merchantBankAccounts, setMerchantBankAccounts] = useState<Array<{
    account_name: string;
    account_no: string;
    bank_code: string;
  }>>([]);
  const [loadingMerchantAccounts, setLoadingMerchantAccounts] = useState(true);
  const [copiedAccountIndex, setCopiedAccountIndex] = useState<number | null>(null);
  const loadedOrderIdRef = useRef<number | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && params.id) {
      const orderId = parseInt(params.id as string);
      // โหลดเฉพาะเมื่อ orderId เปลี่ยน หรือยังไม่เคยโหลด
      if (orderId !== loadedOrderIdRef.current && !isLoadingRef.current) {
      loadOrder();
      }
    }
    if (user) {
      loadUserBankAccount();
      loadMerchantBankAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.id]);

  async function loadUserBankAccount() {
    if (!user) return;
    setLoadingBankAccount(true);
    try {
      const { data, error } = await supabase
        .from("user_bank_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserBankAccount({
          accountName: data.account_name,
          accountNo: data.account_no,
          bankCode: data.bank_code
        });
      }
    } catch (err) {
      console.error("load bank account error", err);
    } finally {
      setLoadingBankAccount(false);
    }
  }

  async function loadMerchantBankAccounts() {
    setLoadingMerchantAccounts(true);
    try {
      const { data, error } = await supabase
        .from("slip_verification_settings")
        .select("bank_accounts")
        .eq("provider", "slipok")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (data && data.bank_accounts) {
        setMerchantBankAccounts(Array.isArray(data.bank_accounts) ? data.bank_accounts : []);
      } else {
        setMerchantBankAccounts([]);
      }
    } catch (err) {
      console.error("Load merchant bank accounts error:", err);
      setMerchantBankAccounts([]);
    } finally {
      setLoadingMerchantAccounts(false);
    }
  }

  async function copyToClipboard(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAccountIndex(index);
      setTimeout(() => setCopiedAccountIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  async function loadOrder() {
    if (!user || !params.id) return;

    const orderId = parseInt(params.id as string);
    
    // ป้องกันการโหลดซ้ำ
    if (loadedOrderIdRef.current === orderId && !isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);

    const [orderResult, itemsResult, historyResult] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("order_items")
        .select("*, product:products(id, name, image_url)")
        .eq("order_id", orderId),
      supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true })
    ]);

    if (orderResult.error) {
      console.error("Error loading order:", orderResult.error);
      router.replace("/orders");
      return;
    }

    if (itemsResult.error) {
      console.error("Error loading order items:", itemsResult.error);
    }

    if (historyResult.error) {
      console.error("Error loading status history:", historyResult.error);
    }

    setOrder(orderResult.data as Order);
    setItems((itemsResult.data as OrderItem[]) || []);
    setStatusHistory((historyResult.data as StatusHistory[]) || []);
    loadedOrderIdRef.current = orderId;
    setLoading(false);
    isLoadingRef.current = false;
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user || !order) {
    return null;
  }

  // ถ้าสถานะเป็น completed ให้แสดงเป็น shipped แทน (สำหรับ user)
  const displayStatus = order.status === "completed" ? "shipped" : order.status;
  const status = statusConfig[displayStatus] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "ประวัติคำสั่งซื้อ", href: "/orders" },
          { label: order.order_number }
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {order.order_number}
          </h1>
          <p className="text-sm text-muted-foreground">
            วันที่สั่งซื้อ:{" "}
            {new Date(order.created_at).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
            status.color
          )}
        >
          <StatusIcon className="h-4 w-4" />
          {status.label}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr,400px]">
        <div className="space-y-6">
          {/* Timeline */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <OrderTimeline
              history={statusHistory}
              currentStatus={displayStatus}
            />
          </div>

          {/* รายการสินค้า */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">รายการสินค้า</h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 rounded-lg border p-4">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded border bg-muted">
                    {item.product?.image_url ? (
                      <Image
                        src={item.product.image_url}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        ไม่มีรูป
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.product_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      จำนวน {item.quantity} ชิ้น
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      ฿{Number(item.price).toLocaleString("th-TH")} ต่อชิ้น
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ฿
                      {(Number(item.price) * item.quantity).toLocaleString(
                        "th-TH"
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ข้อมูลการจัดส่ง */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">ข้อมูลการจัดส่ง</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">ชื่อผู้รับ</p>
                  <p className="font-medium">{order.shipping_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">เบอร์โทรศัพท์</p>
                  <p className="font-medium">{order.shipping_phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">ที่อยู่จัดส่ง</p>
                  <p className="font-medium whitespace-pre-line">
                    {order.shipping_address}
                  </p>
                </div>
              </div>
              {order.tracking_number && (
                <div className="flex items-start gap-2">
                  <Truck className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">เลขพัสดุ</p>
                    {order.shipping_company && (
                      <p className="text-sm font-medium mb-1">
                        {getShippingCompanyName(order.shipping_company)}
                      </p>
                    )}
                    <p className="font-mono font-medium">
                      {order.tracking_number}
                    </p>
                  </div>
                </div>
              )}
              {order.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">หมายเหตุ</p>
                  <p className="text-sm whitespace-pre-line">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* สรุปคำสั่งซื้อ */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm h-fit">
          <h2 className="mb-4 text-lg font-semibold">สรุปคำสั่งซื้อ</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ยอดรวมสินค้า</span>
              <span>฿{Number(order.total_amount).toLocaleString("th-TH")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ค่าจัดส่ง</span>
              <span>ฟรี</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between">
                <span className="font-semibold">ยอดรวมทั้งสิ้น</span>
                <span className="text-lg font-semibold text-primary">
                  ฿{Number(order.total_amount).toLocaleString("th-TH")}
                </span>
              </div>
            </div>
          </div>
          
          {order.status === "pending" && (
            <div className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label className="text-sm">ช่องทางชำระเงิน</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors">
                    <input
                      type="radio"
                      name="payment_method"
                      value="qrcode"
                      checked={selectedPaymentMethod === "qrcode"}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      className="h-4 w-4"
                    />
                    <CreditCard className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">QR Code</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors">
                    <input
                      type="radio"
                      name="payment_method"
                      value="slip"
                      checked={selectedPaymentMethod === "slip"}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      className="h-4 w-4"
                    />
                    <Receipt className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">โอนธนาคาร</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* แสดงข้อมูลบัญชีธนาคารสำหรับโอนธนาคาร */}
              {selectedPaymentMethod === "slip" && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">ข้อมูลบัญชีสำหรับโอนเงิน</p>
                  {loadingMerchantAccounts ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : merchantBankAccounts.length > 0 ? (
                    <div className="space-y-3">
                      {merchantBankAccounts.map((account, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">ชื่อบัญชี</p>
                            <p className="text-sm font-medium">{account.account_name}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">เลขบัญชี</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium font-mono">{account.account_no}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(account.account_no, index)}
                              >
                                {copiedAccountIndex === index ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">ธนาคาร</p>
                            <p className="text-sm font-medium">
                              {getBankName(account.bank_code) || account.bank_code}
                            </p>
                          </div>
                          {index < merchantBankAccounts.length - 1 && (
                            <div className="border-t pt-3" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      ยังไม่มีการตั้งค่าบัญชีธนาคาร
                    </p>
                  )}
                </div>
              )}

            <Button
                className="w-full"
                onClick={() => {
                  if (selectedPaymentMethod === "qrcode") {
                    if (!userBankAccount && !loadingBankAccount) {
                      router.push("/profile");
                    } else {
                      setShowPaymentDialog(true);
                    }
                  } else {
                    setShowSlipDialog(true);
                  }
                }}
                disabled={loadingBankAccount && selectedPaymentMethod === "qrcode"}
            >
                {selectedPaymentMethod === "qrcode" ? (
                  <>
              <CreditCard className="mr-2 h-4 w-4" />
                    {loadingBankAccount ? "กำลังโหลด..." : "ชำระเงินผ่าน QR Code"}
                  </>
                ) : (
                  <>
                    <Receipt className="mr-2 h-4 w-4" />
                    ยืนยันชำระเงิน
                  </>
                )}
            </Button>
              {order.status === "pending" && selectedPaymentMethod === "qrcode" && !userBankAccount && !loadingBankAccount && (
                <p className="text-xs text-destructive text-center">
                  กรุณากรอกข้อมูลบัญชีธนาคารในโปรไฟล์ก่อนชำระเงิน
                </p>
              )}
            </div>
          )}
          
          <Button variant="outline" className="mt-2 w-full" asChild>
            <Link href="/orders">กลับไปประวัติคำสั่งซื้อ</Link>
          </Button>
        </div>
      </div>

      {/* Payment Dialog - QR Code */}
      {order.status === "pending" && user && userBankAccount && selectedPaymentMethod === "qrcode" && (
        <PaymentDialog
          key={order.order_number}
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          orderId={order.order_number}
          amount={order.total_amount}
          userId={user.id}
          bankAccount={userBankAccount}
          onPaymentSuccess={() => {
            loadOrder();
          }}
        />
      )}

      {/* Slip Verification Dialog */}
      {order.status === "pending" && user && selectedPaymentMethod === "slip" && (
        <SlipVerificationDialog
          open={showSlipDialog}
          onOpenChange={setShowSlipDialog}
          orderId={order.id}
          amount={order.total_amount}
          onPaymentSuccess={() => {
            loadOrder();
          }}
        />
      )}
    </div>
  );
}

