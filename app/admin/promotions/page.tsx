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
  created_at: string;
  updated_at: string;
};

export default function AdminPromotionsPage() {
  const { showAlert, showConfirm } = useAlert();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    promo_code: "",
    discount_percent: "",
    min_purchase_amount: "",
    is_active: true,
    start_date: "",
    end_date: ""
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadPromotions();
  }, []);

  async function loadPromotions() {
    setFetching(true);
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading promotions:", error);
    } else {
      setPromotions((data as Promotion[]) || []);
    }
    setFetching(false);
  }

  function cancelEdit() {
    setForm({
      title: "",
      description: "",
      promo_code: "",
      discount_percent: "",
      min_purchase_amount: "",
      is_active: true,
      start_date: "",
      end_date: ""
    });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(promotion: Promotion) {
    setForm({
      title: promotion.title,
      description: promotion.description || "",
      promo_code: promotion.promo_code || "",
      discount_percent: promotion.discount_percent?.toString() || "",
      min_purchase_amount: promotion.min_purchase_amount?.toString() || "",
      is_active: promotion.is_active,
      start_date: promotion.start_date
        ? new Date(promotion.start_date).toISOString().slice(0, 16)
        : "",
      end_date: promotion.end_date
        ? new Date(promotion.end_date).toISOString().slice(0, 16)
        : ""
    });
    setEditingId(promotion.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      await showAlert("กรุณากรอกชื่อโปรโมชัน", {
        title: "แจ้งเตือน"
      });
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        title: form.title,
        description: form.description || null,
        promo_code: form.promo_code || null,
        discount_percent: form.discount_percent
          ? parseFloat(form.discount_percent)
          : null,
        min_purchase_amount: form.min_purchase_amount
          ? parseFloat(form.min_purchase_amount)
          : null,
        is_active: form.is_active,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null
      };

      if (editingId) {
        const { error } = await supabase
          .from("promotions")
          .update(data)
          .eq("id", editingId);
        if (error) throw error;
        await showAlert("อัปเดตโปรโมชันเรียบร้อยแล้ว", {
          title: "สำเร็จ"
        });
      } else {
        const { error } = await supabase.from("promotions").insert(data);
        if (error) throw error;
        await showAlert("เพิ่มโปรโมชันเรียบร้อยแล้ว", {
          title: "สำเร็จ"
        });
      }

      await loadPromotions();
      cancelEdit();
    } catch (error: any) {
      console.error("Error saving promotion:", error);
      await showAlert("เกิดข้อผิดพลาดในการบันทึก", {
        title: "เกิดข้อผิดพลาด"
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: number, currentStatus: boolean) {
    const { error } = await supabase
      .from("promotions")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      await showAlert("เกิดข้อผิดพลาดในการอัปเดต", {
        title: "เกิดข้อผิดพลาด"
      });
    } else {
      await loadPromotions();
    }
  }

  async function deletePromotion(id: number) {
    const confirmed = await showConfirm(
      "คุณแน่ใจหรือไม่ว่าต้องการลบโปรโมชันนี้?",
      {
        title: "ยืนยันการลบ",
        description: "การกระทำนี้ไม่สามารถยกเลิกได้"
      }
    );
    if (!confirmed) return;

    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) {
      await showAlert("เกิดข้อผิดพลาดในการลบ", {
        title: "เกิดข้อผิดพลาด"
      });
    } else {
      await loadPromotions();
      if (editingId === id) {
        cancelEdit();
      }
      await showAlert("ลบโปรโมชันเรียบร้อยแล้ว", {
        title: "สำเร็จ"
      });
    }
  }

  const filteredPromotions = promotions.filter((promo) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      promo.title.toLowerCase().includes(query) ||
      (promo.promo_code?.toLowerCase().includes(query) ?? false) ||
      (promo.description?.toLowerCase().includes(query) ?? false)
    );
  });

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "แอดมิน", href: "/admin" },
          { label: "จัดการโปรโมชัน" }
        ]}
      />
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              จัดการโปรโมชัน
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              จัดการโปรโมชันที่แสดงในหน้าแรก
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
            เพิ่มโปรโมชัน
          </Button>
        </div>

        {showForm && (
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              {editingId ? "แก้ไขโปรโมชัน" : "เพิ่มโปรโมชันใหม่"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">ชื่อโปรโมชัน *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="เช่น โปรโมชันพิเศษประจำสัปดาห์"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promo_code">รหัสโปรโมชัน</Label>
                  <Input
                    id="promo_code"
                    value={form.promo_code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, promo_code: e.target.value }))
                    }
                    placeholder="เช่น VAPEWEEK10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">รายละเอียด</Label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="รายละเอียดโปรโมชัน"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="discount_percent">ส่วนลด (%)</Label>
                  <Input
                    id="discount_percent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.discount_percent}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        discount_percent: e.target.value
                      }))
                    }
                    placeholder="เช่น 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_purchase_amount">ยอดซื้อขั้นต่ำ (บาท)</Label>
                  <Input
                    id="min_purchase_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.min_purchase_amount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        min_purchase_amount: e.target.value
                      }))
                    }
                    placeholder="เช่น 2000"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_date">วันที่เริ่มต้น</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, start_date: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">วันที่สิ้นสุด</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, end_date: e.target.value }))
                    }
                  />
                </div>
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
                รายการโปรโมชัน ({filteredPromotions.length}/{promotions.length})
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ค้นหา (ชื่อ, รหัส, รายละเอียด)..."
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
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredPromotions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "ไม่พบโปรโมชัน" : "ยังไม่มีโปรโมชัน"}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredPromotions.map((promo) => (
                <div
                  key={promo.id}
                  className="rounded-lg border p-3 transition hover:border-primary/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{promo.title}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            promo.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {promo.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                        </span>
                      </div>
                      {promo.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {promo.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {promo.promo_code && (
                          <span>รหัส: {promo.promo_code}</span>
                        )}
                        {promo.discount_percent && (
                          <span>ส่วนลด: {promo.discount_percent}%</span>
                        )}
                        {promo.min_purchase_amount && (
                          <span>
                            ซื้อขั้นต่ำ: ฿
                            {Number(promo.min_purchase_amount).toLocaleString(
                              "th-TH"
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => startEdit(promo)}
                      >
                        แก้ไข
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => toggleActive(promo.id, promo.is_active)}
                      >
                        {promo.is_active ? "ปิด" : "เปิด"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px] text-destructive"
                        onClick={() => deletePromotion(promo.id)}
                      >
                        ลบ
                      </Button>
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

