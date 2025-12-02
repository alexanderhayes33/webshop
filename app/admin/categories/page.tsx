"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlert } from "@/lib/alert";
import { Breadcrumb } from "@/components/layout/breadcrumb";

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export default function AdminCategoriesPage() {
  const { showConfirm, showAlert } = useAlert();
  const [categories, setCategories] = useState<Category[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: ""
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setFetching(true);
      const { data, error: err } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: false });

      if (err) {
        setError(err.message);
      } else {
        setCategories((data as Category[]) || []);
      }
      setFetching(false);
    }

    load();
  }, []);

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      // รองรับตัวอักษรไทย (ก-๙), ตัวอักษรอังกฤษ (a-z), ตัวเลข (0-9), space และ hyphen
      .replace(/[^\u0E00-\u0E7Fa-z0-9\s-]/g, "")
      // แทนที่ space หลายตัวด้วย hyphen เดียว
      .replace(/\s+/g, "-")
      // แทนที่ hyphen หลายตัวด้วย hyphen เดียว
      .replace(/-+/g, "-")
      // ตัด hyphen ที่หัวและท้าย
      .replace(/^-+|-+$/g, "")
      .trim();
  }

  function startEdit(category: Category) {
    setForm({
      name: category.name,
      description: category.description || ""
    });
    setEditingId(category.id);
    setError(null);
  }

  function cancelEdit() {
    setForm({ name: "", description: "" });
    setEditingId(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    setError(null);

    // สร้าง slug อัตโนมัติจากชื่อ
    const slug = generateSlug(form.name);

    if (editingId) {
      // แก้ไขหมวดหมู่
      const { data, error: err } = await supabase
        .from("categories")
        .update({
          name: form.name,
          slug: slug,
          description: form.description || null
        })
        .eq("id", editingId)
        .select("*")
        .single();

      if (err) {
        setError(err.message);
      } else if (data) {
        setCategories((prev) =>
          prev.map((c) => (c.id === editingId ? (data as Category) : c))
        );
        await showAlert("อัปเดตหมวดหมู่เรียบร้อยแล้ว", {
          title: "สำเร็จ"
        });
        cancelEdit();
      }
    } else {
      // เพิ่มหมวดหมู่ใหม่
      const { data, error: err } = await supabase
        .from("categories")
        .insert({
          name: form.name,
          slug: slug,
          description: form.description || null
        })
        .select("*")
        .single();

      if (err) {
        setError(err.message);
      } else if (data) {
        setCategories((prev) => [data as Category, ...prev]);
        await showAlert("เพิ่มหมวดหมู่เรียบร้อยแล้ว", {
          title: "สำเร็จ"
        });
        cancelEdit();
      }
    }

    setSaving(false);
  }

  async function toggleActive(category: Category) {
    const next = !category.is_active;
    const { error: err } = await supabase
      .from("categories")
      .update({ is_active: next })
      .eq("id", category.id);
    if (err) {
      setError(err.message);
      return;
    }
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, is_active: next } : c))
    );
  }

  async function removeCategory(id: number) {
    const confirmed = await showConfirm(
      "คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้?",
      {
        title: "ยืนยันการลบ",
        description: "การกระทำนี้ไม่สามารถยกเลิกได้"
      }
    );
    if (!confirmed) return;

    const { error: err } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "แอดมิน", href: "/admin" },
          { label: "จัดการหมวดหมู่" }
        ]}
      />
      <section className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">
          จัดการหมวดหมู่ (Categories)
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          เพิ่ม / แก้ไข / ลบหมวดหมู่สินค้า
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-[minmax(0,1.5fr),minmax(0,1fr)]">
        {/* ตารางหมวดหมู่ */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              รายการหมวดหมู่
            </span>
            {fetching && <span className="text-[11px]">กำลังโหลด...</span>}
          </div>
          {fetching ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              ยังไม่มีหมวดหมู่ในระบบ เริ่มเพิ่มหมวดหมู่ใหม่จากแบบฟอร์มด้านขวา
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">ชื่อหมวดหมู่</th>
                    <th className="px-2 py-2">สถานะ</th>
                    <th className="px-2 py-2 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-2 py-2">
                        <div>
                          <p className="font-medium">{category.name}</p>
                          {category.description && (
                            <p className="text-[11px] text-muted-foreground">
                              {category.description}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                            {category.slug}
                          </p>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => toggleActive(category)}
                          className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] ${
                            category.is_active
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {category.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                        </button>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => startEdit(category)}
                          >
                            แก้ไข
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] text-destructive"
                            onClick={() => removeCategory(category.id)}
                          >
                            ลบ
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ฟอร์มเพิ่ม/แก้ไขหมวดหมู่ */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">
            {editingId ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
          </h2>
          <p className="mb-3 mt-1 text-[11px] text-muted-foreground">
            {editingId
              ? "แก้ไขชื่อหมวดหมู่ จากนั้นกดบันทึก ระบบจะอัปเดต URL อัตโนมัติ"
              : "กรอกชื่อหมวดหมู่ จากนั้นกดบันทึก ระบบจะสร้าง URL อัตโนมัติให้"}
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">
                ชื่อหมวดหมู่
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="เช่น Pod / Device"
                className="h-9 text-sm"
                required
              />
              {form.name && (
                <p className="text-[10px] text-muted-foreground">
                  URL ที่จะสร้าง: <span className="font-mono text-primary">{generateSlug(form.name)}</span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs">
                คำอธิบาย (ไม่บังคับ)
              </Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="คำอธิบายหมวดหมู่"
                className="h-9 text-sm"
              />
            </div>
            {error && (
              <p className="text-[11px] text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 text-xs"
                disabled={saving}
              >
                {saving ? "กำลังบันทึก..." : editingId ? "อัปเดต" : "บันทึกหมวดหมู่"}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  ยกเลิก
                </Button>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

