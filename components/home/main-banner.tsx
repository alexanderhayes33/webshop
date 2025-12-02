"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Banner = {
  id: number;
  image_url: string;
  alt_text: string | null;
  link_url: string | null;
  display_order: number;
};

export function MainBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadBanners() {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading banners:", error);
      } else {
        setBanners((data as Banner[]) || []);
      }
      setLoading(false);
    }

    loadBanners();
  }, []);

  useEffect(() => {
    if (banners.length > 0) {
      const timer = setInterval(() => {
        setIndex((prev) => (prev + 1) % banners.length);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [banners.length]);

  if (loading) {
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1 text-xs sm:text-sm text-muted-foreground">
          <p className="font-medium">
            แบนเนอร์โฆษณา • สไลด์แสดงโปรโมชันล่าสุดของร้าน
          </p>
        </div>
        <div className="relative overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative aspect-[16/9] w-full bg-muted animate-pulse" />
        </div>
      </section>
    );
  }

  if (banners.length === 0) {
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1 text-xs sm:text-sm text-muted-foreground">
          <p className="font-medium">
            แบนเนอร์โฆษณา • สไลด์แสดงโปรโมชันล่าสุดของร้าน
          </p>
        </div>
        <div className="relative overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative aspect-[16/9] w-full">
            <div className="flex h-full w-full items-center justify-center bg-muted text-xs sm:text-sm text-muted-foreground">
              ไม่มีรูปภาพ
            </div>
          </div>
        </div>
      </section>
    );
  }

  const current = banners[index];
  const hasError = imageError[current?.image_url] || false;

  const BannerContent = (
    <>
      {current?.image_url && !hasError ? (
        <Image
          key={current.image_url}
          src={current.image_url}
          alt={current.alt_text || "Banner"}
          fill
          priority
          className="object-cover transition-opacity duration-500"
          sizes="(min-width: 1024px) 960px, 100vw"
          onError={() => {
            setImageError((prev) => ({ ...prev, [current.image_url]: true }));
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-xs sm:text-sm text-muted-foreground">
          ไม่มีรูปภาพ
        </div>
      )}
    </>
  );

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1 text-xs sm:text-sm text-muted-foreground">
        <p className="font-medium">
          แบนเนอร์โฆษณา • สไลด์แสดงโปรโมชันล่าสุดของร้าน
        </p>
      </div>
      <div className="relative overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative aspect-[16/9] w-full">
          {current.link_url ? (
            <Link href={current.link_url} className="block h-full w-full">
              {BannerContent}
            </Link>
          ) : (
            BannerContent
          )}
        </div>
        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-primary" : "w-2 bg-muted"
                }`}
                aria-label={`ไปยังแบนเนอร์ที่ ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}


