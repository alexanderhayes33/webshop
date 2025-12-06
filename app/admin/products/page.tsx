"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlert } from "@/lib/alert";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Search, X, Edit } from "lucide-react";
import { cn } from "@/lib/utils";

type Product = {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
  category_id: number | null;
  stock: number;
  is_active: boolean;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
};


export default function AdminProductsPage() {
  const { showConfirm } = useAlert();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    image_url: "",
    description: "",
    category_id: "",
    stock: "0",
    is_active: true
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [bulkEditForm, setBulkEditForm] = useState({
    category_id: "",
    is_active: null as boolean | null,
    stock_action: "" as "" | "set" | "add" | "subtract",
    stock_value: ""
  });

  useEffect(() => {
    async function load() {
      setFetching(true);
      const [productsResult, categoriesResult] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase
          .from("categories")
          .select("id, name, slug, is_active")
          .eq("is_active", true)
          .order("name", { ascending: true })
      ]);

      if (productsResult.error) {
        setError(productsResult.error.message);
      } else {
        setProducts(
          (productsResult.data as Product[])?.map((p) => ({
            ...p,
            is_active: (p as any).is_active ?? true
          })) ?? []
        );
      }

      if (categoriesResult.error) {
        console.error("Error loading categories:", categoriesResult.error);
      } else {
        setCategories((categoriesResult.data as Category[]) || []);
      }

      setFetching(false);
    }

    load();
  }, []);


  function resetForm() {
    setForm({
      name: "",
      price: "",
      image_url: "",
      description: "",
      category_id: "",
      stock: "0",
      is_active: true
    });
    setEditingId(null);
    setError(null);
  }

  async function startEdit(product: Product) {
    setForm({
      name: product.name,
      price: product.price.toString(),
      image_url: product.image_url || "",
      description: product.description || "",
      category_id: product.category_id?.toString() || "",
      stock: product.stock.toString(),
      is_active: product.is_active ?? true
    });
    setEditingId(product.id);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.price) return;
    setSaving(true);
    setError(null);

    const priceNumber = Number(form.price);
    const stockNumber = Number(form.stock);

    if (editingId) {
      // อัปเดตสินค้า
      const { data, error: err } = await supabase
        .from("products")
        .update({
          name: form.name,
          price: priceNumber,
          image_url: form.image_url || null,
          description: form.description || null,
          category_id: form.category_id ? Number(form.category_id) : null,
          stock: stockNumber,
          is_active: form.is_active
        })
        .eq("id", editingId)
        .select("*")
        .single();

      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }

      if (data) {
        setProducts((prev) =>
          prev.map((p) => (p.id === editingId ? (data as Product) : p))
        );
        resetForm();
      }
    } else {
      // เพิ่มสินค้าใหม่
      const { data, error: err } = await supabase
        .from("products")
        .insert({
          name: form.name,
          price: priceNumber,
          image_url: form.image_url || null,
          description: form.description || null,
          category_id: form.category_id ? Number(form.category_id) : null,
          stock: stockNumber,
          is_active: form.is_active
        })
        .select("*")
        .single();

      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }

      if (data) {
        setProducts((prev) => [...prev, data as Product]);
        resetForm();
      }
    }

    setSaving(false);
  }

  async function toggleActive(product: Product) {
    const next = !product.is_active;
    const { error: err } = await supabase
      .from("products")
      .update({ is_active: next })
      .eq("id", product.id);
    if (err) {
      setError(err.message);
      return;
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_active: next } : p))
    );
  }

  async function removeProduct(id: number) {
    const confirmed = await showConfirm(
      "คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?",
      {
        title: "ยืนยันการลบ",
        description: "การกระทำนี้ไม่สามารถยกเลิกได้"
      }
    );
    if (!confirmed) return;

    const { error: err } = await supabase.from("products").delete().eq("id", id);
    if (err) {
      setError(err.message);
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) {
      resetForm();
    }
  }

  function handleSelectProduct(productId: number) {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }

  function handleSelectAll() {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  }

  async function handleBulkUpdate() {
    if (selectedProductIds.length === 0) {
      setError("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updates: any = {};

      // อัพเดทหมวดหมู่
      if (bulkEditForm.category_id !== "") {
        if (bulkEditForm.category_id === "null") {
          updates.category_id = null;
        } else {
          updates.category_id = Number(bulkEditForm.category_id);
        }
      }

      // อัพเดทสถานะการแสดงผล
      if (bulkEditForm.is_active !== null) {
        updates.is_active = bulkEditForm.is_active;
      }

      // อัพเดทสต็อก
      if (bulkEditForm.stock_action && bulkEditForm.stock_value) {
        const stockValue = Number(bulkEditForm.stock_value);
        if (bulkEditForm.stock_action === "set") {
          updates.stock = stockValue;
        } else {
          // สำหรับ add และ subtract ต้องดึงสต็อกปัจจุบันก่อน
          const { data: currentProducts } = await supabase
            .from("products")
            .select("id, stock")
            .in("id", selectedProductIds);

          if (currentProducts) {
            for (const product of currentProducts) {
              let newStock: number;
              if (bulkEditForm.stock_action === "add") {
                newStock = (product.stock || 0) + stockValue;
              } else {
                newStock = Math.max(0, (product.stock || 0) - stockValue);
              }
              await supabase
                .from("products")
                .update({ stock: newStock })
                .eq("id", product.id);
            }
          }
        }
      }

      // อัพเดทข้อมูลสินค้า (ยกเว้นสต็อกที่จัดการแล้ว)
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from("products")
          .update(updates)
          .in("id", selectedProductIds);

        if (updateError) throw updateError;
      }


      // Reload products
      const { data: updatedProducts } = await supabase
        .from("products")
        .select("*")
        .in("id", selectedProductIds);

      if (updatedProducts) {
        setProducts((prev) =>
          prev.map((p) => {
            const updated = updatedProducts.find((up) => up.id === p.id);
            return updated ? (updated as Product) : p;
          })
        );
      }

      // Reset
      setSelectedProductIds([]);
      setBulkEditForm({
        category_id: "",
        is_active: null,
        stock_action: "",
        stock_value: ""
      });

      setError(null);
    } catch (err: any) {
      console.error("Error bulk updating:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการอัพเดท");
    } finally {
      setSaving(false);
    }
  }

  // Filter products based on search query and category
  const filteredProducts = products.filter((product) => {
    // Filter by category
    if (selectedCategoryId !== null) {
      if (product.category_id !== selectedCategoryId) {
        return false;
      }
    }

    // Filter by search query
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.id.toString().includes(query) ||
      product.price.toString().includes(query) ||
      (product.description?.toLowerCase().includes(query) ?? false)
    );
  });

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "แอดมิน", href: "/admin" },
          { label: "จัดการสินค้า" }
        ]}
      />
      <section className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">
          จัดการสินค้า (Products)
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          เพิ่ม / ปรับสถานะ / ลบสินค้าในระบบผ่านหน้าเดียว เหมาะสำหรับจัดการข้อมูล
          e‑commerce เบื้องต้น
        </p>
      </section>

      {/* Category Filter Buttons */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            หมวดหมู่:
          </span>
          {fetching ? (
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          ) : (
            <>
              <Button
                variant={selectedCategoryId === null ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  selectedCategoryId === null && "bg-primary text-primary-foreground"
                )}
                onClick={() => setSelectedCategoryId(null)}
              >
                ทั้งหมด
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategoryId === category.id ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 text-xs",
                    selectedCategoryId === category.id && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => setSelectedCategoryId(category.id)}
                >
                  {category.name}
                </Button>
              ))}
              {selectedCategoryId !== null && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => setSelectedCategoryId(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-[minmax(0,1.5fr),minmax(0,1fr)]">
        {/* ตารางสินค้า */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                รายการสินค้าในระบบ ({filteredProducts.length}/{products.length})
              </span>
              {fetching && <span className="text-[11px]">กำลังโหลด...</span>}
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ค้นหาสินค้า (ชื่อ, ID, ราคา, คำอธิบาย)..."
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
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              ยังไม่มีสินค้าในระบบ เริ่มเพิ่มสินค้าใหม่จากแบบฟอร์มด้านขวา
            </p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              ไม่พบสินค้าที่ค้นหา &quot;{searchQuery}&quot;
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredProducts.length > 0 &&
                          selectedProductIds.length === filteredProducts.length
                        }
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </th>
                    <th className="px-2 py-2 w-12">ลำดับ</th>
                    <th className="px-2 py-2">ชื่อสินค้า</th>
                    <th className="px-2 py-2">ราคา</th>
                    <th className="px-2 py-2">สต็อก</th>
                    <th className="px-2 py-2">สถานะ</th>
                    <th className="px-2 py-2 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => (
                    <tr
                      key={product.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </td>
                      <td className="px-2 py-2 text-[11px] text-muted-foreground text-center">
                        {index + 1}
                      </td>
                      <td className="px-2 py-2">{product.name}</td>
                      <td className="px-2 py-2">
                        ฿{Number(product.price).toLocaleString("th-TH")}
                      </td>
                      <td className="px-2 py-2 text-[11px]">
                        {product.stock ?? 0}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => toggleActive(product)}
                          className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] ${
                            product.is_active
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {product.is_active ? "แสดงในร้าน" : "ซ่อนจากร้าน"}
                        </button>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => startEdit(product)}
                          >
                            แก้ไข
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] text-destructive"
                            onClick={() => removeProduct(product.id)}
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

        {/* ฟอร์มเพิ่ม/แก้ไขสินค้า หรือ Bulk Edit */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          {selectedProductIds.length > 0 ? (
            <div className="space-y-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  แก้ไขหลายรายการ ({selectedProductIds.length} รายการ)
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setSelectedProductIds([])}
                >
                  ยกเลิก
                </Button>
              </div>
              <p className="mb-3 text-[11px] text-muted-foreground">
                เลือกการแก้ไขที่ต้องการ แล้วกดอัพเดทเพื่อบันทึกการเปลี่ยนแปลง
              </p>
              <div className="space-y-4">
                {/* หมวดหมู่ */}
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">หมวดหมู่</Label>
                  <Select
                    value={bulkEditForm.category_id}
                    onChange={(e) =>
                      setBulkEditForm({
                        ...bulkEditForm,
                        category_id: e.target.value
                      })
                    }
                    className="h-9 text-xs sm:text-sm"
                  >
                    <option value="">-- ไม่เปลี่ยนแปลง --</option>
                    <option value="null">ไม่มีหมวดหมู่</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </div>


                {/* สถานะการแสดงผล */}
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">สถานะการแสดงผล</Label>
                  <Select
                    value={
                      bulkEditForm.is_active === null
                        ? ""
                        : bulkEditForm.is_active
                        ? "true"
                        : "false"
                    }
                    onChange={(e) =>
                      setBulkEditForm({
                        ...bulkEditForm,
                        is_active:
                          e.target.value === ""
                            ? null
                            : e.target.value === "true"
                      })
                    }
                    className="h-9 text-xs sm:text-sm"
                  >
                    <option value="">-- ไม่เปลี่ยนแปลง --</option>
                    <option value="true">เปิดใช้งาน</option>
                    <option value="false">ปิดใช้งาน</option>
                  </Select>
                </div>

                {/* สต็อก */}
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">สต็อก</Label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Select
                      value={bulkEditForm.stock_action}
                      onChange={(e) =>
                        setBulkEditForm({
                          ...bulkEditForm,
                          stock_action: e.target.value as any
                        })
                      }
                      className="h-9 text-xs sm:text-sm"
                    >
                      <option value="">-- ไม่เปลี่ยนแปลง --</option>
                      <option value="set">ตั้งค่าเป็น</option>
                      <option value="add">เพิ่ม</option>
                      <option value="subtract">ลด</option>
                    </Select>
                    {bulkEditForm.stock_action && (
                      <Input
                        type="number"
                        min="0"
                        value={bulkEditForm.stock_value}
                        onChange={(e) =>
                          setBulkEditForm({
                            ...bulkEditForm,
                            stock_value: e.target.value
                          })
                        }
                        placeholder="จำนวน"
                        className="h-9 text-xs sm:text-sm"
                      />
                    )}
                  </div>
                </div>

                {error && (
                  <p className="text-[11px] text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button
                  onClick={handleBulkUpdate}
                  disabled={saving}
                  className="w-full text-xs"
                >
                  {saving ? "กำลังอัพเดท..." : "อัพเดท"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  {editingId ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
                </h2>
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={resetForm}
                  >
                    ยกเลิก
                  </Button>
                )}
              </div>
              <p className="mb-3 text-[11px] text-muted-foreground">
                {editingId
                  ? "แก้ไขข้อมูลสินค้า จากนั้นกดบันทึกเพื่ออัปเดต"
                  : "กรอกชื่อและราคาสินค้า จากนั้นกดบันทึก ระบบจะเพิ่มเข้าตารางด้านซ้ายทันที"}
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">
                    ชื่อสินค้า
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="เช่น POD NANO AIR"
                    className="h-9 text-sm"
                    required
                  />
                </div>
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-xs">
                ราคา (บาท)
              </Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
                placeholder="เช่น 1990"
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="image_url" className="text-xs">
                URL รูปภาพ
              </Label>
              <Input
                id="image_url"
                type="url"
                value={form.image_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, image_url: e.target.value }))
                }
                placeholder="https://example.com/image.jpg"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs">
                คำอธิบาย
              </Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="คำอธิบายสินค้า"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category_id" className="text-xs">
                หมวดหมู่
              </Label>
              <Select
                id="category_id"
                value={form.category_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category_id: e.target.value }))
                }
                className="h-9 text-sm"
              >
                <option value="">-- เลือกหมวดหมู่ --</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock" className="text-xs">
                สต็อก
              </Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stock: e.target.value }))
                }
                placeholder="0"
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="flex items-center space-x-2 rounded-lg border p-3">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_active: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
              />
              <Label
                htmlFor="is_active"
                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                แสดงสินค้าในร้าน
              </Label>
            </div>
            {error && (
              <p className="text-[11px] text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full text-xs"
              disabled={saving}
            >
              {saving
                ? "กำลังบันทึก..."
                : editingId
                  ? "อัปเดตสินค้า"
                  : "บันทึกสินค้า"}
            </Button>
          </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

