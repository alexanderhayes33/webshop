"use client";

import { BlogList } from "@/components/blog/blog-list";

export default function HowToOrderPage() {
  return (
    <div className="space-y-6">
      <BlogList
        category="how-to-order"
        heading="วิธีสั่งซื้อ"
        description="ขั้นตอนสั่งซื้อและคำแนะนำการชำระเงิน"
      />
    </div>
  );
}

