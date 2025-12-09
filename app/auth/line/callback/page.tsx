"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";

function LineCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");

      if (!code) {
        setError("ไม่พบ authorization code");
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      try {
        // เรียก API เพื่อแลก code เป็น access token
        const tokenResponse = await fetch("/api/auth/line/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ code })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
          throw new Error(tokenData.error || "ไม่สามารถแลก token ได้");
        }

        // ดึงข้อมูลผู้ใช้จาก LINE
        const profileResponse = await fetch("/api/auth/line/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ accessToken: tokenData.access_token })
        });

        const profileData = await profileResponse.json();

        if (!profileResponse.ok || !profileData.userId) {
          throw new Error(profileData.error || "ไม่สามารถดึงข้อมูลผู้ใช้ได้");
        }

        // สร้างหรืออัปเดตบัญชีใน Supabase
        const email = profileData.email || `${profileData.userId}@line.local`;
        const displayName = profileData.displayName || "LINE User";
        const pictureUrl = profileData.pictureUrl || null;

        // เรียก API เพื่อสร้าง/อัปเดต user และรับ session
        const createUserResponse = await fetch("/api/auth/line/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId: profileData.userId,
            displayName,
            pictureUrl,
            email
          })
        });

        const createUserData = await createUserResponse.json();

        if (!createUserResponse.ok) {
          throw new Error(createUserData.error || "ไม่สามารถสร้างบัญชีได้");
        }

        // ถ้ามี session token ให้ใช้
        if (createUserData.sessionToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: createUserData.sessionToken,
            refresh_token: createUserData.refreshToken || ""
          });

          if (!sessionError) {
            router.push("/");
            return;
          }
        }

        // ถ้าไม่มี session token ให้ใช้ password ที่ได้จาก API
        if (!createUserData.sessionToken && createUserData.password) {
          // รอสักครู่เพื่อให้ password ถูกอัปเดตใน database
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // ล็อกอินด้วย password ที่สร้างไว้
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: createUserData.password
          });

          if (signInError) {
            console.error("Sign in error:", signInError);
            // ถ้าล็อกอินไม่ได้ อาจเป็นเพราะ password ยังไม่ถูกอัปเดต
            // ลองอีกครั้งหลังจากรออีกหน่อย
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email,
              password: createUserData.password
            });

            if (retryError) {
              throw new Error("ไม่สามารถล็อกอินได้ กรุณาลองใหม่");
            }

            if (!retryData.session) {
              throw new Error("ไม่สามารถสร้าง session ได้");
            }
          } else {
            // ตรวจสอบว่าได้ session แล้ว
            if (!signInData.session) {
              throw new Error("ไม่สามารถสร้าง session ได้");
            }
          }
        } else if (createUserData.sessionToken) {
          // ใช้ session token ที่ได้จาก API
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: createUserData.sessionToken,
            refresh_token: createUserData.refreshToken || ""
          });

          if (sessionError) {
            throw sessionError;
          }
        } else {
          throw new Error("ไม่สามารถสร้าง session ได้");
        }

        router.push("/");
      } catch (err: any) {
        console.error("LINE callback error:", err);
        setError(err.message || "เกิดข้อผิดพลาดในการล็อกอิน");
        setTimeout(() => router.push("/login"), 3000);
      }
    }

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 rounded-xl border bg-card p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">กำลังกลับไปหน้าเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 rounded-xl border bg-card p-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
        <p className="text-xs text-muted-foreground">กำลังล็อกอินด้วย LINE...</p>
      </div>
    </div>
  );
}

export default function LineCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="space-y-4 rounded-xl border bg-card p-6">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <p className="text-xs text-muted-foreground">กำลังล็อกอินด้วย LINE...</p>
          </div>
        </div>
      }
    >
      <LineCallbackContent />
    </Suspense>
  );
}

