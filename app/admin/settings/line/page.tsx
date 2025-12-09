"use client";

import { useEffect, useState, useCallback } from "react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabaseClient";
import { useAlert } from "@/lib/alert";
import { MessageCircle, Copy, Check } from "lucide-react";

type LineConfig = {
  id?: number;
  channel_id: string;
  channel_secret: string;
  callback_url: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export default function AdminLineSettingsPage() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState<LineConfig>({
    channel_id: "",
    channel_secret: "",
    callback_url: "",
    is_active: false
  });

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("line_config")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Load config error:", error);
      }

      const defaultCallbackUrl = await getDefaultCallbackUrl();

      if (data) {
        setForm({
          channel_id: data.channel_id || "",
          channel_secret: data.channel_secret || "",
          // ใช้ค่าจาก env เสมอ (จะอัปเดตเมื่อบันทึก)
          callback_url: defaultCallbackUrl,
          is_active: data.is_active ?? false
        });
      } else {
        // ถ้ายังไม่มี config ให้ใช้ค่า default จาก NEXT_PUBLIC_SITE_URL
        setForm({
          channel_id: "",
          channel_secret: "",
          callback_url: defaultCallbackUrl,
          is_active: false
        });
      }
    } catch (err) {
      console.error("Load config error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function getDefaultCallbackUrl() {
    try {
      // ดึง NEXT_PUBLIC_SITE_URL จาก API (เพิ่ม cache busting)
      const response = await fetch(`/api/config/site-url?t=${Date.now()}`, {
        cache: "no-store"
      });
      const { siteUrl } = await response.json();
      
      if (siteUrl && siteUrl.trim()) {
        return `${siteUrl.trim()}/api/auth/line`;
      }
    } catch (error) {
      console.error("Get site URL error:", error);
    }
    
    // Fallback ไปใช้ window.location.origin ถ้าไม่มี env variable
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/auth/line`;
    }
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!form.channel_id.trim() || !form.channel_secret.trim()) {
      await showAlert("กรุณากรอก Channel ID และ Channel Secret", {
        title: "แจ้งเตือน"
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        channel_id: form.channel_id.trim(),
        channel_secret: form.channel_secret.trim(),
        callback_url: form.callback_url.trim() || (await getDefaultCallbackUrl()),
        is_active: form.is_active,
        updated_at: new Date().toISOString()
      };

      // ตรวจสอบว่ามี config อยู่แล้วหรือไม่
      const { data: existing } = await supabase
        .from("line_config")
        .select("id")
        .limit(1)
        .single();

      if (existing) {
        // อัปเดต
        const { error } = await supabase
          .from("line_config")
          .update(payload)
          .eq("id", existing.id);

        if (error) throw error;
        await showAlert("อัปเดตการตั้งค่า LINE Login สำเร็จ", {
          title: "สำเร็จ"
        });
      } else {
        // สร้างใหม่
        const { error } = await supabase.from("line_config").insert(payload);

        if (error) throw error;
        await showAlert("บันทึกการตั้งค่า LINE Login สำเร็จ", {
          title: "สำเร็จ"
        });
      }

      await loadConfig();
    } catch (err: any) {
      console.error("Save config error:", err);
      await showAlert("บันทึกไม่สำเร็จ กรุณาลองใหม่", {
        title: "เกิดข้อผิดพลาด"
      });
    } finally {
      setSaving(false);
    }
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "แอดมิน", href: "/admin" },
          { label: "ตั้งค่าระบบ", href: "/admin/settings" },
          { label: "LINE Login" }
        ]}
      />
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[#06C755]" />
          <h1 className="text-xl font-semibold tracking-tight">ตั้งค่า LINE Login</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          จัดการการตั้งค่าสำหรับการล็อกอินด้วย LINE
        </p>
      </section>

      {loading ? (
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">ข้อมูลการตั้งค่า</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="channel_id">
                    Channel ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="channel_id"
                    value={form.channel_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, channel_id: e.target.value }))
                    }
                    placeholder="เช่น 2001234567"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Channel ID จาก LINE Developers Console
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channel_secret">
                    Channel Secret <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="channel_secret"
                    type="password"
                    value={form.channel_secret}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, channel_secret: e.target.value }))
                    }
                    placeholder="เช่น abcdef1234567890..."
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Channel Secret จาก LINE Developers Console
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callback_url">Callback URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="callback_url"
                      value={form.callback_url}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, callback_url: e.target.value }))
                      }
                      placeholder="https://yourdomain.com/api/auth/line"
                      readOnly
                      className="bg-muted"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(form.callback_url, "callback")}
                    >
                      {copied === "callback" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    URL นี้ต้องตั้งค่าใน LINE Developers Console → Callback URL
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_active: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    เปิดใช้งาน LINE Login
                  </Label>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => loadConfig()}
                  disabled={saving}
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

