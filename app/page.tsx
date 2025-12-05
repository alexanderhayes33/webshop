"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import Image from "next/image";
import { MainBanner } from "@/components/home/main-banner";
import { supabase } from "@/lib/supabaseClient";
import { ProductDialog } from "@/components/products/product-dialog";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { cn } from "@/lib/utils";
import { ShoppingCart, Plus } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { useAlert } from "@/lib/alert";

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

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { addToCart } = useCart();
  const { showAlert } = useAlert();
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // ป้องกันการโหลดซ้ำ
    if (hasLoadedRef.current || isLoadingRef.current) {
      return;
    }

    async function loadData() {
      isLoadingRef.current = true;
      setLoading(true);
      
      // โหลดสินค้า
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6);

      if (productsError) {
        console.error("Error loading products:", productsError);
      } else {
        // เรียงสินค้า: สินค้าที่มีสต็อกมาก่อน, สินค้าที่ไม่มีสต็อกอยู่หลัง
        const sortedProducts = (productsData as Product[]).sort((a, b) => {
          // ถ้า a มีสต็อกและ b ไม่มีสต็อก -> a มาก่อน
          if (a.stock > 0 && b.stock === 0) return -1;
          // ถ้า a ไม่มีสต็อกและ b มีสต็อก -> b มาก่อน
          if (a.stock === 0 && b.stock > 0) return 1;
          // ถ้าทั้งคู่มีสต็อกหรือทั้งคู่ไม่มีสต็อก -> เรียงตาม created_at
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setProducts(sortedProducts);
      }

      // โหลดโปรโมชันที่เปิดใช้งาน
      const now = new Date().toISOString();
      const { data: promotionData, error: promotionError } = await supabase
        .from("promotions")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // กรองโปรโมชันที่ยังไม่หมดอายุ
      if (promotionData) {
        const promo = promotionData as Promotion;
        const startDate = promo.start_date ? new Date(promo.start_date) : null;
        const endDate = promo.end_date ? new Date(promo.end_date) : null;
        const nowDate = new Date();
        
        if (
          (startDate === null || startDate <= nowDate) &&
          (endDate === null || endDate >= nowDate)
        ) {
          setPromotion(promo);
        } else {
          setPromotion(null);
        }
      } else {
        setPromotion(null);
      }

      if (promotionError) {
        console.error("Error loading promotion:", promotionError);
      }

      setLoading(false);
      hasLoadedRef.current = true;
      isLoadingRef.current = false;
    }

    loadData();
  }, []);
  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: "หน้าหลัก" }]} />
      {/* PROMO BANNER */}
      {promotion && (
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-r from-primary/10 via-primary/5 to-background px-4 py-5 sm:px-6 sm:py-6">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-[11px] text-primary shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {promotion.title}
            </div>
              {promotion.discount_percent && promotion.min_purchase_amount && (
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
                  ซื้อครบ {Number(promotion.min_purchase_amount).toLocaleString("th-TH")} บาท รับส่วนลดทันที {promotion.discount_percent}%
            </h2>
              )}
              {promotion.description && (
            <p className="max-w-xl text-[11px] sm:text-xs text-muted-foreground">
                  {promotion.description}
            </p>
              )}
          </div>
          <div className="flex flex-col items-start gap-2 text-[11px] sm:items-end">
              {promotion.promo_code && (
            <span className="rounded-full bg-background/80 px-3 py-1 font-medium text-primary shadow-sm">
                  CODE: {promotion.promo_code}
            </span>
              )}
            <Button size="sm" className="rounded-full text-xs" asChild>
              <Link href="/login">ล็อกอินเพื่อใช้สิทธิ์</Link>
            </Button>
          </div>
        </div>
      </section>
      )}

      {/* MAIN IMAGE BANNER (SLIDER) */}
      <MainBanner />

      {/* HEADER / CONTROLS */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            168VAPE BOUTIQUE
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            สินค้าแนะนำสำหรับวันนี้
          </h1>
          <p className="max-w-xl text-xs sm:text-sm text-muted-foreground">
            คัดเลือกเฉพาะสินค้าคุณภาพดี ดีไซน์พรีเมียม
            จากแบรนด์ที่ได้รับความไว้วางใจ ให้ประสบการณ์ช้อปที่หรูหรา
            และปลอดภัยในทุกคำสั่งซื้อ
          </p>
        </div>
      </section>

      {/* PRODUCT GRID */}
      {loading ? (
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm"
            >
              <Skeleton className="h-56 w-full" />
              <div className="flex flex-1 flex-col gap-3 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="mt-auto flex items-center justify-between pt-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            ยังไม่มีสินค้าในระบบ
          </p>
          <Button className="mt-4" asChild>
            <Link href="/products">ดูสินค้าทั้งหมด</Link>
          </Button>
        </div>
      ) : (
        <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {products.map((product) => {
            const isOutOfStock = product.stock === 0;
            return (
            <article
              key={product.id}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border shadow-sm transition cursor-pointer",
                isOutOfStock
                  ? "bg-muted/50 border-muted opacity-75"
                  : "bg-card/70 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              )}
              onClick={() => {
                setSelectedProduct(product);
                setDialogOpen(true);
              }}
            >
              <div className="relative h-56 w-full bg-muted">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover transition-opacity duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        if (target.parentElement) {
                          target.parentElement.classList.add("bg-muted");
                        }
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                      ไม่มีรูปภาพ
                    </div>
                  )}
                  {product.category && (
                    <div className="absolute left-3 top-3 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      {product.category}
                    </div>
                  )}
                  {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-white">
                        สินค้าหมด
                      </span>
                    </div>
                  )}
            </div>

            <div className="flex flex-1 flex-col gap-2 p-3">
              <div className="space-y-1">
                  <h2 className={cn(
                    "text-xs font-semibold tracking-tight line-clamp-2",
                    isOutOfStock && "text-muted-foreground"
                  )}>
                    {product.name}
                  </h2>
                    {product.description && (
                      <p className={cn(
                        "line-clamp-2 text-[10px]",
                        isOutOfStock ? "text-muted-foreground/70" : "text-muted-foreground"
                      )}>
                        {product.description}
                </p>
                    )}
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <div className="space-y-0.5">
                  <p className={cn(
                    "text-[10px]",
                    isOutOfStock ? "text-muted-foreground/70" : "text-muted-foreground"
                  )}>ราคา</p>
                  <p className={cn(
                    "text-sm font-semibold",
                    isOutOfStock ? "text-muted-foreground" : "text-primary"
                  )}>
                        ฿{Number(product.price).toLocaleString("th-TH")}
                  </p>
                  <p className={cn(
                    "text-[10px]",
                    isOutOfStock 
                      ? "text-destructive" 
                      : product.stock > 10
                        ? "text-muted-foreground"
                        : product.stock > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-destructive"
                  )}>
                    คงเหลือ {product.stock} ชิ้น
                  </p>
                </div>
                <Button
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-full relative transition-all",
                    isOutOfStock
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:scale-110 hover:shadow-md"
                  )}
                  disabled={isOutOfStock}
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isOutOfStock) return;
                    await addToCart(product.id, 1);
                    await showAlert(`เพิ่ม "${product.name}" ลงตะกร้าเรียบร้อยแล้ว`, {
                      title: "สำเร็จ"
                    });
                  }}
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm ring-2 ring-background">
                    <Plus className="h-2.5 w-2.5" />
                  </span>
                </Button>
              </div>
            </div>
          </article>
        );
          })}
      </section>
      )}

      <ProductDialog
        product={selectedProduct}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {products.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/products">ดูสินค้าทั้งหมด</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

