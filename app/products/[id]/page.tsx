"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import { useAlert } from "@/lib/alert";
import { Breadcrumb } from "@/components/layout/breadcrumb";

type Product = {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
  category: string | null;
  stock: number;
  is_active: boolean;
  created_at: string;
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { showAlert } = useAlert();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function loadProduct() {
      const id = params.id;
      if (!id || typeof id !== "string") {
        router.replace("/products");
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", parseInt(id))
        .eq("is_active", true)
        .single();

      if (error || !data) {
        router.replace("/products");
        return;
      }

      setProduct(data as Product);
      setLoading(false);
    }

    loadProduct();
  }, [params.id, router]);

  const handleAddToCart = async () => {
    if (!product) return;
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
    setQuantity(1);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">ไม่พบสินค้า</h1>
        <Button asChild>
          <Link href="/products">กลับไปหน้ารายการสินค้า</Link>
        </Button>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "สินค้า", href: "/products" },
          { label: product.name }
        ]}
      />

      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-muted">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
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

        <div className="space-y-6">
          <div className="space-y-2">
            {product.category && (
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                {product.category}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {product.name}
            </h1>
            {product.description && (
              <p className="text-sm text-muted-foreground">
                {product.description}
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">ราคา</p>
              <p className="text-3xl font-semibold text-primary">
                ฿{Number(product.price).toLocaleString("th-TH")}
              </p>
            </div>

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

            {!isOutOfStock && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border">
                  <Button
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
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
            >
              {isOutOfStock ? "สินค้าหมด" : "เพิ่มลงตะกร้า"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

