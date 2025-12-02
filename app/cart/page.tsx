"use client";

import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAlert } from "@/lib/alert";
import { Breadcrumb } from "@/components/layout/breadcrumb";

export default function CartPage() {
  const router = useRouter();
  const { items, loading, removeFromCart, updateQuantity, getTotalPrice } =
    useCart();
  const { showAlert } = useAlert();

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight">ตะกร้าสินค้า</h1>
        <div className="rounded-2xl border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            ตะกร้าสินค้าว่างเปล่า
          </p>
          <Button asChild>
            <Link href="/products">ไปเลือกซื้อสินค้า</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: "ตะกร้าสินค้า" }]} />
      <h1 className="text-2xl font-semibold tracking-tight">ตะกร้าสินค้า</h1>

      <div className="grid gap-6 md:grid-cols-[1fr,300px]">
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 rounded-2xl border bg-card p-4"
            >
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border bg-muted">
                {item.product.image_url ? (
                  <Image
                    src={item.product.image_url}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    ไม่มีรูป
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {item.product.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      ฿{Number(item.product.price).toLocaleString("th-TH")} ต่อชิ้น
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeFromCart(item.id)}
                  >
                    ×
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-lg border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7"
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          Math.min(item.product.stock, item.quantity + 1)
                        )
                      }
                      disabled={item.quantity >= item.product.stock}
                    >
                      +
                    </Button>
                  </div>
                  <p className="text-sm font-semibold">
                    ฿
                    {(
                      Number(item.product.price) * item.quantity
                    ).toLocaleString("th-TH")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-card p-4 h-fit">
          <h2 className="mb-4 text-sm font-semibold">สรุปคำสั่งซื้อ</h2>
          <div className="space-y-2 border-b pb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ยอดรวม</span>
              <span className="font-semibold">
                ฿{getTotalPrice().toLocaleString("th-TH")}
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Button className="w-full" asChild>
              <Link href="/checkout">ดำเนินการสั่งซื้อ</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/products">เลือกซื้อสินค้าเพิ่ม</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

