"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  category: string;
  cover_url: string | null;
  content: string | null;
  display_order: number | null;
  created_at: string;
};

export function BlogList({
  category,
  heading,
  description
}: {
  category: string;
  heading: string;
  description?: string;
}) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id,title,slug,category,cover_url,content,display_order,created_at")
        .eq("is_active", true)
        .eq("category", category)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (!error && data) {
        setPosts(data as BlogPost[]);
      }
      setLoading(false);
    }
    load();
  }, [category]);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border bg-card shadow-sm"
            >
              <Skeleton className="h-40 w-full" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          ยังไม่มีเนื้อหาในหมวดนี้
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="relative h-40 w-full bg-muted">
                {post.cover_url ? (
                  <Image
                    src={post.cover_url}
                    alt={post.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 320px, 50vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    ไม่มีรูปปก
                  </div>
                )}
                <Badge className="absolute left-3 top-3 text-[10px] uppercase">
                  {post.category}
                </Badge>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="text-sm font-semibold leading-tight line-clamp-2">
                  {post.title}
                </h3>
                {post.content && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {post.content}
                  </p>
                )}
                <div className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary">
                  อ่านต่อ
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

