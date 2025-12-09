"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/");
  }

  async function handleLineLogin() {
    setLoading(true);
    try {
      // ดึง config จาก API (เพิ่ม cache busting)
      const configResponse = await fetch(`/api/auth/line/config?t=${Date.now()}`, {
        cache: "no-store"
      });
      const config = configResponse.ok ? await configResponse.json() : null;
      
      console.log("LINE Login - Config from API:", config);
      
      const channelId = config?.channelId || process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
      const siteUrl = config?.callbackUrl?.replace("/api/auth/line", "") || process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      let redirectUri = config?.callbackUrl || `${siteUrl}/api/auth/line`;
      
      // ตรวจสอบและลบ trailing slash ถ้ามี
      redirectUri = redirectUri.replace(/\/$/, "");
      
      // Log เพื่อ debug
      console.log("LINE Login - Redirect URI:", redirectUri);
      console.log("LINE Login - Channel ID:", channelId);
      
      if (!channelId) {
        throw new Error("Channel ID ไม่ถูกตั้งค่า");
      }
      
      const state = Math.random().toString(36).substring(2, 15);
      
      // บันทึก state ใน sessionStorage
      sessionStorage.setItem("line_auth_state", state);

      const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile%20openid%20email`;

      console.log("LINE Login - Full Auth URL:", lineAuthUrl);
      window.location.href = lineAuthUrl;
    } catch (err: any) {
      setError(err.message || "ไม่สามารถเชื่อมต่อ LINE ได้");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pb-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          เข้าสู่ระบบบัญชีของคุณ
        </h1>
      </div>

      {loading || authLoading ? (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <>
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-xl border bg-card p-4 shadow-sm"
          >
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              เข้าสู่ระบบ
            </Button>
          </form>

          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  หรือ
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleLineLogin}
              disabled={loading}
            >
              <Image
                src="https://img5.pic.in.th/file/secure-sv1/line-2e7ddb480260dd6dc.png"
                alt="LINE"
                width={16}
                height={16}
                className="h-4 w-4"
                unoptimized
              />
              เข้าสู่ระบบด้วย LINE
            </Button>
          </div>
        </>
      )}
    </div>
  );
}


