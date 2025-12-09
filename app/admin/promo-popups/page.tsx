"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlert } from "@/lib/alert";
import { Search, Plus, X } from "lucide-react";
import { ImageUpload } from "@/components/admin/image-upload";

type Popup = {
  id: number;
  title: string | null;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  display_order: number | null;
  created_at?: string;
  updated_at?: string;
};

export default function AdminPromoPopupsPage() {
  const { showAlert, showConfirm } = useAlert();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: "",
    image_url: "",
    link_url: "",
    start_date: "",
    end_date: "",
    display_order: "0",
    is_active: true
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return popups;
    const q = search.toLowerCase();
    return popups.filter(
      (p) =>
        (p.title || "").toLowerCase().includes(q) ||
        (p.link_url || "").toLowerCase().includes(q)
    );
  }, [popups, search]);

  const loadPopups = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promotion_popups")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      await showAlert("โหลด popup ไม่สำเร็จ", { title: "เกิดข้อผิดพลาด" });
    } else {
      setPopups((data as Popup[]) || []);
    }
    setLoading(false);
  }, [showAlert]);

  useEffect(() => {
    loadPopups();
  }, [loadPopups]);

  function resetForm() {
    setForm({
      title: "",
      image_url: "",
      link_url: "",
      start_date: "",
      end_date: "",
      display_order: "0",
      is_active: true
    });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(p: Popup) {
    setForm({
      title: p.title || "",
      image_url: p.image_url,
      link_url: p.link_url || "",
      start_date: p.start_date
        ? new Date(p.start_date).toISOString().slice(0, 16)
        : "",
      end_date: p.end_date ? new Date(p.end_date).toISOString().slice(0, 16) : "",
      display_order: (p.display_order ?? 0).toString(),
      is_active: p.is_active
    });
    setEditingId(p.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.image_url.trim()) {
      await showAlert("กรุณาอัปโหลดรูปภาพ", { title: "แจ้งเตือน" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim() || null,
      image_url: form.image_url.trim(),
      link_url: form.link_url.trim() || null,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      display_order: Number(form.display_order) || 0,
      is_active: form.is_active,
      updated_at: new Date().toISOString()
    };
    try {
      if (editingId) {
        const { error } = await supabase
          .from("promotion_popups")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        await showAlert("อัปเดต popup เรียบร้อย", { title: "สำเร็จ" });
      } else {
        const { error } = await supabase.from("promotion_popups").insert(payload);
        if (error) throw error;
        await showAlert("เพิ่ม popup เรียบร้อย", { title: "สำเร็จ" });
      }
      await loadPopups();
      resetForm();
    } catch (err) {
      console.error(err);
      await showAlert("บันทึกไม่สำเร็จ", { title: "เกิดข้อผิดพลาด" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: number, current: boolean) {
    const { error } = await supabase
      .from("promotion_popups")
      .update({ is_active: !current, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      await showAlert("อัปเดตสถานะไม่สำเร็จ", { title: "เกิดข้อผิดพลาด" });
    } else {
      await loadPopups();
    }
  }

  async function deletePopup(id: number) {
    const confirmed = await showConfirm("ต้องการลบ popup นี้หรือไม่?", {
      title: "ยืนยันการลบ",
      description: "การลบจะไม่สามารถกู้คืนได้"
    });
    if (!confirmed) return;
    const { error } = await supabase.from("promotion_popups").delete().eq("id", id);
    if (error) {
      await showAlert("ลบไม่สำเร็จ", { title: "เกิดข้อผิดพลาด" });
    } else {
      await loadPopups();
      if (editingId === id) resetForm();
      await showAlert("ลบเรียบร้อยแล้ว", { title: "สำเร็จ" });
    }
  }

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "แอดมิน", href: "/admin" },
          { label: "Popup โปรโมชัน" }
        ]}
      />
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">จัดการ Popup โปรโมชัน</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              ใช้โชว์ pop-up ภาพโปรโมชันในหน้าแรก
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            เพิ่ม Popup
          </Button>
        </div>

        {showForm && (
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              {editingId ? "แก้ไข Popup" : "เพิ่ม Popup ใหม่"}
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">ชื่อ (ไม่บังคับ)</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="เช่น โปรพิเศษสัปดาห์นี้"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_order">ลำดับ</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={form.display_order}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, display_order: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <ImageUpload
                  value={form.image_url}
                  onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                  label="รูปภาพ Popup"
                  required
                  previewClassName="max-w-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link_url">ลิงก์เมื่อคลิก (ไม่บังคับ)</Label>
                <Input
                  id="link_url"
                  value={form.link_url}
                  onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                  placeholder="https://... หรือ /products"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_date">เริ่มแสดง</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">สิ้นสุด</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
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
                <Button type="button" variant="outline" onClick={resetForm}>
                  ยกเลิก
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              Popup ทั้งหมด ({filtered.length}/{popups.length})
            </span>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา (ชื่อ, ลิงก์)"
                className="h-8 pl-7 pr-7 text-xs"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground">ยังไม่มี popup</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3 transition hover:border-primary/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">
                        {p.title || "ไม่ระบุชื่อ"}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        ลำดับ {p.display_order ?? 0}
                      </span>
                    </div>
                    <p className="text-[11px] text-primary line-clamp-1">
                      {p.image_url}
                    </p>
                    {p.link_url && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        ลิงก์: {p.link_url}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      สถานะ:{" "}
                      <span
                        className={
                          p.is_active
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-muted-foreground"
                        }
                      >
                        {p.is_active ? "เปิดใช้งาน" : "ปิด"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-[11px]"
                      onClick={() => toggleActive(p.id, p.is_active)}
                    >
                      {p.is_active ? "ปิด" : "เปิด"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-[11px]"
                      onClick={() => startEdit(p)}
                    >
                      แก้ไข
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-[11px] text-destructive"
                      onClick={() => deletePopup(p.id)}
                    >
                      ลบ
                    </Button>
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

