import { NextResponse } from "next/server";

export async function GET() {
  // อ่าน NEXT_PUBLIC_SITE_URL จาก environment variable
  // ต้อง restart server หลังเปลี่ยน env variable
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  
  return NextResponse.json({ 
    siteUrl,
    // เพิ่ม timestamp เพื่อป้องกัน cache
    timestamp: Date.now()
  });
}

