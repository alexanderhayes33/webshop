import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "ไม่มีไฟล์ที่อัปโหลด" },
        { status: 400 }
      );
    }

    const apiKey = process.env.PIC_IN_TH_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key ไม่ถูกตั้งค่า" },
        { status: 500 }
      );
    }

    const uploadFormData = new FormData();
    uploadFormData.append("source", file);

    const response = await fetch("https://pic.in.th/api/1/upload", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey
      },
      body: uploadFormData
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `อัปโหลดล้มเหลว: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.status_code === 200 && data.image?.url) {
      return NextResponse.json({
        success: true,
        url: data.image.url
      });
    }

    return NextResponse.json(
      { error: "ไม่พบ URL รูปภาพใน response" },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการอัปโหลด" },
      { status: 500 }
    );
  }
}

