"use client";

import { Breadcrumb } from "@/components/layout/breadcrumb";

export default function AdminSettingsPage() {
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
          จัดการการตั้งค่าร้านค้าและระบบ
        </p>
      </section>

      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          หน้าตั้งค่ากำลังพัฒนา
        </p>
      </div>
    </div>
  );
}

