"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import jsQR from "jsqr";
import { useRouter } from "next/navigation";

interface SlipVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: number;
  amount: number;
  onPaymentSuccess?: () => void;
}

export function SlipVerificationDialog({
  open,
  onOpenChange,
  orderId,
  amount,
  onPaymentSuccess
}: SlipVerificationDialogProps) {
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);
  const [orderDbId, setOrderDbId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // ตรวจสอบประเภทไฟล์
    if (!file.type.startsWith("image/")) {
      return;
    }

    // แสดง preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setImagePreview(imageUrl);
      setImageFile(file);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function extractQRFromImage(imageUrl: string): Promise<string | null> {
    return new Promise((resolve) => {
      const img = document.createElement("img");
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(null);
              return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            resolve(code ? code.data : null);
          } catch (error) {
            resolve(null);
          }
        };
        img.onerror = () => {
          resolve(null);
        };
        img.src = imageUrl;
    });
  }

  async function handleConfirm() {
    if (!imagePreview || !imageFile) {
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      // 1. อ่าน QR code จากรูปภาพ
      const qrPayload = await extractQRFromImage(imagePreview);

      if (!qrPayload) {
        setResult({
          success: false,
          message: "ไม่พบ QR code ในรูปภาพ กรุณาตรวจสอบว่าสลิปมี QR code ชัดเจน"
        });
        setProcessing(false);
        return;
      }

      // 2. ดึง session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setResult({
          success: false,
          message: "กรุณาเข้าสู่ระบบก่อน"
        });
        setProcessing(false);
        return;
      }

      // 3. ตรวจสอบสลิป
      const response = await fetch("/api/payment/verify-slip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          qrPayload: qrPayload.trim(),
          orderId
        })
      });

      const data = await response.json();

      if (data.success) {
        // orderId ที่ส่งมาเป็น database ID แล้ว
        setResult({
          success: true,
          message: "ยืนยันการชำระเงินสำเร็จ"
        });
        setOrderDbId(orderId);
        setImagePreview(null);
        setImageFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        // ไม่ปิด dialog อัตโนมัติ ให้ user กดปุ่มไปหน้าประวัติเอง
      } else {
        setResult({
          success: false,
          message: data.error || "เกิดข้อผิดพลาดในการตรวจสอบสลิป"
        });
      }
    } catch (error: any) {
      console.error("Verify slip error:", error);
      setResult({
        success: false,
        message: "เกิดข้อผิดพลาดในการเชื่อมต่อ"
      });
    } finally {
      setProcessing(false);
    }
  }

  function handleClose() {
    if (!processing) {
      setImagePreview(null);
      setImageFile(null);
      setResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto p-0 gap-0 rounded-2xl sm:rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold">ยืนยันการชำระเงิน</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          {result ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-6">
              {result.success ? (
                <>
                  <div className="rounded-full bg-emerald-50 dark:bg-emerald-950/20 p-4">
                    <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-base sm:text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                      {result.message}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-full bg-destructive/10 p-4">
                    <XCircle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-base sm:text-lg font-semibold text-destructive px-4">
                      {result.message}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!imagePreview ? (
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="slipImage"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={processing}
                  />
                  <label
                    htmlFor="slipImage"
                    className="flex flex-col items-center justify-center w-full min-h-[200px] sm:min-h-[240px] border-2 border-dashed border-muted-foreground/25 rounded-2xl cursor-pointer hover:bg-muted/30 hover:border-primary/50 transition-all duration-200 bg-muted/5"
                  >
                    <div className="flex flex-col items-center justify-center py-8 px-4 space-y-4">
                      <div className="rounded-full bg-primary/10 p-4">
                        <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm sm:text-base font-semibold text-foreground">
                          คลิกเพื่ออัพโหลดสลิป
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          รองรับไฟล์ PNG, JPG, GIF
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative w-full rounded-2xl border-2 border-border overflow-hidden bg-muted/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="สลิปที่อัพโหลด"
                      className="w-full h-auto max-h-[400px] object-contain"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-lg"
                      onClick={handleRemoveImage}
                      disabled={processing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row gap-3">
            {result ? (
              result.success ? (
                <Button
                  onClick={() => {
                    if (onPaymentSuccess) {
                      onPaymentSuccess();
                    } else if (orderDbId) {
                      router.push(`/orders/${orderDbId}`);
                    } else {
                      router.push(`/orders/${orderId}`);
                    }
                  }}
                  className="flex-1 h-11 sm:h-10"
                >
                  ไปที่ประวัติคำสั่งซื้อ
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setResult(null);
                    setImagePreview(null);
                    setImageFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="flex-1 h-11 sm:h-10"
                  variant="outline"
                >
                  ลองอีกครั้ง
                </Button>
              )
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleClose} 
                  className="flex-1 h-11 sm:h-10 order-2 sm:order-1" 
                  disabled={processing}
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1 h-11 sm:h-10 order-1 sm:order-2"
                  disabled={processing || !imagePreview}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">กำลังประมวลผล...</span>
                      <span className="sm:hidden">กำลังประมวลผล</span>
                    </>
                  ) : (
                    "ยืนยันการชำระเงิน"
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

