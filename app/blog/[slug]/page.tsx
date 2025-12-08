"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  category: string;
  cover_url: string | null;
  content: string | null;
  created_at: string;
};

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("blog_posts")
        .select("id,title,slug,category,cover_url,content,created_at")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      setPost((data as BlogPost) || null);
      setLoading(false);
    }
    if (slug) load();
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: "บทความ", href: "/blog" }, { label: "ไม่พบข้อมูล" }]} />
        <div className="rounded-2xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">ไม่พบบทความนี้ หรือถูกปิดการแสดงผล</p>
          <Button className="mt-4" asChild>
            <Link href="/blog">กลับไปหน้าบทความ</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "บทความ", href: "/blog" },
          { label: post.title }
        ]}
      />
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge>{post.category}</Badge>
          <span>
            {new Date(post.created_at).toLocaleDateString("th-TH", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            })}
          </span>
        </div>
        <h1 className="text-2xl font-semibold leading-tight">{post.title}</h1>
      </div>
      {post.cover_url && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border bg-muted">
          <Image
            src={post.cover_url}
            alt={post.title}
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>
      )}
      {post.content ? (
        <article
          className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{
            __html: post.content.replace(/\n/g, "<br />")
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">ไม่มีเนื้อหา</p>
      )}
      <div className="pt-4">
        <Button variant="outline" onClick={() => router.back()}>
          กลับ
        </Button>
      </div>
    </div>
  );
}

