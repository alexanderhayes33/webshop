"use client";

import { BlogList } from "@/components/blog/blog-list";

export default function PromotionsPage() {
  return (
    <div className="space-y-6">
      <BlogList
        category="promotion"
        heading="โปรโมชั่น"
        description="อัปเดตโปรล่าสุดของร้าน"
      />
    </div>
  );
}

