"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useCart } from "@/components/cart/cart-provider";
import { useAlert } from "@/lib/alert";

type Product = {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
  stock: number;
};

type ProductDialogProps = {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductDialog({
  product,
  open,
  onOpenChange
}: ProductDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { showAlert } = useAlert();

  if (!product) return null;

  const handleAddToCart = async () => {
    if (quantity <= 0 || quantity > product.stock) {
      await showAlert("จำนวนสินค้าไม่ถูกต้อง", {
        title: "แจ้งเตือน"
      });
      return;
    }

    await addToCart(product.id, quantity);
    await showAlert("เพิ่มสินค้าในตะกร้าเรียบร้อยแล้ว", {
      title: "สำเร็จ"
    });
    onOpenChange(false);
    setQuantity(1);
  };

  const isOutOfStock = product.stock <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          {product.description && (
            <DialogDescription>{product.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* รูปภาพ */}
          <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 500px) 100vw, 500px"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  if (target.parentElement) {
                    target.parentElement.classList.add("bg-muted");
                  }
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                ไม่มีรูปภาพ
              </div>
            )}
          </div>

          {/* ราคา */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">ราคา</p>
            <p className="text-2xl font-semibold text-primary">
              ฿{Number(product.price).toLocaleString("th-TH")}
            </p>
          </div>

          {/* สต็อก */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">สต็อก</p>
            <p
              className={`text-sm font-medium ${
                isOutOfStock ? "text-destructive" : "text-foreground"
              }`}
            >
              {isOutOfStock ? "สินค้าหมด" : `เหลือ ${product.stock} ชิ้น`}
            </p>
          </div>

          {/* เลือกจำนวน */}
          {!isOutOfStock && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">จำนวน</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </Button>
                  <span className="w-12 text-center text-sm font-medium">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8"
                    onClick={() =>
                      setQuantity(Math.min(product.stock, quantity + 1))
                    }
                  >
                    +
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  รวม{" "}
                  <span className="font-medium text-foreground">
                    ฿
                    {(Number(product.price) * quantity).toLocaleString(
                      "th-TH"
                    )}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* ปุ่มเพิ่มลงตะกร้า */}
          <Button
            className="w-full"
            size="lg"
            disabled={isOutOfStock}
            onClick={handleAddToCart}
          >
            {isOutOfStock ? "สินค้าหมด" : "เพิ่มลงตะกร้า"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

