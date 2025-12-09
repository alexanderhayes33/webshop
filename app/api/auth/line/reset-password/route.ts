import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "ไม่พบ email" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: "Service role key ไม่ถูกตั้งค่า" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // หา user จาก email
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const user = usersData?.users?.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: "ไม่พบ user" },
        { status: 404 }
      );
    }

    // สร้าง password ใหม่และล็อกอิน
    const newPassword = `line_reset_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    // อัปเดต password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "ไม่สามารถอัปเดต password ได้" },
        { status: 500 }
      );
    }

    // ล็อกอินด้วย password ใหม่
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email!,
      password: newPassword
    });

    if (sessionError) {
      return NextResponse.json(
        { error: sessionError.message || "ไม่สามารถสร้าง session ได้" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionToken: sessionData.session?.access_token || null,
      refreshToken: sessionData.session?.refresh_token || null,
      password: newPassword // ส่ง password ไปให้ client-side ใช้
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

