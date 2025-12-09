import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { userId, displayName, pictureUrl, email } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "ไม่พบ LINE user ID" },
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

    const userEmail = email || `${userId}@line.local`;
    const randomPassword = `line_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // ตรวจสอบว่ามี user อยู่แล้วหรือไม่
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === userEmail || u.user_metadata?.line_user_id === userId
    );

    let authUser;

    if (existingUser) {
      // อัปเดต user ที่มีอยู่ และอัปเดต password
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: randomPassword, // อัปเดต password
          user_metadata: {
            full_name: displayName,
            avatar_url: pictureUrl,
            line_user_id: userId,
            provider: "line"
          }
        }
      );

      if (updateError) throw updateError;
      authUser = updatedUser.user;
    } else {
      // สร้าง user ใหม่
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: displayName,
          avatar_url: pictureUrl,
          line_user_id: userId,
          provider: "line"
        }
      });

      if (createError) throw createError;
      authUser = newUser.user;
    }

    // รอสักครู่เพื่อให้ password ถูกอัปเดต
    await new Promise(resolve => setTimeout(resolve, 500));

    // สร้าง session โดยใช้ signInWithPassword ผ่าน Admin client
    // ใช้ password ที่สร้างไว้
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: userEmail,
      password: randomPassword
    });

    if (sessionError) {
      console.error("Session creation error:", sessionError);
      // ถ้าสร้าง session ไม่ได้ ให้ return user data และ password ไว้
      return NextResponse.json({
        success: true,
        user: authUser,
        email: userEmail,
        password: randomPassword, // ส่ง password ไปให้ client-side ใช้
        sessionToken: null,
        refreshToken: null
      });
    }

    return NextResponse.json({
      success: true,
      user: authUser,
      email: userEmail,
      password: randomPassword, // ส่ง password ไปให้ client-side ใช้
      sessionToken: sessionData.session?.access_token || null,
      refreshToken: sessionData.session?.refresh_token || null
    });
  } catch (error: any) {
    console.error("Create LINE user error:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

