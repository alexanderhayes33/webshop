"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlert } from "@/lib/alert";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Search, X, User, Mail, Calendar, ShoppingCart, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type User = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  raw_app_meta_data: any;
  raw_user_meta_data: any;
  is_super_admin: boolean | null;
};

type UserWithStats = User & {
  orderCount: number;
  totalSpent: number;
};

export default function AdminUsersPage() {
  const { showAlert, showConfirm } = useAlert();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [updating, setUpdating] = useState(false);
  const [form, setForm] = useState({
    role: "",
    is_super_admin: false
  });

  const loadUsers = useCallback(async () => {
    setFetching(true);
    try {
      // ใช้ API route เพื่อดึง users
      const response = await fetch("/api/admin/users");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load users");
      }

      if (result.data) {
        // แปลงข้อมูลจาก API
        const usersList: UserWithStats[] = (result.data || []).map((u: any) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          raw_app_meta_data: { role: u.role, is_super_admin: u.is_super_admin },
          raw_user_meta_data: {},
          is_super_admin: u.is_super_admin || false,
          orderCount: Number(u.order_count) || 0,
          totalSpent: Number(u.total_spent) || 0
        }));

        setUsers(usersList);
      } else {
        setUsers([]);
      }
    } catch (error: any) {
      console.error("Error loading users:", error);
      await showAlert(
        error?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้",
        {
          title: "เกิดข้อผิดพลาด"
        }
      );
      setUsers([]);
    } finally {
      setFetching(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function startEdit(user: UserWithStats) {
    setForm({
      role: user.raw_app_meta_data?.role || "user",
      is_super_admin: user.is_super_admin || false
    });
    setSelectedUser(user);
  }

  function cancelEdit() {
    setSelectedUser(null);
    setForm({
      role: "",
      is_super_admin: false
    });
  }

  async function handleUpdate() {
    if (!selectedUser) return;

    setUpdating(true);
    try {
      // ใช้ API route เพื่ออัปเดต user metadata
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          role: form.role,
          is_super_admin: form.is_super_admin
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update user");
      }

      await showAlert("อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว", {
        title: "สำเร็จ"
      });

      await loadUsers();
      cancelEdit();
    } catch (error: any) {
      console.error("Error updating user:", error);
      await showAlert(
        error?.message || "เกิดข้อผิดพลาดในการอัปเดต",
        {
          title: "เกิดข้อผิดพลาด"
        }
      );
    } finally {
      setUpdating(false);
    }
  }

  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.id.toLowerCase().includes(query)
    );
  });

  function getUserRole(user: UserWithStats): string {
    if (user.is_super_admin) return "admin";
    return user.raw_app_meta_data?.role || "user";
  }

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: "แอดมิน", href: "/admin" },
          { label: "จัดการผู้ใช้" }
        ]}
      />
      <section className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            จัดการผู้ใช้
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            ดูและจัดการข้อมูลผู้ใช้ทั้งหมด
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr,400px]">
          {/* รายการผู้ใช้ */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">
                  รายการผู้ใช้ ({filteredUsers.length}/{users.length})
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="ค้นหา (อีเมล, ID)..."
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
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "ไม่พบผู้ใช้" : "ยังไม่มีผู้ใช้"}
              </p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredUsers.map((user) => {
                  const role = getUserRole(user);
                  const isAdmin = role === "admin" || user.is_super_admin;
                  return (
                    <div
                      key={user.id}
                      className={cn(
                        "rounded-lg border p-3 transition cursor-pointer hover:border-primary/50",
                        selectedUser?.id === user.id && "border-primary bg-primary/5"
                      )}
                      onClick={() => startEdit(user)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <p className="text-sm font-semibold truncate">
                              {user.email || "ไม่มีอีเมล"}
                            </p>
                            {isAdmin && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3" />
                              <span className="truncate font-mono text-[10px]">
                                {user.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              <span>
                                สมัคร:{" "}
                                {new Date(user.created_at).toLocaleDateString("th-TH", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric"
                                })}
                              </span>
                            </div>
                            {user.last_sign_in_at && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  เข้าสู่ระบบล่าสุด:{" "}
                                  {new Date(user.last_sign_in_at).toLocaleDateString("th-TH", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1.5">
                                <ShoppingCart className="h-3 w-3" />
                                <span>คำสั่งซื้อ: {user.orderCount}</span>
                              </div>
                              {user.totalSpent > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-primary">
                                    ยอดซื้อรวม: ฿{user.totalSpent.toLocaleString("th-TH")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(user);
                          }}
                        >
                          จัดการ
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ฟอร์มแก้ไข */}
          {selectedUser && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm h-fit">
              <h2 className="mb-4 text-lg font-semibold">แก้ไขผู้ใช้</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">อีเมล</Label>
                  <Input
                    value={selectedUser.email || ""}
                    disabled
                    className="h-9 text-sm bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-xs">
                    บทบาท
                  </Label>
                  <Select
                    id="role"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="h-9 text-sm"
                  >
                    <option value="user">ผู้ใช้ (User)</option>
                    <option value="admin">แอดมิน (Admin)</option>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_super_admin"
                    checked={form.is_super_admin}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_super_admin: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <Label htmlFor="is_super_admin" className="cursor-pointer text-xs">
                    Super Admin
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdate}
                    disabled={updating}
                    className="flex-1 text-xs"
                  >
                    {updating ? "กำลังอัปเดต..." : "อัปเดต"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelEdit}
                    disabled={updating}
                    className="text-xs"
                  >
                    ยกเลิก
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

