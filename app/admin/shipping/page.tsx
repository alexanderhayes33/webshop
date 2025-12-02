"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useAlert } from "@/lib/alert";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ShippingMethod = {
  id: number;
  name: string;
  description: string | null;
  base_price: number;
  price_per_kg: number | null;
  estimated_days: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export default function AdminShippingPage() {
  const [loading, setLoading] = useState(true);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { showAlert, showConfirm } = useAlert();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    base_price: "",
    price_per_kg: "",
    estimated_days: "",
    is_active: true
  });

  const loadShippingMethods = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("shipping_methods")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;
      setShippingMethods(data || []);
    } catch (error: any) {
      console.error("Error loading shipping methods:", error);
      showAlert(error.message || "ไม่สามารถโหลดข้อมูลได้", { title: "เกิดข้อผิดพลาด" });
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadShippingMethods();
  }, [loadShippingMethods]);

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      base_price: "",
      price_per_kg: "",
      estimated_days: "",
      is_active: true
    });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(method: ShippingMethod) {
    setFormData({
      name: method.name,
      description: method.description || "",
      base_price: method.base_price.toString(),
      price_per_kg: method.price_per_kg?.toString() || "",
      estimated_days: method.estimated_days?.toString() || "",
      is_active: method.is_active
    });
    setEditingId(method.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        base_price: parseFloat(formData.base_price) || 0,
        price_per_kg: formData.price_per_kg ? parseFloat(formData.price_per_kg) : null,
        estimated_days: formData.estimated_days ? parseInt(formData.estimated_days) : null,
        is_active: formData.is_active
      };

      if (editingId) {
        const { error } = await supabase
          .from("shipping_methods")
          .update(data)
          .eq("id", editingId);

        if (error) throw error;
        showAlert("อัพเดทวิธีการจัดส่งเรียบร้อย", { title: "สำเร็จ" });
      } else {
        const { error } = await supabase
          .from("shipping_methods")
          .insert([data]);

        if (error) throw error;
        showAlert("เพิ่มวิธีการจัดส่งเรียบร้อย", { title: "สำเร็จ" });
      }

      resetForm();
      loadShippingMethods();
    } catch (error: any) {
      console.error("Error saving shipping method:", error);
      showAlert(error.message || "ไม่สามารถบันทึกข้อมูลได้", { title: "เกิดข้อผิดพลาด" });
    }
  }

  async function handleDelete(id: number) {
    const confirmed = await showConfirm(
      "คุณแน่ใจหรือไม่ว่าต้องการลบวิธีการจัดส่งนี้?",
      { title: "ยืนยันการลบ" }
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("shipping_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;
      showAlert("ลบวิธีการจัดส่งเรียบร้อย", { title: "สำเร็จ" });
      loadShippingMethods();
    } catch (error: any) {
      console.error("Error deleting shipping method:", error);
      showAlert(error.message || "ไม่สามารถลบข้อมูลได้", { title: "เกิดข้อผิดพลาด" });
    }
  }

  async function handleToggleActive(id: number, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from("shipping_methods")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      loadShippingMethods();
    } catch (error: any) {
      console.error("Error toggling active:", error);
      showAlert(error.message || "ไม่สามารถอัพเดทสถานะได้", { title: "เกิดข้อผิดพลาด" });
    }
  }


  const filteredMethods = shippingMethods.filter((method) =>
    method.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    method.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "แอดมิน", href: "/admin" },
          { label: "จัดการค่าจัดส่ง" }
        ]}
      />
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              จัดการค่าจัดส่ง
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              จัดการวิธีการจัดส่งและค่าจัดส่ง
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            size="sm"
            className="h-9"
          >
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มวิธีการจัดส่ง
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="ค้นหาวิธีการจัดส่ง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 max-w-xs text-xs sm:text-sm"
          />
        </div>

        {/* Form */}
        {showForm && (
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              {editingId ? "แก้ไขวิธีการจัดส่ง" : "เพิ่มวิธีการจัดส่ง"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs sm:text-sm">
                    ชื่อวิธีการจัดส่ง *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="h-9 text-xs sm:text-sm"
                    placeholder="เช่น ไปรษณีย์ไทย, Kerry Express"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base_price" className="text-xs sm:text-sm">
                    ราคาพื้นฐาน (บาท) *
                  </Label>
                  <Input
                    id="base_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_price}
                    onChange={(e) =>
                      setFormData({ ...formData, base_price: e.target.value })
                    }
                    required
                    className="h-9 text-xs sm:text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_per_kg" className="text-xs sm:text-sm">
                    ราคาต่อกิโลกรัม (บาท) (ไม่บังคับ)
                  </Label>
                  <Input
                    id="price_per_kg"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_per_kg}
                    onChange={(e) =>
                      setFormData({ ...formData, price_per_kg: e.target.value })
                    }
                    className="h-9 text-xs sm:text-sm"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_days" className="text-xs sm:text-sm">
                    ระยะเวลาจัดส่ง (วัน) (ไม่บังคับ)
                  </Label>
                  <Input
                    id="estimated_days"
                    type="number"
                    min="1"
                    value={formData.estimated_days}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_days: e.target.value })
                    }
                    className="h-9 text-xs sm:text-sm"
                    placeholder="เช่น 1-3 วัน"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="is_active" className="text-xs sm:text-sm">
                    สถานะ
                  </Label>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      id="is_active"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({ ...formData, is_active: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="is_active" className="text-xs sm:text-sm">
                      เปิดใช้งาน
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs sm:text-sm">
                  คำอธิบาย (ไม่บังคับ)
                </Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="คำอธิบายเพิ่มเติม..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" className="h-9">
                  {editingId ? "อัพเดท" : "เพิ่ม"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={resetForm}
                >
                  ยกเลิก
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : filteredMethods.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "ไม่พบผลการค้นหา" : "ยังไม่มีวิธีการจัดส่ง"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{method.name}</h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        method.is_active
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {method.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                    </span>
                  </div>
                  {method.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {method.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      ราคาพื้นฐาน:{" "}
                      <span className="font-semibold text-foreground">
                        ฿{method.base_price.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </span>
                    {method.price_per_kg && (
                      <>
                        <span>•</span>
                        <span>
                          ต่อกิโลกรัม:{" "}
                          <span className="font-semibold text-foreground">
                            ฿{method.price_per_kg.toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        </span>
                      </>
                    )}
                    {method.estimated_days && (
                      <>
                        <span>•</span>
                        <span>
                          ระยะเวลา: {method.estimated_days} วัน
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleToggleActive(method.id, method.is_active)}
                    title={method.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  >
                    {method.is_active ? (
                      <span className="text-[10px] font-semibold text-emerald-600">ON</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-muted-foreground">OFF</span>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleEdit(method)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(method.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(method.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

