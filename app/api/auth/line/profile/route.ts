import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "ไม่พบ access token" },
        { status: 400 }
      );
    }

    // ดึงข้อมูลผู้ใช้จาก LINE
    const profileResponse = await fetch("https://api.line.me/v2/profile", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      return NextResponse.json(
        { error: profileData.error_description || "ไม่สามารถดึงข้อมูลผู้ใช้ได้" },
        { status: profileResponse.status }
      );
    }

    // ดึง email (ถ้ามี)
    let email = null;
    try {
      const emailResponse = await fetch("https://api.line.me/v2/oauth2/v2.1/userinfo", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        email = emailData.email || null;
      }
    } catch (e) {
      // email ไม่จำเป็นต้องมี
    }

    return NextResponse.json({
      userId: profileData.userId,
      displayName: profileData.displayName,
      pictureUrl: profileData.pictureUrl || null,
      email: email
    });
  } catch (error: any) {
    console.error("LINE profile error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

