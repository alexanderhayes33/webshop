"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type Product = {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
  stock: number;
};

export function ProductSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, description, stock")
        .eq("is_active", true)
        .ilike("name", `%${searchQuery}%`)
        .limit(10);

      if (error) {
        console.error("Error searching products:", error);
        setResults([]);
      } else {
        setResults((data as Product[]) || []);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const showResults = isFocused && searchQuery.trim().length > 0;

  return (
    <div
      ref={containerRef}
      className="hidden md:flex w-full max-w-md items-center relative"
    >
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
        <Input
          type="text"
          placeholder="ค้นหาสินค้า..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="pl-10 pr-10 h-9 w-full rounded-full border bg-background/60 text-sm shadow-sm hover:bg-background/80 focus:bg-background"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 z-10"
            onClick={() => {
              setSearchQuery("");
              setIsFocused(false);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Dropdown Results */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-lg border bg-card shadow-lg max-h-[500px] overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-[500px] overflow-y-auto">
                <div className="p-2">
                  {results.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      onClick={() => {
                        setSearchQuery("");
                        setIsFocused(false);
                      }}
                      className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                    >
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded border bg-muted">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
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
                        <p className="text-sm font-medium truncate">
                          {product.name}
                        </p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {product.description}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm font-semibold text-primary">
                            ฿{Number(product.price).toLocaleString("th-TH")}
                          </p>
                          {product.stock > 0 ? (
                            <span className="text-xs text-muted-foreground">
                              • {product.stock} ชิ้น
                            </span>
                          ) : (
                            <span className="text-xs text-destructive">
                              • สินค้าหมด
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                ไม่พบสินค้าที่ค้นหา
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

