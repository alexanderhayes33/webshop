"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ProductDialog } from "@/components/products/product-dialog";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { CategoriesSidebar } from "@/components/products/categories-sidebar";
import { ProductFilters } from "@/components/products/product-filters";
import { cn } from "@/lib/utils";
import { ShoppingCart, Plus, X } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { useAlert } from "@/lib/alert";

type Product = {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
  category_id: number | null;
  stock: number;
  is_active: boolean;
  created_at: string;
};

type FilterOptions = {
  minPrice: number;
  maxPrice: number;
  sortBy: "newest" | "price_low" | "price_high" | "name_asc" | "name_desc";
  stockFilter: "all" | "in_stock" | "out_of_stock";
};

type Category = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
};

export default function ProductsPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { addToCart } = useCart();
  const { showAlert } = useAlert();
  const loadedCategoryIdRef = useRef<number | null | undefined>(undefined);
  const isLoadingRef = useRef(false);

  // คำนวณ price range จากสินค้าทั้งหมด
  const priceRange = useMemo(() => {
    if (allProducts.length === 0) return { min: 0, max: 10000 };
    const prices = allProducts.map((p) => Number(p.price));
    const min = Math.floor(Math.min(...prices) / 100) * 100; // ปัดลงเป็นร้อย
    const max = Math.ceil(Math.max(...prices) / 100) * 100; // ปัดขึ้นเป็นร้อย
    return { min, max };
  }, [allProducts]);

  // ตั้งค่า filters เริ่มต้น
  const [filters, setFilters] = useState<FilterOptions>({
    minPrice: priceRange.min,
    maxPrice: priceRange.max,
    sortBy: "newest",
    stockFilter: "all"
  });

  // โหลดหมวดหมู่
  useEffect(() => {
    async function loadCategories() {
      setCategoriesLoading(true);
      try {
        const { data: allCategories, error: catError } = await supabase
          .from("categories")
          .select("id, name, slug, is_active")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (catError) {
          console.error("Error loading categories:", catError);
          setCategories([]);
          return;
        }

        // ดึงสินค้าทั้งหมดที่มี active
        const { data: productsData } = await supabase
          .from("products")
          .select("category_id")
          .eq("is_active", true);

        // หา category_id ที่มีสินค้า
        const categoryIdsWithProducts = new Set(
          (productsData || [])
            .map((p: any) => p.category_id)
            .filter((id: any) => id !== null)
        );

        // กรองเฉพาะหมวดหมู่ที่มีสินค้า
        const filteredCategories = (allCategories || []).filter((cat: any) =>
          categoryIdsWithProducts.has(cat.id)
        );

        setCategories(filteredCategories as Category[]);
      } catch (error) {
        console.error("Error loading categories:", error);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    }

    loadCategories();
  }, []);

  // อัพเดท filters เมื่อ priceRange เปลี่ยน
  useEffect(() => {
    if (priceRange.min !== 0 && priceRange.max !== 10000) {
      setFilters((prev) => ({
        ...prev,
        minPrice: priceRange.min,
        maxPrice: priceRange.max
      }));
    }
  }, [priceRange]);

  useEffect(() => {
    // ป้องกันการโหลดซ้ำถ้า categoryId เดิม
    if (loadedCategoryIdRef.current === selectedCategoryId && !isLoadingRef.current) {
      return;
    }

    async function loadProducts() {
      isLoadingRef.current = true;
      setLoading(true);
      let query = supabase
        .from("products")
        .select("*")
        .eq("is_active", true);

      if (selectedCategoryId !== null) {
        query = query.eq("category_id", selectedCategoryId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading products:", error);
      } else {
        setAllProducts((data as Product[]) || []);
      }
      loadedCategoryIdRef.current = selectedCategoryId;
      setLoading(false);
      isLoadingRef.current = false;
    }

    loadProducts();
  }, [selectedCategoryId]);

  // กรองและเรียงสินค้าตาม filters
  const products = useMemo(() => {
    let filtered = [...allProducts];

    // กรองตามราคา
    filtered = filtered.filter(
      (p) => Number(p.price) >= filters.minPrice && Number(p.price) <= filters.maxPrice
    );

    // กรองตามสต็อก
    if (filters.stockFilter === "in_stock") {
      filtered = filtered.filter((p) => p.stock > 0);
    } else if (filters.stockFilter === "out_of_stock") {
      filtered = filtered.filter((p) => p.stock === 0);
    }

    // เรียงตาม
    filtered.sort((a, b) => {
      // เรียงตามสต็อกก่อน (มีสต็อกมาก่อน)
      if (a.stock > 0 && b.stock === 0) return -1;
      if (a.stock === 0 && b.stock > 0) return 1;

      // เรียงตามตัวเลือก
      switch (filters.sortBy) {
        case "price_low":
          return Number(a.price) - Number(b.price);
        case "price_high":
          return Number(b.price) - Number(a.price);
        case "name_asc":
          return a.name.localeCompare(b.name, "th");
        case "name_desc":
          return b.name.localeCompare(a.name, "th");
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [allProducts, filters]);

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: "สินค้าทั้งหมด" }]} />
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
          168VAPE BOUTIQUE
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          สินค้าทั้งหมด
        </h1>
      </section>

      {/* Category Filter Buttons */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            หมวดหมู่:
          </span>
          {categoriesLoading ? (
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          ) : (
            <>
              <Button
                variant={selectedCategoryId === null ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  selectedCategoryId === null && "bg-primary text-primary-foreground"
                )}
                onClick={() => setSelectedCategoryId(null)}
              >
                ทั้งหมด
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategoryId === category.id ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 text-xs",
                    selectedCategoryId === category.id && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => setSelectedCategoryId(category.id)}
                >
                  {category.name}
                </Button>
              ))}
              {selectedCategoryId !== null && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => setSelectedCategoryId(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar - Categories & Filters */}
        <div className="lg:w-64 space-y-6">
          <CategoriesSidebar
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
          <ProductFilters
            filters={filters}
            onFiltersChange={setFilters}
            priceRange={priceRange}
            onReset={() => {
              setFilters({
                minPrice: priceRange.min,
                maxPrice: priceRange.max,
                sortBy: "newest",
                stockFilter: "all"
              });
            }}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm"
            >
              <Skeleton className="h-56 w-full" />
              <div className="flex flex-1 flex-col gap-3 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="mt-auto flex items-center justify-between pt-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </div>
          ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {selectedCategoryId === null
                  ? "ยังไม่มีสินค้าในระบบ"
                  : "ไม่พบสินค้าในหมวดหมู่นี้"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
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
            </div>
          )}
        </div>
      </div>

      <ProductDialog
        product={selectedProduct}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

