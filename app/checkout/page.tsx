"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useAlert } from "@/lib/alert";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { PaymentDialog } from "@/components/payment/payment-dialog";
import { SlipVerificationDialog } from "@/components/payment/slip-verification-dialog";
import { CreditCard, QrCode, Receipt, Copy, Check } from "lucide-react";
import { BANK_CODES } from "@/lib/bank-codes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Promotion = {
  id: number;
  title: string;
  description: string | null;
  promo_code: string | null;
  discount_percent: number | null;
  min_purchase_amount: number | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, loading: cartLoading, getTotalPrice, clearCart } = useCart();
  const { showAlert } = useAlert();
  const [saving, setSaving] = useState(false);
  const [loadingShipping, setLoadingShipping] = useState(true);
  const [availableShippingMethods, setAvailableShippingMethods] = useState<any[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<number | null>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: ""
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("qrcode");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSlipDialog, setShowSlipDialog] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [userBankAccount, setUserBankAccount] = useState<{
    accountName: string;
    accountNo: string;
    bankCode: string;
  } | null>(null);
  const [loadingBankAccount, setLoadingBankAccount] = useState(true);
  const [showBankAccountDialog, setShowBankAccountDialog] = useState(false);
  const [merchantBankAccounts, setMerchantBankAccounts] = useState<Array<{
    account_name: string;
    account_no: string;
    bank_code: string;
  }>>([]);
  const [loadingMerchantAccounts, setLoadingMerchantAccounts] = useState(true);
  const [copiedAccountIndex, setCopiedAccountIndex] = useState<number | null>(null);

  const loadMerchantBankAccounts = useCallback(async () => {
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
  }, []);

  const loadUserBankAccount = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
    if (user) {
      setForm({
        name: user.user_metadata?.full_name || "",
        phone: user.user_metadata?.phone || "",
        address: "",
        notes: ""
      });
      loadUserBankAccount();
      loadMerchantBankAccounts();
    }
  }, [user, authLoading, router, loadUserBankAccount, loadMerchantBankAccounts]);

  useEffect(() => {
    if (!cartLoading && items.length === 0 && user) {
      router.replace("/cart");
    }
  }, [items, cartLoading, router, user]);

  useEffect(() => {
    async function loadShippingMethods() {
      if (items.length === 0) return;

      setLoadingShipping(true);
      try {
        // ดึงข้อมูล shipping methods ทั้งหมดที่ active
        const { data: methodsData, error: methodsError } = await supabase
          .from("shipping_methods")
          .select("*")
          .eq("is_active", true)
          .order("id", { ascending: true });

        if (methodsError) throw methodsError;

        setAvailableShippingMethods(methodsData || []);
        
        // เลือก shipping method แรกเป็นค่าเริ่มต้น
        if (methodsData && methodsData.length > 0) {
          setSelectedShippingMethod(methodsData[0].id);
          await calculateShippingCost(methodsData[0]);
        }
      } catch (error: any) {
        console.error("Error loading shipping methods:", error);
        showAlert("เกิดข้อผิดพลาดในการโหลดวิธีการจัดส่ง", {
          title: "เกิดข้อผิดพลาด"
        });
      } finally {
        setLoadingShipping(false);
      }
    }

    if (items.length > 0 && !cartLoading) {
      loadShippingMethods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, cartLoading]);

  async function calculateShippingCost(method: any) {
    let totalCost = Number(method.base_price || 0);
    
    // ถ้ามี price_per_kg ให้คำนวณเพิ่ม (สมมติว่าน้ำหนักรวม 1 กก. ต่อสินค้า 1 ชิ้น)
    if (method.price_per_kg) {
      const totalWeight = items.reduce((sum, item) => sum + item.quantity, 0);
      totalCost += Number(method.price_per_kg) * totalWeight;
    }

    setShippingCost(totalCost);
  }

  async function handleShippingMethodChange(methodId: number) {
    const method = availableShippingMethods.find((m) => m.id === methodId);
    if (method) {
      setSelectedShippingMethod(methodId);
      await calculateShippingCost(method);
    }
  }

  if (authLoading || cartLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user || items.length === 0) {
    return null;
  }

  const productTotal = getTotalPrice();
  const discountAmount =
    appliedPromotion?.discount_percent && appliedPromotion.discount_percent > 0
      ? Math.max(0, (productTotal * appliedPromotion.discount_percent) / 100)
      : 0;
  const payableAmount = Math.max(productTotal - discountAmount, 0) + shippingCost;

  const generateOrderNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random}`;
  };

  const applyPromotion = async () => {
    if (!promoCodeInput.trim()) {
      await showAlert("กรุณากรอกรหัสโปรโมชัน", { title: "แจ้งเตือน" });
      return;
    }

    setApplyingPromo(true);
    setPromoMessage(null);
    try {
      const code = promoCodeInput.trim();
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("is_active", true)
        .ilike("promo_code", code)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setAppliedPromotion(null);
        setPromoMessage("ไม่พบรหัสโปรโมชันนี้");
        return;
      }

      const promo = data as Promotion;
      const now = new Date();
      const startDate = promo.start_date ? new Date(promo.start_date) : null;
      const endDate = promo.end_date ? new Date(promo.end_date) : null;

      if (
        (startDate && startDate > now) ||
        (endDate && endDate < now) ||
        !promo.is_active
      ) {
        setAppliedPromotion(null);
        setPromoMessage("รหัสนี้หมดอายุหรือปิดใช้งานแล้ว");
        return;
      }

      if (promo.min_purchase_amount && productTotal < promo.min_purchase_amount) {
        setAppliedPromotion(null);
        setPromoMessage(
          `ต้องมียอดซื้อขั้นต่ำ ฿${Number(promo.min_purchase_amount).toLocaleString(
            "th-TH"
          )}`
        );
        return;
      }

      if (!promo.discount_percent || promo.discount_percent <= 0) {
        setAppliedPromotion(null);
        setPromoMessage("รหัสนี้ไม่มีส่วนลดที่รองรับ");
        return;
      }

      setAppliedPromotion(promo);
      setPromoMessage("ใช้รหัสโปรโมชันเรียบร้อยแล้ว");
    } catch (err) {
      console.error("apply promo error", err);
      setAppliedPromotion(null);
      setPromoMessage("ไม่สามารถใช้รหัสได้ กรุณาลองอีกครั้ง");
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address) {
      await showAlert("กรุณากรอกข้อมูลให้ครบถ้วน", {
        title: "แจ้งเตือน"
      });
      return;
    }

    setSaving(true);
    try {
      // ตรวจสอบสต็อกสินค้าก่อนสร้างออเดอร์
      for (const item of items) {
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("stock, name")
          .eq("id", item.product_id)
          .single();

        if (productError) throw productError;

        const currentStock = product.stock || 0;
        if (currentStock < item.quantity) {
          await showAlert(
            `สินค้า "${product.name}" มีสต็อกไม่เพียงพอ (สต็อกคงเหลือ: ${currentStock} ชิ้น)`,
            {
              title: "สต็อกไม่เพียงพอ"
            }
          );
          setSaving(false);
          return;
        }
      }

      if (!selectedShippingMethod) {
        await showAlert("กรุณาเลือกวิธีการจัดส่ง", {
          title: "แจ้งเตือน"
        });
        setSaving(false);
        return;
      }

      if (!selectedPaymentMethod) {
        await showAlert("กรุณาเลือกช่องทางชำระเงิน", {
          title: "แจ้งเตือน"
        });
        setSaving(false);
        return;
      }

      // ตรวจสอบว่ามีข้อมูลบัญชีธนาคารหรือไม่ (สำหรับ QR Code payment)
      if (selectedPaymentMethod === "qrcode" && !userBankAccount) {
        setSaving(false);
        setShowBankAccountDialog(true);
        return;
      }

      // สำหรับ SlipOK payment ไม่ต้องตรวจสอบข้อมูลบัญชี

      if (
        appliedPromotion &&
        appliedPromotion.min_purchase_amount &&
        productTotal < appliedPromotion.min_purchase_amount
      ) {
        await showAlert(
          `ยอดสั่งซื้อไม่ถึงขั้นต่ำ ฿${Number(
            appliedPromotion.min_purchase_amount
          ).toLocaleString("th-TH")} สำหรับโค้ดนี้`,
          { title: "แจ้งเตือน" }
        );
        setSaving(false);
        return;
      }

      const orderNumber = generateOrderNumber();
      const totalAmount = payableAmount;

      // สร้าง order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: "pending",
          total_amount: totalAmount,
          shipping_cost: shippingCost,
          shipping_method_id: selectedShippingMethod,
          shipping_name: form.name,
          shipping_phone: form.phone,
          shipping_address: form.address,
          notes: form.notes || null
        })
        .select("*")
        .single();

      if (orderError) throw orderError;

      // สร้าง order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: Number(item.product.price),
        product_name: item.product.name
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // ลดสต็อกสินค้า (ใช้ function เพื่อป้องกัน race condition)
      for (const item of items) {
        const { error: stockError } = await supabase.rpc("decrement_stock", {
          product_id_param: item.product_id,
          quantity_param: item.quantity
        });

        if (stockError) {
          // ถ้าเป็น error เรื่องสต็อกไม่พอ ให้ rollback order และ order_items
          await supabase.from("order_items").delete().eq("order_id", order.id);
          await supabase.from("orders").delete().eq("id", order.id);
          
          // แสดง error message ที่เข้าใจง่าย
          const errorMessage = stockError.message || "เกิดข้อผิดพลาดในการอัปเดตสต็อกสินค้า";
          if (errorMessage.includes("Insufficient stock")) {
            await showAlert(
              "สินค้าบางรายการมีสต็อกไม่เพียงพอ กรุณาตรวจสอบและลองใหม่อีกครั้ง",
              {
                title: "สต็อกไม่เพียงพอ"
              }
            );
          } else {
            throw new Error(errorMessage);
          }
          return;
        }
      }

      // บันทึก order เพื่อแสดง payment dialog
      setCreatedOrder(order);
      
      // แสดง payment dialog ตามช่องทางที่เลือก
      if (selectedPaymentMethod === "slip") {
        setShowSlipDialog(true);
      } else {
      setShowPaymentDialog(true);
      }
      
      // ล้างตะกร้าหลังจากแสดง payment dialog แล้ว
      // (จะล้างเมื่อปิด dialog หรือชำระเงินสำเร็จ)
    } catch (error: any) {
      console.error("Error creating order:", error);
      await showAlert("เกิดข้อผิดพลาดในการสั่งซื้อ กรุณาลองใหม่อีกครั้ง", {
        title: "เกิดข้อผิดพลาด"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "ตะกร้าสินค้า", href: "/cart" },
          { label: "ชำระเงิน" }
        ]}
      />

      <h1 className="text-2xl font-semibold tracking-tight">ชำระเงิน</h1>

      <div className="grid gap-6 md:grid-cols-[1fr,400px]">
        {/* ฟอร์มข้อมูลการจัดส่ง */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">ข้อมูลการจัดส่ง</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อ-นามสกุล</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="ชื่อ-นามสกุล"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="08X-XXX-XXXX"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">ที่อยู่จัดส่ง</Label>
              <textarea
                id="address"
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="ที่อยู่จัดส่ง"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping_method">วิธีการจัดส่ง *</Label>
              {loadingShipping ? (
                <Skeleton className="h-10 w-full" />
              ) : availableShippingMethods.length === 0 ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  ไม่มีวิธีการจัดส่งที่รองรับสำหรับสินค้าในตะกร้า กรุณาติดต่อร้านค้า
                </div>
              ) : (
                <>
                  <Select
                    id="shipping_method"
                    value={selectedShippingMethod?.toString() || ""}
                    onChange={async (e) => await handleShippingMethodChange(Number(e.target.value))}
                    required
                    className="h-10"
                  >
                    <option value="">-- เลือกวิธีการจัดส่ง --</option>
                    {availableShippingMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                        {method.estimated_days
                          ? ` (${method.estimated_days} วัน)`
                          : ""}
                      </option>
                    ))}
                  </Select>
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">หมายเหตุ (ไม่บังคับ)</Label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="หมายเหตุเพิ่มเติม"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">ช่องทางชำระเงิน *</Label>
              <div className="space-y-2">
                <label
                  htmlFor="payment_qrcode"
                  className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors"
                >
                  <input
                    type="radio"
                    id="payment_qrcode"
                    name="payment_method"
                    value="qrcode"
                    checked={selectedPaymentMethod === "qrcode"}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="h-4 w-4"
                  />
                  <QrCode className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">QR Code (พร้อมเพย์)</p>
                    <p className="text-xs text-muted-foreground">
                      สแกน QR Code เพื่อชำระเงินผ่านแอปธนาคาร
                    </p>
                  </div>
                </label>
                <label
                  htmlFor="payment_slip"
                  className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors"
                >
                  <input
                    type="radio"
                    id="payment_slip"
                    name="payment_method"
                    value="slip"
                    checked={selectedPaymentMethod === "slip"}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="h-4 w-4"
                  />
                  <Receipt className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">โอนธนาคาร</p>
                    <p className="text-xs text-muted-foreground">
                      อัพโหลดสลิป
                    </p>
                  </div>
                </label>
                {selectedPaymentMethod === "slip" && (
                  <div className="mt-3 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      โอนเงินเข้าบัญชี:
                    </p>
                    {loadingMerchantAccounts ? (
                      <div className="space-y-2">
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : merchantBankAccounts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        ยังไม่มีการตั้งค่าบัญชีรับเงิน
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {merchantBankAccounts.map((account, index) => {
                          const bankName = BANK_CODES.find(b => b.code === account.bank_code)?.name || account.bank_code;
                          const isCopied = copiedAccountIndex === index;
                          
                          const handleCopy = async () => {
                            try {
                              await navigator.clipboard.writeText(account.account_no);
                              setCopiedAccountIndex(index);
                              setTimeout(() => setCopiedAccountIndex(null), 2000);
                            } catch (err) {
                              console.error("Failed to copy:", err);
                            }
                          };
                          
                          return (
                            <div
                              key={index}
                              className="rounded-lg border-2 border-primary/30 bg-background p-4 space-y-3 shadow-sm"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">ชื่อบัญชี :</span>
                                  <p className="text-sm font-semibold text-foreground">{account.account_name}</p>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm text-muted-foreground">เลขบัญชี :</span>
                                  <div className="flex items-center gap-2 flex-1 justify-end">
                                    <p className="text-base font-mono font-bold text-primary">
                                      {account.account_no}
                                    </p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={handleCopy}
                                      className="h-7 w-7 p-0 shrink-0"
                                    >
                                      {isCopied ? (
                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">ธนาคาร :</span>
                                  <p className="text-sm font-medium text-foreground">{bankName}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={saving} 
              size="lg"
            >
              {saving ? (
                "กำลังสร้างคำสั่งซื้อ..."
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  ยืนยันการสั่งซื้อและชำระเงิน
                </>
              )}
            </Button>
            {selectedPaymentMethod === "qrcode" && !userBankAccount && !loadingBankAccount && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-destructive text-center">
                  กรุณากรอกข้อมูลบัญชีธนาคารในโปรไฟล์ก่อนชำระเงิน
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/profile")}
                  className="w-full sm:w-auto"
                >
                  ไปกรอกข้อมูลบัญชี
                </Button>
              </div>
            )}
          </form>
        </div>

        {/* สรุปคำสั่งซื้อ */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">สรุปคำสั่งซื้อ</h2>
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg border bg-background/60 p-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>รหัสโปรโมชัน</span>
                {appliedPromotion && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-300">
                    ใช้แล้ว: {appliedPromotion.promo_code}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  placeholder="กรอกรหัสโปรโมชัน"
                  className="h-10"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="sm:w-28"
                    onClick={applyPromotion}
                    disabled={applyingPromo}
                  >
                    {applyingPromo ? "กำลังตรวจสอบ..." : "ใช้โค้ด"}
                  </Button>
                  {appliedPromotion && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="sm:w-24"
                      onClick={() => {
                        setAppliedPromotion(null);
                        setPromoMessage(null);
                      }}
                    >
                      ยกเลิก
                    </Button>
                  )}
                </div>
              </div>
              {applyingPromo && <Skeleton className="h-2 w-32" />}
              {promoMessage && (
                <p
                  className={`text-xs ${
                    promoMessage.includes("เรียบร้อย")
                      ? "text-emerald-600 dark:text-emerald-300"
                      : "text-destructive"
                  }`}
                >
                  {promoMessage}
                </p>
              )}
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-lg border p-3"
                >
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded border bg-muted">
                    {item.product.image_url ? (
                      <Image
                        src={item.product.image_url}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                        ไม่มีรูป
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      จำนวน {item.quantity} ชิ้น
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      ฿
                      {(
                        Number(item.product.price) * item.quantity
                      ).toLocaleString("th-TH")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ยอดรวมสินค้า</span>
                <span className="font-medium">
                  ฿{productTotal.toLocaleString("th-TH")}
                </span>
              </div>
              {appliedPromotion && discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-300">
                  <span>ส่วนลด ({appliedPromotion.promo_code})</span>
                  <span>
                    -฿
                    {discountAmount.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              )}
              {selectedShippingMethod && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ค่าจัดส่ง</span>
                  <span className="font-medium">
                    ฿{shippingCost.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-sm">
                <span className="font-semibold">ยอดรวมทั้งหมด</span>
                <span className="text-lg font-semibold text-primary">
                  ฿{payableAmount.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Account Alert Dialog */}
      <AlertDialog open={showBankAccountDialog} onOpenChange={setShowBankAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>กรุณากรอกข้อมูลบัญชีธนาคาร</AlertDialogTitle>
            <AlertDialogDescription>
              เพื่อใช้ในการชำระเงินผ่าน QR Code กรุณาไปกรอกข้อมูลบัญชีธนาคารในโปรไฟล์ของคุณก่อน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/profile")}>
              ไปที่โปรไฟล์
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Dialog - QR Code */}
      {createdOrder && selectedPaymentMethod === "qrcode" && userBankAccount && (
        <PaymentDialog
          open={showPaymentDialog}
          onOpenChange={(open) => {
            setShowPaymentDialog(open);
            if (!open) {
              // ล้างตะกร้าเมื่อปิด dialog
              clearCart();
              router.push(`/orders/${createdOrder.id}`);
            }
          }}
          orderId={createdOrder.order_number}
          amount={createdOrder.total_amount}
          userId={user.id}
          bankAccount={userBankAccount}
          onPaymentSuccess={() => {
            // ล้างตะกร้าเมื่อชำระเงินสำเร็จ
            clearCart();
            router.push(`/orders/${createdOrder.id}`);
          }}
        />
      )}

      {/* Slip Verification Dialog */}
      {createdOrder && selectedPaymentMethod === "slip" && (
        <SlipVerificationDialog
          open={showSlipDialog}
          onOpenChange={(open) => {
            setShowSlipDialog(open);
            if (!open) {
              // ล้างตะกร้าเมื่อปิด dialog
              clearCart();
              router.push(`/orders/${createdOrder.id}`);
            }
          }}
          orderId={createdOrder.id}
          amount={createdOrder.total_amount}
          onPaymentSuccess={() => {
            // ล้างตะกร้าเมื่อชำระเงินสำเร็จ
            clearCart();
            router.push(`/orders/${createdOrder.id}`);
          }}
        />
      )}
    </div>
  );
}

