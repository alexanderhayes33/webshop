import { NextRequest, NextResponse } from "next/server";
import { getLineConfig } from "@/lib/line-config";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "ไม่พบ authorization code" },
        { status: 400 }
      );
    }

    const config = await getLineConfig();
    const channelId = config.channelId;
    const channelSecret = config.channelSecret;
    let redirectUri = config.callbackUrl;

    // ตรวจสอบและลบ trailing slash ถ้ามี
    redirectUri = redirectUri.replace(/\/$/, "");

    // Log เพื่อ debug
    console.log("LINE Token - Redirect URI:", redirectUri);
    console.log("LINE Token - Channel ID:", channelId);

    if (!channelId || !channelSecret) {
      return NextResponse.json(
        { error: "LINE credentials ไม่ถูกตั้งค่า" },
        { status: 500 }
      );
    }

    // แลก code เป็น access token
    const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: channelId,
        client_secret: channelSecret
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: tokenData.error_description || "ไม่สามารถแลก token ได้" },
        { status: tokenResponse.status }
      );
    }

    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in
    });
  } catch (error: any) {
    console.error("LINE token error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

