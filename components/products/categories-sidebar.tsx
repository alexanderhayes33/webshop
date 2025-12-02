"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";

type Category = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
};

type CategoriesSidebarProps = {
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
};

export function CategoriesSidebar({
  selectedCategoryId,
  onSelectCategory
}: CategoriesSidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading categories:", error);
        setCategories([]);
      } else {
        setCategories((data as Category[]) || []);
      }
      setLoading(false);
    }

    loadCategories();
  }, []);

  return (
    <>
      {/* Mobile Select */}
      <div className="md:hidden">
        <Select
          value={selectedCategoryId?.toString() || "all"}
          onChange={(e) => {
            const value = e.target.value;
            onSelectCategory(value === "all" ? null : parseInt(value));
          }}
          className="w-full"
        >
          <option value="all">ทั้งหมด</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 md:block">
        <div className="sticky top-24 space-y-4">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">หมวดหมู่สินค้า</h2>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <nav className="space-y-1">
                <Button
                  variant={selectedCategoryId === null ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2",
                    selectedCategoryId === null &&
                      "bg-primary text-primary-foreground"
                  )}
                  onClick={() => onSelectCategory(null)}
                >
                  <Package className="h-4 w-4" />
                  <span className="text-sm">ทั้งหมด</span>
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={
                      selectedCategoryId === category.id ? "default" : "ghost"
                    }
                    className={cn(
                      "w-full justify-start gap-2",
                      selectedCategoryId === category.id &&
                        "bg-primary text-primary-foreground"
                    )}
                    onClick={() => onSelectCategory(category.id)}
                  >
                    <Package className="h-4 w-4" />
                    <span className="text-sm">{category.name}</span>
                  </Button>
                ))}
              </nav>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

