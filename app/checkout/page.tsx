"use client";

import { useEffect, useState } from "react";
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
import { CreditCard, QrCode } from "lucide-react";

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
  const [createdOrder, setCreatedOrder] = useState<any>(null);

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
    }
  }, [user, authLoading, router]);

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

  const generateOrderNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random}`;
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

      const orderNumber = generateOrderNumber();
      const productTotal = getTotalPrice();
      const totalAmount = productTotal + shippingCost;

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
      
      // แสดง payment dialog ทันที
      setShowPaymentDialog(true);
      
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
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving} size="lg">
              {saving ? (
                "กำลังสร้างคำสั่งซื้อ..."
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  ยืนยันการสั่งซื้อและชำระเงิน
                </>
              )}
            </Button>
          </form>
        </div>

        {/* สรุปคำสั่งซื้อ */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">สรุปคำสั่งซื้อ</h2>
          <div className="space-y-4">
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
                  ฿{getTotalPrice().toLocaleString("th-TH")}
                </span>
              </div>
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
                  ฿{(getTotalPrice() + shippingCost).toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      {createdOrder && selectedPaymentMethod === "qrcode" && (
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
          bankAccount={{
            accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || "",
            accountNo: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NO || "",
            bankCode: process.env.NEXT_PUBLIC_BANK_CODE || "KBANK"
          }}
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

