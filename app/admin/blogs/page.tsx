"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAlert } from "@/lib/alert";
import { Search, Plus, X, Sparkles } from "lucide-react";

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  category: string;
  cover_url: string | null;
  content: string | null;
  display_order: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

const categories = [
  { value: "blog", label: "Blog" },
  { value: "promotion", label: "โปรโมชั่น" },
  { value: "how-to-order", label: "วิธีสั่งซื้อ" }
];

export default function AdminBlogsPage() {
  const { showAlert, showConfirm } = useAlert();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: "",
    slug: "",
    category: "blog",
    cover_url: "",
    content: "",
    display_order: "0",
    is_active: true
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return posts;
    const q = search.toLowerCase();
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [posts, search]);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      await showAlert("โหลดบทความไม่สำเร็จ", { title: "เกิดข้อผิดพลาด" });
    } else {
      setPosts((data as BlogPost[]) || []);
    }
    setLoading(false);
  }

  function resetForm() {
    setForm({
      title: "",
      slug: "",
      category: "blog",
      cover_url: "",
      content: "",
      display_order: "0",
      is_active: true
    });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(post: BlogPost) {
    setForm({
      title: post.title,
      slug: post.slug,
      category: post.category,
      cover_url: post.cover_url || "",
      content: post.content || "",
      display_order: (post.display_order ?? 0).toString(),
      is_active: post.is_active
    });
    setEditingId(post.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) {
      await showAlert("กรุณากรอกชื่อและ slug", { title: "แจ้งเตือน" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      category: form.category,
      cover_url: form.cover_url.trim() || null,
      content: form.content.trim() || null,
      display_order: Number(form.display_order) || 0,
      is_active: form.is_active,
      updated_at: new Date().toISOString()
    };
    try {
      if (editingId) {
        const { error } = await supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        await showAlert("อัปเดตบทความเรียบร้อย", { title: "สำเร็จ" });
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
        await showAlert("เพิ่มบทความเรียบร้อย", { title: "สำเร็จ" });
      }
      await loadPosts();
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
      .from("blog_posts")
      .update({ is_active: !current, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      await showAlert("อัปเดตสถานะไม่สำเร็จ", { title: "เกิดข้อผิดพลาด" });
    } else {
      await loadPosts();
    }
  }

  async function deletePost(id: number) {
    const confirmed = await showConfirm("ต้องการลบบทความนี้หรือไม่?", {
      title: "ยืนยันการลบ",
      description: "การลบจะไม่สามารถกู้คืนได้"
    });
    if (!confirmed) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      await showAlert("ลบไม่สำเร็จ", { title: "เกิดข้อผิดพลาด" });
    } else {
      await loadPosts();
      if (editingId === id) resetForm();
      await showAlert("ลบเรียบร้อยแล้ว", { title: "สำเร็จ" });
    }
  }

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "แอดมิน", href: "/admin" },
          { label: "บทความ/โปรโมชัน/วิธีสั่งซื้อ" }
        ]}
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              จัดการบทความ & โปรโมชัน & วิธีสั่งซื้อ
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              ใช้ข้อมูลชุดเดียว แยกด้วย category
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
            เพิ่มบทความ
          </Button>
        </div>

        {showForm && (
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              {editingId ? "แก้ไขบทความ" : "เพิ่มบทความใหม่"}
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">ชื่อเรื่อง *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="เช่น โปรโมชั่นสัปดาห์นี้"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="เช่น promo-week-10"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">หมวด</Label>
                  <select
                    id="category"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
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
              <div className="space-y-2">
                <Label htmlFor="cover_url">รูปปก (URL)</Label>
                <Input
                  id="cover_url"
                  value={form.cover_url}
                  onChange={(e) => setForm((f) => ({ ...f, cover_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">เนื้อหา</Label>
                <Textarea
                  id="content"
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={6}
                  placeholder="รายละเอียดบทความ/โปรโมชัน/วิธีสั่งซื้อ"
                />
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
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">
                บทความทั้งหมด ({filtered.length}/{posts.length})
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา (ชื่อ, slug, หมวด)"
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
            <p className="text-xs text-muted-foreground">ยังไม่มีบทความ</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3 transition hover:border-primary/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{post.title}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">
                        {post.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ลำดับ {post.display_order ?? 0}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      slug: {post.slug}
                    </p>
                    {post.content && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {post.content}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      สถานะ:{" "}
                      <span
                        className={
                          post.is_active
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-muted-foreground"
                        }
                      >
                        {post.is_active ? "เปิดใช้งาน" : "ปิด"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-[11px]"
                      onClick={() => toggleActive(post.id, post.is_active)}
                    >
                      {post.is_active ? "ปิด" : "เปิด"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-[11px]"
                      onClick={() => startEdit(post)}
                    >
                      แก้ไข
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-[11px] text-destructive"
                      onClick={() => deletePost(post.id)}
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

