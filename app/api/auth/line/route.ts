import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  // ดึง base URL จาก NEXT_PUBLIC_SITE_URL หรือจาก request headers
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  
  if (!siteUrl) {
    // ถ้าไม่มี env variable ให้ใช้จาก request headers (สำหรับ ngrok)
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host") || request.headers.get("x-forwarded-host");
    if (host) {
      siteUrl = `${protocol}://${host}`;
    } else {
      siteUrl = request.nextUrl.origin;
    }
  }

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, siteUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=no_code", siteUrl)
    );
  }

  // ส่ง code ไปยัง callback page เพื่อแลก token
  return NextResponse.redirect(
    new URL(`/auth/line/callback?code=${code}&state=${state || ""}`, siteUrl)
  );
}

