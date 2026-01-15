"use client";

import { useEffect, useState, useCallback } from "react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabaseClient";
import { useAlert } from "@/lib/alert";
import { ToggleLeft, ToggleRight, Plus, Trash2 } from "lucide-react";
import { BANK_CODES } from "@/lib/bank-codes";
import { Select } from "@/components/ui/select";

type SlipVerificationSettings = {
  id?: number;
  provider: string;
  slipok_branch_id: string | null;
  slipok_api_key: string | null;
  minimum_topup_amount: number;
  bank_accounts: Array<{
    account_name: string;
    account_no: string;
    bank_code: string;
  }>;
  is_active: boolean;
};

export default function SlipOKSettingsPage() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SlipVerificationSettings>({
    provider: "slipok",
    slipok_branch_id: "",
    slipok_api_key: "",
    minimum_topup_amount: 49,
    bank_accounts: [],
    is_active: true
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("slip_verification_settings")
        .select("*")
        .eq("provider", "slipok")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          ...data,
          bank_accounts: (data.bank_accounts as any) || []
        });
      }
    } catch (err) {
      console.error("load settings error", err);
      await showAlert("เกิดข้อผิดพลาดในการโหลดการตั้งค่า", {
        title: "เกิดข้อผิดพลาด"
      });
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!settings.slipok_branch_id?.trim() || !settings.slipok_api_key?.trim()) {
      await showAlert("กรุณากรอก SlipOK Branch ID และ API Key", {
        title: "แจ้งเตือน"
      });
      return;
    }

    setSaving(true);
    try {
      const settingsData = {
        provider: "slipok",
        slipok_branch_id: settings.slipok_branch_id.trim(),
        slipok_api_key: settings.slipok_api_key.trim(),
        minimum_topup_amount: Number(settings.minimum_topup_amount) || 49,
        bank_accounts: settings.bank_accounts,
        is_active: settings.is_active
      };

      if (settings.id) {
        const { error } = await supabase
          .from("slip_verification_settings")
          .update(settingsData)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("slip_verification_settings")
          .insert(settingsData);

        if (error) throw error;
      }

      await showAlert("บันทึกการตั้งค่าเรียบร้อย", { title: "สำเร็จ" });
      await loadSettings();
    } catch (err: any) {
      console.error("save settings error", err);
      await showAlert(
        err.message?.includes("duplicate")
          ? "การตั้งค่านี้มีอยู่แล้ว"
          : "บันทึกไม่สำเร็จ กรุณาลองใหม่",
        { title: "เกิดข้อผิดพลาด" }
      );
    } finally {
      setSaving(false);
    }
  }

  function addBankAccount() {
    setSettings({
      ...settings,
      bank_accounts: [
        ...settings.bank_accounts,
        {
          account_name: "",
          account_no: "",
          bank_code: ""
        }
      ]
    });
  }

  function removeBankAccount(index: number) {
    setSettings({
      ...settings,
      bank_accounts: settings.bank_accounts.filter((_, i) => i !== index)
    });
  }

  function updateBankAccount(index: number, field: string, value: string) {
    const updated = [...settings.bank_accounts];
    updated[index] = { ...updated[index], [field]: value };
    setSettings({ ...settings, bank_accounts: updated });
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "ตั้งค่า", href: "/admin/settings" },
          { label: "SlipOK Payment" }
        ]}
      />

      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          ตั้งค่า SlipOK Payment
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          ตั้งค่าการตรวจสอบสลิปการโอนเงินผ่าน SlipOK API
        </p>
      </section>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* SlipOK API Settings */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">SlipOK API Settings</h2>

            <div className="space-y-2">
              <Label htmlFor="slipok_branch_id">
                SlipOK Branch ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="slipok_branch_id"
                value={settings.slipok_branch_id || ""}
                onChange={(e) =>
                  setSettings({ ...settings, slipok_branch_id: e.target.value })
                }
                placeholder="กรอก Branch ID"
                required
              />
              <p className="text-xs text-muted-foreground">
                Branch ID สำหรับ SlipOK API (ใช้ใน URL: /api/line/apikey/BRANCH_ID)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slipok_api_key">
                SlipOK API Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="slipok_api_key"
                type="password"
                value={settings.slipok_api_key || ""}
                onChange={(e) =>
                  setSettings({ ...settings, slipok_api_key: e.target.value })
                }
                placeholder="กรอก API Key"
                required
              />
              <p className="text-xs text-muted-foreground">
                API Key สำหรับ SlipOK (ส่งใน header: x-authorization)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum_topup_amount">
                จำนวนเงินขั้นต่ำ (บาท)
              </Label>
              <Input
                id="minimum_topup_amount"
                type="number"
                min="0"
                step="0.01"
                value={settings.minimum_topup_amount}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    minimum_topup_amount: Number(e.target.value) || 49
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                จำนวนเงินขั้นต่ำที่รับ (default: 49 บาท)
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_active">เปิดใช้งาน</Label>
                <p className="text-xs text-muted-foreground">
                  เปิด/ปิดการใช้งาน SlipOK Payment
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setSettings({ ...settings, is_active: !settings.is_active })
                }
              >
                {settings.is_active ? (
                  <ToggleRight className="h-5 w-5 text-primary" />
                ) : (
                  <ToggleLeft className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Bank Accounts */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">บัญชีธนาคารผู้รับเงิน</h2>
                <p className="text-xs text-muted-foreground">
                  ตั้งค่าบัญชีธนาคารที่รับเงิน (ไม่บังคับ - ถ้าไม่ตั้งค่า จะรับทุกบัญชี)
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addBankAccount}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มบัญชี
              </Button>
            </div>

            {settings.bank_accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                ยังไม่มีการตั้งค่าบัญชีธนาคาร
              </p>
            ) : (
              <div className="space-y-4">
                {settings.bank_accounts.map((account, index) => (
                  <div
                    key={index}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium">บัญชี #{index + 1}</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeBankAccount(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`account_name_${index}`}>ชื่อบัญชี</Label>
                        <Input
                          id={`account_name_${index}`}
                          value={account.account_name}
                          onChange={(e) =>
                            updateBankAccount(index, "account_name", e.target.value)
                          }
                          placeholder="ชื่อบัญชี"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`account_no_${index}`}>เลขที่บัญชี</Label>
                        <Input
                          id={`account_no_${index}`}
                          value={account.account_no}
                          onChange={(e) =>
                            updateBankAccount(index, "account_no", e.target.value)
                          }
                          placeholder="เลขที่บัญชี"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`bank_code_${index}`}>ธนาคาร</Label>
                      <Select
                        id={`bank_code_${index}`}
                        value={account.bank_code}
                        onChange={(e) =>
                          updateBankAccount(index, "bank_code", e.target.value)
                        }
                      >
                        <option value="">-- เลือกธนาคาร --</option>
                        {BANK_CODES.map((bank) => (
                          <option key={bank.code} value={bank.code}>
                            {bank.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

