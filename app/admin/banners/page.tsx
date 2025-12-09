"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlert } from "@/lib/alert";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Search, X, Plus } from "lucide-react";
import Image from "next/image";
import { ImageUpload } from "@/components/admin/image-upload";

type Banner = {
  id: number;
  image_url: string;
  alt_text: string | null;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function AdminBannersPage() {
  const { showAlert, showConfirm } = useAlert();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    image_url: "",
    alt_text: "",
    link_url: "",
    display_order: "0",
    is_active: true
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadBanners();
  }, []);

  async function loadBanners() {
    setFetching(true);
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading banners:", error);
    } else {
      setBanners((data as Banner[]) || []);
    }
    setFetching(false);
  }

  function cancelEdit() {
    setForm({
      image_url: "",
      alt_text: "",
      link_url: "",
      display_order: "0",
      is_active: true
    });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(banner: Banner) {
    setForm({
      image_url: banner.image_url,
      alt_text: banner.alt_text || "",
      link_url: banner.link_url || "",
      display_order: banner.display_order.toString(),
      is_active: banner.is_active
    });
    setEditingId(banner.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.image_url.trim()) {
      await showAlert("กรุณาอัปโหลดรูปภาพ", {
        title: "แจ้งเตือน"
      });
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        image_url: form.image_url,
        alt_text: form.alt_text || null,
        link_url: form.link_url || null,
        display_order: parseInt(form.display_order) || 0,
        is_active: form.is_active
      };

      if (editingId) {
        const { error } = await supabase
          .from("banners")
          .update(data)
          .eq("id", editingId);
        if (error) throw error;
        await showAlert("อัปเดตแบนเนอร์เรียบร้อยแล้ว", {
          title: "สำเร็จ"
        });
      } else {
        const { error } = await supabase.from("banners").insert(data);
        if (error) throw error;
        await showAlert("เพิ่มแบนเนอร์เรียบร้อยแล้ว", {
          title: "สำเร็จ"
        });
      }

      await loadBanners();
      cancelEdit();
    } catch (error: any) {
      console.error("Error saving banner:", error);
      await showAlert("เกิดข้อผิดพลาดในการบันทึก", {
        title: "เกิดข้อผิดพลาด"
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: number, currentStatus: boolean) {
    const { error } = await supabase
      .from("banners")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      await showAlert("เกิดข้อผิดพลาดในการอัปเดต", {
        title: "เกิดข้อผิดพลาด"
      });
    } else {
      await loadBanners();
    }
  }

  async function deleteBanner(id: number) {
    const confirmed = await showConfirm(
      "คุณแน่ใจหรือไม่ว่าต้องการลบแบนเนอร์นี้?",
      {
        title: "ยืนยันการลบ",
        description: "การกระทำนี้ไม่สามารถยกเลิกได้"
      }
    );
    if (!confirmed) return;

    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) {
      await showAlert("เกิดข้อผิดพลาดในการลบ", {
        title: "เกิดข้อผิดพลาด"
      });
    } else {
      await loadBanners();
      if (editingId === id) {
        cancelEdit();
      }
      await showAlert("ลบแบนเนอร์เรียบร้อยแล้ว", {
        title: "สำเร็จ"
      });
    }
  }

  const filteredBanners = banners.filter((banner) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (banner.alt_text?.toLowerCase().includes(query) ?? false) ||
      banner.image_url.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "แอดมิน", href: "/admin" },
          { label: "จัดการแบนเนอร์" }
        ]}
      />
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              จัดการแบนเนอร์
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              จัดการแบนเนอร์ที่แสดงในหน้าแรก
            </p>
          </div>
          <Button
            onClick={() => {
              cancelEdit();
              setShowForm(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            เพิ่มแบนเนอร์
          </Button>
        </div>

        {showForm && (
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              {editingId ? "แก้ไขแบนเนอร์" : "เพิ่มแบนเนอร์ใหม่"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <ImageUpload
                  value={form.image_url}
                  onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                  label="รูปภาพแบนเนอร์"
                  required
                  previewClassName="max-w-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alt_text">ข้อความอธิบายรูป</Label>
                <Input
                  id="alt_text"
                  value={form.alt_text}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, alt_text: e.target.value }))
                  }
                  placeholder="เช่น โปรโมชันพิเศษ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link_url">ลิงก์ (ไม่บังคับ)</Label>
                <Input
                  id="link_url"
                  value={form.link_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, link_url: e.target.value }))
                  }
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">ลำดับการแสดง</Label>
                <Input
                  id="display_order"
                  type="number"
                  min="0"
                  value={form.display_order}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, display_order: e.target.value }))
                  }
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  ตัวเลขน้อยกว่าจะแสดงก่อน
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  เปิดใช้งาน
                </Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "กำลังบันทึก..." : editingId ? "อัปเดต" : "เพิ่ม"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  ยกเลิก
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                รายการแบนเนอร์ ({filteredBanners.length}/{banners.length})
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ค้นหา (URL, ข้อความอธิบาย)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-7 pr-7 text-xs"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {fetching ? (
            <div className="space-y-2">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : filteredBanners.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "ไม่พบแบนเนอร์" : "ยังไม่มีแบนเนอร์"}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredBanners.map((banner) => (
                <div
                  key={banner.id}
                  className="rounded-lg border p-3 transition hover:border-primary/50"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-lg border bg-muted">
                      <Image
                        src={banner.image_url}
                        alt={banner.alt_text || "Banner"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 300px"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">
                          {banner.alt_text || "ไม่มีข้อความอธิบาย"}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            banner.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {banner.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          ลำดับ: {banner.display_order}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground break-all">
                        {banner.image_url}
                      </p>
                      {banner.link_url && (
                        <p className="text-xs text-muted-foreground break-all">
                          ลิงก์: {banner.link_url}
                        </p>
                      )}
                      <div className="flex items-center gap-1 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => startEdit(banner)}
                        >
                          แก้ไข
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => toggleActive(banner.id, banner.is_active)}
                        >
                          {banner.is_active ? "ปิด" : "เปิด"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px] text-destructive"
                          onClick={() => deleteBanner(banner.id)}
                        >
                          ลบ
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

