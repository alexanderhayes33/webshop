"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { useAlert } from "@/lib/alert";
import { ToggleLeft, ToggleRight, Trash2, Pencil, Plus, MessageCircle } from "lucide-react";
import Link from "next/link";

type ContactLink = {
  id: number;
  label: string;
  type: string;
  url: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

const CONTACT_TYPES = [
  { value: "line", label: "LINE" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "phone", label: "โทรศัพท์" },
  { value: "email", label: "อีเมล" },
  { value: "website", label: "เว็บไซต์" },
  { value: "other", label: "อื่นๆ" }
];

export default function AdminSettingsPage() {
  const { showAlert, showConfirm } = useAlert();
  const [contacts, setContacts] = useState<ContactLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    label: "",
    type: "line",
    url: "",
    display_order: "0",
    is_active: true
  });

  const sortedContacts = useMemo(
    () =>
      [...contacts].sort((a, b) => {
        if (a.display_order === b.display_order) {
          return (a.created_at || "").localeCompare(b.created_at || "");
        }
        return a.display_order - b.display_order;
      }),
    [contacts]
  );

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_links")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("load contacts error", error);
      await showAlert("โหลดช่องทางติดต่อไม่สำเร็จ", { title: "เกิดข้อผิดพลาด" });
    } else {
      setContacts((data as ContactLink[]) || []);
    }
    setLoading(false);
  }, [showAlert]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  function resetForm() {
    setForm({
      label: "",
      type: "line",
      url: "",
      display_order: "0",
      is_active: true
    });
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim() || !form.url.trim()) {
      await showAlert("กรุณากรอกชื่อและลิงก์ช่องทางติดต่อ", { title: "แจ้งเตือน" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        type: form.type,
        url: form.url.trim(),
        display_order: Number(form.display_order) || 0,
        is_active: form.is_active,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from("contact_links")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        await showAlert("อัปเดตช่องทางติดต่อเรียบร้อย", { title: "สำเร็จ" });
      } else {
        const { error } = await supabase.from("contact_links").insert(payload);
        if (error) throw error;
        await showAlert("เพิ่มช่องทางติดต่อเรียบร้อย", { title: "สำเร็จ" });
      }
      await loadContacts();
      resetForm();
    } catch (err) {
      console.error("save contact error", err);
      await showAlert("บันทึกไม่สำเร็จ กรุณาลองใหม่", { title: "เกิดข้อผิดพลาด" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: number, current: boolean) {
    const { error } = await supabase
      .from("contact_links")
      .update({ is_active: !current, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      await showAlert("อัปเดตสถานะไม่สำเร็จ", { title: "เกิดข้อผิดพลาด" });
    } else {
      await loadContacts();
    }
  }

  async function deleteContact(id: number) {
    const confirmed = await showConfirm("ต้องการลบช่องทางติดต่อนี้ใช่หรือไม่?", {
      title: "ยืนยันการลบ",
      description: "การลบจะไม่สามารถกู้คืนได้"
    });
    if (!confirmed) return;
    const { error } = await supabase.from("contact_links").delete().eq("id", id);
    if (error) {
      await showAlert("ลบไม่สำเร็จ", { title: "เกิดข้อผิดพลาด" });
    } else {
      await loadContacts();
      if (editingId === id) resetForm();
      await showAlert("ลบเรียบร้อยแล้ว", { title: "สำเร็จ" });
    }
  }

  function startEdit(contact: ContactLink) {
    setForm({
      label: contact.label,
      type: contact.type,
      url: contact.url,
      display_order: contact.display_order?.toString() ?? "0",
      is_active: contact.is_active
    });
    setEditingId(contact.id);
    setShowForm(true);
  }

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "แอดมิน", href: "/admin" },
          { label: "ตั้งค่าระบบ" }
        ]}
      />
      <section className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">ตั้งค่าระบบ</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          จัดการการตั้งค่าร้านค้าและช่องทางติดต่อ
        </p>
        <div className="pt-2 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/settings/line" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              ตั้งค่า LINE Login
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/settings/slipok" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              ตั้งค่า SlipOK Payment
            </Link>
          </Button>
        </div>
      </section>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold">ช่องทางติดต่อ</p>
            <p className="text-xs text-muted-foreground">
              เพิ่ม/แก้ไขช่องทางติดต่อที่จะแสดงใน footer และเมนูมือถือ
            </p>
          </div>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            เพิ่มช่องทาง
          </Button>
        </div>

        {showForm && (
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">
              {editingId ? "แก้ไขช่องทางติดต่อ" : "เพิ่มช่องทางติดต่อ"}
            </h3>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="label">ชื่อที่แสดง</Label>
                  <Input
                    id="label"
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="เช่น Line Official, Facebook"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">ประเภท</Label>
                  <Select
                    id="type"
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  >
                    {CONTACT_TYPES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
                <div className="space-y-2">
                  <Label htmlFor="url">ลิงก์/หมายเลข (เช่น https://, tel: , mailto:)</Label>
                  <Input
                    id="url"
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="เช่น https://line.me/ti/p/xxxx หรือ tel:+668x..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_order">ลำดับการแสดง</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={form.display_order}
                    onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
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
              ช่องทางทั้งหมด ({contacts.length})
            </span>
          </div>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-xs text-muted-foreground">ยังไม่มีช่องทางติดต่อ</p>
          ) : (
            <div className="space-y-2">
              {sortedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-xl border p-3 flex items-center justify-between gap-3 hover:border-primary/40 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{contact.label}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">
                        {contact.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ลำดับ {contact.display_order ?? 0}
                      </span>
                    </div>
                    <p className="text-xs text-primary break-all">{contact.url}</p>
                    <p className="text-[11px] text-muted-foreground">
                      สถานะ:{" "}
                      <span
                        className={
                          contact.is_active
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-muted-foreground"
                        }
                      >
                        {contact.is_active ? "เปิดใช้งาน" : "ปิด"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleActive(contact.id, contact.is_active)}
                      aria-label="toggle-active"
                    >
                      {contact.is_active ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startEdit(contact)}
                      aria-label="edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteContact(contact.id)}
                      aria-label="delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

