"use client";

import { useState, useEffect, useRef } from "react";
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
import { Loader2 } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<{
    qrcode: string;
    transactionId: string;
  } | null>(null);
  const { showAlert } = useAlert();
  const generatedOrderIdRef = useRef<string | null>(null);
  const isGeneratingRef = useRef(false);

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

  useEffect(() => {
    // Reset QR data เมื่อ orderId เปลี่ยน
    if (generatedOrderIdRef.current !== orderId) {
      setQrData(null);
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
          accountName: bankAccount.accountName,
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
          ) : qrData ? (
            <QRCodeDisplay
              qrcode={qrData.qrcode}
              amount={amount}
              transactionId={qrData.transactionId}
            />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

