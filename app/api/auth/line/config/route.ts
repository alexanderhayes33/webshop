import { NextResponse } from "next/server";
import { getLineConfig } from "@/lib/line-config";

export async function GET() {
  try {
    const config = await getLineConfig();
    
    // ใช้ NEXT_PUBLIC_SITE_URL เป็นหลักเสมอ
    const callbackUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/line`
      : config.callbackUrl;
    
    // Log เพื่อ debug
    console.log("LINE Config API - NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL);
    console.log("LINE Config API - Callback URL:", callbackUrl);
    
    // ส่งเฉพาะข้อมูลที่ client-side ต้องการ (ไม่ส่ง secret)
    return NextResponse.json({
      channelId: config.channelId,
      callbackUrl: callbackUrl, // ใช้จาก env เสมอ
      isActive: config.isActive
    });
  } catch (error: any) {
    console.error("Get LINE config error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

