"use client";

import { BlogList } from "@/components/blog/blog-list";

export default function BlogPage() {
  return (
    <div className="space-y-6">
      <BlogList
        category="blog"
        heading="บทความ"
        description="อัปเดตข่าวสารและสาระน่าสนใจ"
      />
    </div>
  );
}

