"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAlert } from "@/lib/alert";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    phone: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    } else if (user) {
      setForm({
        email: user.email || "",
        fullName: user.user_metadata?.full_name || "",
        phone: user.user_metadata?.phone || ""
      });
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      await showAlert("กรุณากรอกชื่อ-นามสกุล", { title: "แจ้งเตือน" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: form.fullName.trim(),
          phone: form.phone.trim()
        }
      });
      if (error) throw error;
      await showAlert("บันทึกข้อมูลโปรไฟล์เรียบร้อย", { title: "สำเร็จ" });
    } catch (err) {
      console.error("update profile error", err);
      await showAlert("บันทึกไม่สำเร็จ กรุณาลองใหม่", { title: "เกิดข้อผิดพลาด" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: "โปรไฟล์" }]} />
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">โปรไฟล์ของฉัน</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          จัดการข้อมูลส่วนตัวของคุณ
        </p>
      </section>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              ไม่สามารถเปลี่ยนอีเมลได้
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) =>
                setForm((f) => ({ ...f, fullName: e.target.value }))
              }
              placeholder="ชื่อ-นามสกุล"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="08X-XXX-XXXX"
            />
          </div>
          <Button type="submit" className="w-full">
            {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </Button>
        </form>
      </div>
    </div>
  );
}

