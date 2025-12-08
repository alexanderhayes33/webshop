"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  Mail,
  MessageCircle,
  Globe,
  Instagram,
  Facebook,
  Link2
} from "lucide-react";

type ContactLink = {
  id: number;
  label: string;
  type: string;
  url: string;
  display_order: number;
  is_active: boolean;
};

function getIcon(type: string) {
  switch (type) {
    case "phone":
      return Phone;
    case "email":
      return Mail;
    case "line":
      return MessageCircle;
    case "website":
      return Globe;
    case "instagram":
      return Instagram;
    case "facebook":
      return Facebook;
    default:
      return Link2;
  }
}

export function SiteFooter() {
  const [contacts, setContacts] = useState<ContactLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContacts() {
      setLoading(true);
      const { data, error } = await supabase
        .from("contact_links")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!error && data) {
        setContacts(data as ContactLink[]);
      }
      setLoading(false);
    }
    loadContacts();
  }, []);

  const visibleContacts = useMemo(
    () => contacts.filter((c) => c.is_active),
    [contacts]
  );

  return (
    <footer className="border-t mt-12">
      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-4 text-xs text-muted-foreground">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">168VAPE</p>
            <p className="max-w-sm text-[11px]">
              ร้านขายพอตและอุปกรณ์อิเล็กทรอนิกส์สำหรับสูบ จำหน่ายสินค้าคุณภาพ
              พร้อมบริการจัดส่งรวดเร็ว
            </p>
          </div>
          <div className="flex gap-8 text-[11px]">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">สินค้า</p>
              <p>พอตและอุปกรณ์</p>
              <p>น้ำยาสำหรับพอต</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">บริการ</p>
              <p>จัดส่งภายใน 24 ชั่วโมง</p>
              <p>สินค้าใหม่อัปเดตทุกสัปดาห์</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card/60 p-4">
          <p className="text-[11px] font-semibold text-foreground">ช่องทางติดต่อ</p>
          {loading ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : visibleContacts.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">ยังไม่มีช่องทางติดต่อ</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {visibleContacts.map((c) => {
                const Icon = getIcon(c.type);
                return (
                  <Link
                    key={c.id}
                    href={c.url}
                    className="flex items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-[11px] transition hover:border-primary/50 hover:text-foreground"
                    target={c.url.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium line-clamp-1">{c.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t pt-3 text-[11px] text-muted-foreground/80 md:flex-row">
          <span>© {new Date().getFullYear()} 168VAPE. สงวนลิขสิทธิ์ทั้งหมด</span>
          <span>ร้านขายพอตและอุปกรณ์อิเล็กทรอนิกส์สำหรับสูบ</span>
        </div>
      </div>
    </footer>
  );
}

