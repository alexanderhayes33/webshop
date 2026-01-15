"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAlert } from "@/lib/alert";
import { useEffect, useState, useCallback } from "react";
import { BANK_CODES } from "@/lib/bank-codes";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    phone: ""
  });
  const [bankAccount, setBankAccount] = useState({
    firstName: "",
    lastName: "",
    accountNo: "",
    bankCode: ""
  });
  const [saving, setSaving] = useState(false);
  const [loadingBankAccount, setLoadingBankAccount] = useState(true);

  const loadBankAccount = useCallback(async () => {
    if (!user) return;
    setLoadingBankAccount(true);
    try {
      const { data, error } = await supabase
        .from("user_bank_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // แยกชื่อและนามสกุลจาก account_name
        const accountNameParts = (data.account_name || "").split(" ");
        const firstName = accountNameParts[0] || "";
        const lastName = accountNameParts.slice(1).join(" ") || "";
        
        setBankAccount({
          firstName,
          lastName,
          accountNo: data.account_no || "",
          bankCode: data.bank_code || ""
        });
      } else {
        // ถ้าไม่มีข้อมูล ให้ reset เป็นค่าว่าง
        setBankAccount({
          firstName: "",
          lastName: "",
          accountNo: "",
          bankCode: ""
        });
      }
    } catch (err) {
      console.error("load bank account error", err);
    } finally {
      setLoadingBankAccount(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    } else if (user) {
      setForm({
        email: user.email || "",
        fullName: user.user_metadata?.full_name || "",
        phone: user.user_metadata?.phone || ""
      });
      loadBankAccount();
    }
  }, [user, loading, router, loadBankAccount]);

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

  const handleBankAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!bankAccount.firstName.trim() || !bankAccount.accountNo.trim() || !bankAccount.bankCode) {
      await showAlert("กรุณากรอกข้อมูลบัญชีให้ครบถ้วน", { title: "แจ้งเตือน" });
      return;
    }

    // รวมชื่อและนามสกุล (เก็บทั้งคู่ใน database แต่จะใช้แค่ชื่อจริงตอนสร้าง QR)
    const fullAccountName = bankAccount.lastName.trim() 
      ? `${bankAccount.firstName.trim()} ${bankAccount.lastName.trim()}`
      : bankAccount.firstName.trim();

    setSaving(true);
    try {
      // ตรวจสอบว่ามีบัญชีอยู่แล้วหรือไม่
      const { data: existing } = await supabase
        .from("user_bank_accounts")
        .select("id")
        .eq("user_id", user.id)
        .eq("account_no", bankAccount.accountNo.trim())
        .eq("bank_code", bankAccount.bankCode)
        .maybeSingle();

      if (existing) {
        // อัพเดทบัญชีที่มีอยู่
        const { error } = await supabase
          .from("user_bank_accounts")
          .update({
            account_name: fullAccountName,
            is_default: true,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // ตั้งค่า is_default ของบัญชีอื่นๆ เป็น false
        await supabase
          .from("user_bank_accounts")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .eq("is_default", true);

        // สร้างบัญชีใหม่
        const { error } = await supabase
          .from("user_bank_accounts")
          .insert({
            user_id: user.id,
            account_name: fullAccountName,
            account_no: bankAccount.accountNo.trim(),
            bank_code: bankAccount.bankCode,
            is_default: true
          });

        if (error) throw error;
      }

      await showAlert("บันทึกข้อมูลบัญชีเรียบร้อย", { title: "สำเร็จ" });
    } catch (err: any) {
      console.error("save bank account error", err);
      await showAlert(
        err.message?.includes("duplicate") 
          ? "บัญชีนี้มีอยู่ในระบบแล้ว" 
          : "บันทึกไม่สำเร็จ กรุณาลองใหม่",
        { title: "เกิดข้อผิดพลาด" }
      );
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
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-4 space-y-1">
          <h2 className="text-lg font-semibold">ข้อมูลบัญชีธนาคาร</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            ใช้สำหรับการชำระเงินผ่าน QR Code
          </p>
        </div>
        {loadingBankAccount ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleBankAccountSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">ชื่อ *</Label>
                <Input
                  id="firstName"
                  value={bankAccount.firstName}
                  onChange={(e) =>
                    setBankAccount((b) => ({ ...b, firstName: e.target.value }))
                  }
                  placeholder="ชื่อ"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">นามสกุล</Label>
                <Input
                  id="lastName"
                  value={bankAccount.lastName}
                  onChange={(e) =>
                    setBankAccount((b) => ({ ...b, lastName: e.target.value }))
                  }
                  placeholder="นามสกุล"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNo">เลขที่บัญชี *</Label>
              <Input
                id="accountNo"
                value={bankAccount.accountNo}
                onChange={(e) =>
                  setBankAccount((b) => ({ ...b, accountNo: e.target.value }))
                }
                placeholder="เลขที่บัญชี"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankCode">ธนาคาร *</Label>
              <Select
                id="bankCode"
                value={bankAccount.bankCode}
                onChange={(e) =>
                  setBankAccount((b) => ({ ...b, bankCode: e.target.value }))
                }
                required
              >
                <option value="">-- เลือกธนาคาร --</option>
                {BANK_CODES.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลบัญชี"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

