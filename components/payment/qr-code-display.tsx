"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode } from "lucide-react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  qrcode: string;
  amount: number;
  transactionId?: string;
  className?: string;
}

function isBase64Image(str: string): boolean {
  return str.startsWith("data:image") || (str.length > 100 && /^[A-Za-z0-9+/=]+$/.test(str));
}

export function QRCodeDisplay({
  qrcode,
  amount,
  transactionId,
  className
}: QRCodeDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBase64, setIsBase64] = useState(false);

  useEffect(() => {
    if (qrcode) {
      setLoading(false);
      setIsBase64(isBase64Image(qrcode));
    } else {
      setError("ไม่พบ QR Code");
      setLoading(false);
    }
  }, [qrcode]);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Skeleton className="h-[300px] w-[300px] mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    );
  }

  if (error || !qrcode) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 border rounded-lg ${className}`}>
        <QrCode className="h-12 w-12 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{error || "ไม่พบ QR Code"}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      <div className="relative border-2 border-border rounded-lg p-4 bg-white dark:bg-gray-900 flex items-center justify-center">
        {isBase64 ? (
          <Image
            src={qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`}
            alt="QR Code"
            width={300}
            height={300}
            className="w-full h-auto max-w-[300px]"
            priority
          />
        ) : (
          <QRCodeSVG
            value={qrcode}
            size={300}
            level="H"
            includeMargin={true}
            fgColor="#000000"
            bgColor="#FFFFFF"
          />
        )}
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">ยอดชำระเงิน</p>
        <p className="text-2xl font-bold text-primary">
          ฿{amount.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}
        </p>
        {transactionId && (
          <p className="text-xs text-muted-foreground font-mono">
            {transactionId}
          </p>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground text-center max-w-sm">
        สแกน QR Code เพื่อชำระเงินผ่านแอปธนาคารของคุณ
      </p>
    </div>
  );
}

