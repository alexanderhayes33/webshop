"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterOptions = {
  minPrice: number;
  maxPrice: number;
  sortBy: "newest" | "price_low" | "price_high" | "name_asc" | "name_desc";
  stockFilter: "all" | "in_stock" | "out_of_stock";
};

type ProductFiltersProps = {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  priceRange: { min: number; max: number };
  onReset: () => void;
};

export function ProductFilters({
  filters,
  onFiltersChange,
  priceRange,
  onReset
}: ProductFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePriceChange = (values: number[]) => {
    onFiltersChange({
      ...filters,
      minPrice: values[0],
      maxPrice: values[1]
    });
  };

  const hasActiveFilters =
    filters.minPrice !== priceRange.min ||
    filters.maxPrice !== priceRange.max ||
    filters.sortBy !== "newest" ||
    filters.stockFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Mobile Filter Button */}
      <div className="flex items-center justify-between md:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full"
        >
          <Filter className="mr-2 h-4 w-4" />
          กรองสินค้า
          {hasActiveFilters && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
              ใช้งานอยู่
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      <div
        className={cn(
          "space-y-6 rounded-2xl border bg-card p-4 shadow-sm",
          !isOpen && "hidden md:block"
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">กรองสินค้า</h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 text-xs"
            >
              <X className="mr-1 h-3 w-3" />
              รีเซ็ต
            </Button>
          )}
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">เรียงตาม</Label>
          <Select
            value={filters.sortBy}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                sortBy: e.target.value as FilterOptions["sortBy"]
              })
            }
            className="h-9 text-xs"
          >
            <option value="newest">ใหม่ล่าสุด</option>
            <option value="price_low">ราคาต่ำ → สูง</option>
            <option value="price_high">ราคาสูง → ต่ำ</option>
            <option value="name_asc">ชื่อ ก-ฮ</option>
            <option value="name_desc">ชื่อ ฮ-ก</option>
          </Select>
        </div>

        {/* Price Range */}
        <div className="space-y-3">
          <Label className="text-xs font-medium">ช่วงราคา</Label>
          <div className="space-y-2">
            <Slider
              value={[filters.minPrice, filters.maxPrice]}
              onValueChange={handlePriceChange}
              min={priceRange.min}
              max={priceRange.max}
              step={100}
              className="w-full"
            />
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label htmlFor="min-price" className="text-[10px] text-muted-foreground">
                  ต่ำสุด
                </Label>
                <Input
                  id="min-price"
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      minPrice: Math.max(
                        priceRange.min,
                        Math.min(Number(e.target.value), filters.maxPrice)
                      )
                    })
                  }
                  className="h-8 text-xs"
                  min={priceRange.min}
                  max={filters.maxPrice}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="max-price" className="text-[10px] text-muted-foreground">
                  สูงสุด
                </Label>
                <Input
                  id="max-price"
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      maxPrice: Math.min(
                        priceRange.max,
                        Math.max(Number(e.target.value), filters.minPrice)
                      )
                    })
                  }
                  className="h-8 text-xs"
                  min={filters.minPrice}
                  max={priceRange.max}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              ฿{filters.minPrice.toLocaleString("th-TH")} - ฿
              {filters.maxPrice.toLocaleString("th-TH")}
            </p>
          </div>
        </div>

        {/* Stock Filter */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">สถานะสต็อก</Label>
          <Select
            value={filters.stockFilter}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                stockFilter: e.target.value as FilterOptions["stockFilter"]
              })
            }
            className="h-9 text-xs"
          >
            <option value="all">ทั้งหมด</option>
            <option value="in_stock">มีสต็อก</option>
            <option value="out_of_stock">หมดสต็อก</option>
          </Select>
        </div>
      </div>
    </div>
  );
}

