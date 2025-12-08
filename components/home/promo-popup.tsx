"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Popup = {
  id: number;
  title: string | null;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  display_order: number | null;
};

export function PromoPopup() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Popup | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("promotion_popups")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      setPopups((data as Popup[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const candidate = useMemo(() => {
    const now = new Date();
    return popups.find((p) => {
      const start = p.start_date ? new Date(p.start_date) : null;
      const end = p.end_date ? new Date(p.end_date) : null;
      return (
        (!start || start <= now) &&
        (!end || end >= now) &&
        p.is_active === true
      );
    }) || null;
  }, [popups]);

  useEffect(() => {
    if (loading) return;
    if (!candidate) return;
    const key = `popup_seen_${candidate.id}`;
    const seen = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (!seen) {
      setCurrent(candidate);
      setOpen(true);
      localStorage.setItem(key, "1");
    }
  }, [candidate, loading]);

  if (loading) {
    return (
      <div className="hidden">
        <Skeleton className="h-8 w-24" />
      </div>
    );
  }

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">
            {current.title || "โปรโมชั่นพิเศษ"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            ดูรายละเอียดเพิ่มเติมได้ที่ปุ่มด้านล่าง
          </DialogDescription>
        </DialogHeader>
        <div className="relative w-full">
          <div className="relative aspect-[4/5] w-full bg-muted">
            <Image
              src={current.image_url}
              alt={current.title || "Promotion"}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 p-4">
          <Button variant="ghost" onClick={() => setOpen(false)} className="w-full">
            ปิด
          </Button>
          {current.link_url && (
            <Button asChild className="w-full">
              <Link href={current.link_url}>ดูรายละเอียด</Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

