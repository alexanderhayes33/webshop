"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { QRCodeDisplay } from "./qr-code-display";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAlert } from "@/lib/alert";
import { Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  Item,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  amount: number;
  userId: string;
  bankAccount: {
    accountName: string;
    accountNo: string;
    bankCode: string;
  };
  onPaymentSuccess?: () => void;
}

export function PaymentDialog({
  open,
  onOpenChange,
  orderId,
  amount,
  userId,
  bankAccount,
  onPaymentSuccess
}: PaymentDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<{
    qrcode: string;
    transactionId: string;
  } | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [orderDbId, setOrderDbId] = useState<number | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const { showAlert } = useAlert();
  const generatedOrderIdRef = useRef<string | null>(null);
  const isGeneratingRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ฟังก์ชันสำหรับเก็บ QR data ใน sessionStorage
  const getStoredQRData = (orderId: string) => {
    if (typeof window === "undefined") return null;
    try {
      const stored = sessionStorage.getItem(`qr_${orderId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading from sessionStorage:", e);
    }
    return null;
  };

  // ฟังก์ชันสำหรับบันทึก QR data ใน sessionStorage
  const storeQRData = (orderId: string, data: { qrcode: string; transactionId: string }) => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(`qr_${orderId}`, JSON.stringify(data));
    } catch (e) {
      console.error("Error writing to sessionStorage:", e);
    }
  };

  // ฟังก์ชันสำหรับลบ QR data จาก sessionStorage
  const clearStoredQRData = (orderId: string) => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem(`qr_${orderId}`);
    } catch (e) {
      console.error("Error clearing sessionStorage:", e);
    }
  };

  // Polling order status เมื่อมี QR code แล้ว
  useEffect(() => {
    if (!open || !qrData || !orderId) {
      // หยุด polling เมื่อปิด dialog หรือไม่มี QR data
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsCheckingPayment(false);
      return;
    }

    // ตั้งค่าให้แสดง spinner ตลอดเวลาที่กำลัง polling
    setIsCheckingPayment(true);

    // เริ่ม polling ทุก 3 วินาที
    const checkOrderStatus = async () => {
      try {
        const { data: order, error } = await supabase
          .from("orders")
          .select("id, status")
          .eq("order_number", orderId)
          .single();

        if (error) throw error;

        if (order) {
          setOrderStatus(order.status);
          setOrderDbId(order.id);
          
          // ถ้า status เป็น confirmed หรือ paid ให้หยุด polling
          if (order.status === "confirmed" || order.status === "paid") {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setIsCheckingPayment(false);
          }
        }
      } catch (error) {
        console.error("Error checking order status:", error);
      }
    };

    // ตรวจสอบทันทีครั้งแรก
    checkOrderStatus();

    // ตั้ง polling interval
    pollingIntervalRef.current = setInterval(() => {
      checkOrderStatus();
    }, 3000);

    // Cleanup เมื่อ component unmount หรือ dependencies เปลี่ยน
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsCheckingPayment(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, qrData, orderId]);

  useEffect(() => {
    // Reset QR data และ order status เมื่อ orderId เปลี่ยน
    if (generatedOrderIdRef.current !== orderId) {
      setQrData(null);
      setOrderStatus(null);
      generatedOrderIdRef.current = null;
    }

    // ตรวจสอบว่ามี QR data เก็บไว้ใน sessionStorage หรือไม่
    if (open && !qrData && !loading && !isGeneratingRef.current) {
      const storedData = getStoredQRData(orderId);
      if (storedData && storedData.qrcode) {
        // ใช้ QR data ที่เก็บไว้
        setQrData(storedData);
        generatedOrderIdRef.current = orderId;
        return;
      }

      // ถ้าไม่มี QR data ที่เก็บไว้ และ orderId ยังไม่เคย generate
      if (generatedOrderIdRef.current !== orderId) {
        generateQRCode();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  async function generateQRCode() {
    // ป้องกันการ generate ซ้ำ
    if (isGeneratingRef.current) {
      return;
    }

    // Validate bank account info
    const missingFields = [];
    if (!bankAccount?.accountName || bankAccount.accountName.trim() === "") {
      missingFields.push("ชื่อบัญชี");
    }
    if (!bankAccount?.accountNo || bankAccount.accountNo.trim() === "") {
      missingFields.push("เลขบัญชี");
    }
    if (!bankAccount?.bankCode || bankAccount.bankCode.trim() === "") {
      missingFields.push("รหัสธนาคาร");
    }

    if (missingFields.length > 0) {
      await showAlert(
        `กรุณาตั้งค่าข้อมูลบัญชีธนาคารในระบบ: ${missingFields.join(", ")}`,
        {
          title: "ข้อมูลไม่ครบถ้วน"
        }
      );
      onOpenChange(false);
      return;
    }

    // แยกชื่อจริงจากชื่อเต็ม (ใช้แค่ชื่อจริง ไม่รวมนามสกุล)
    const accountNameParts = (bankAccount.accountName || "").trim().split(" ");
    const firstNameOnly = accountNameParts[0] || bankAccount.accountName.trim();

    isGeneratingRef.current = true;
    setLoading(true);
    try {
      const response = await fetch("/api/payment/deposit/qrcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          refId: orderId,
          amount,
          userId,
          accountName: firstNameOnly,
          accountNo: bankAccount.accountNo,
          bankCode: bankAccount.bankCode,
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (!response.ok || data.code !== 0) {
        const errorMsg = data.msg || data.cause || `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      if (!data.data?.qrcode) {
        throw new Error("ไม่พบ QR Code ใน response");
      }

      const qrDataToStore = {
        qrcode: data.data.qrcode,
        transactionId: data.data.transactionId || ""
      };
      setQrData(qrDataToStore);
      storeQRData(orderId, qrDataToStore);
      generatedOrderIdRef.current = orderId;
    } catch (error: any) {
      const errorMessage = 
        error?.message || 
        error?.msg || 
        (typeof error === "string" ? error : "เกิดข้อผิดพลาดในการสร้าง QR Code");
      
      console.error("Error generating QR code:", error);
      
      await showAlert(errorMessage, {
        title: "เกิดข้อผิดพลาด"
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
      isGeneratingRef.current = false;
    }
  }

  function handleClose() {
    if (!loading) {
      // ไม่ต้อง reset qrData เมื่อปิด dialog เพื่อให้สามารถเปิดใหม่ได้โดยไม่ต้อง generate ใหม่
      // แต่จะ reset เมื่อ orderId เปลี่ยน
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ชำระเงินผ่าน QR Code</DialogTitle>
          <DialogDescription>
            สแกน QR Code เพื่อชำระเงินผ่านแอปธนาคารของคุณ
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-[300px] w-full" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
          ) : orderStatus === "confirmed" || orderStatus === "paid" ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  ชำระเงินสำเร็จ
                </p>
                <p className="text-sm text-muted-foreground">
                  การชำระเงินของคุณได้รับการยืนยันแล้ว
                </p>
              </div>
            </div>
          ) : qrData ? (
            <div className="space-y-4">
              <QRCodeDisplay
                qrcode={qrData.qrcode}
                amount={amount}
                transactionId={qrData.transactionId}
                isCheckingPayment={isCheckingPayment}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">
                กำลังโหลด...
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {orderStatus === "confirmed" || orderStatus === "paid" ? (
            <Button
              onClick={() => {
                if (orderDbId) {
                  if (onPaymentSuccess) {
                    onPaymentSuccess();
                  } else {
                    router.push(`/orders/${orderDbId}`);
                  }
                }
              }}
              className="flex-1"
            >
              ไปที่ประวัติคำสั่งซื้อ
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} className="flex-1">
                ปิด
              </Button>
              {qrData && (
                <Button
                  onClick={() => {
                    clearStoredQRData(orderId);
                    setQrData(null);
                    generatedOrderIdRef.current = null;
                    generateQRCode();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  สร้าง QR Code ใหม่
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

