import { createClient } from "@supabase/supabase-js";

export async function getLineConfig() {
  try {
    // ใช้ service role key สำหรับ server-side หรือ anon key สำหรับ client-side
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("line_config")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // Fallback to environment variables
      return {
        channelId: process.env.LINE_CHANNEL_ID || process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || "",
        channelSecret: process.env.LINE_CHANNEL_SECRET || "",
        callbackUrl: process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/line`
          : "http://localhost:3000/api/auth/line",
        isActive: true
      };
    }

    // ใช้ NEXT_PUBLIC_SITE_URL เป็นหลักเสมอ (ไม่ใช้ค่าจาก database สำหรับ callback_url)
    // เพราะ callback_url ต้องตรงกับ domain ที่ใช้งานจริง
    const callbackUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/line`
      : "http://localhost:3000/api/auth/line";

    return {
      channelId: data.channel_id || process.env.LINE_CHANNEL_ID || process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || "",
      channelSecret: data.channel_secret || process.env.LINE_CHANNEL_SECRET || "",
      callbackUrl: callbackUrl, // ใช้จาก env เสมอ
      isActive: data.is_active ?? true
    };
  } catch (error) {
    console.error("Get LINE config error:", error);
    // Fallback to environment variables
    return {
      channelId: process.env.LINE_CHANNEL_ID || process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || "",
      channelSecret: process.env.LINE_CHANNEL_SECRET || "",
      callbackUrl: process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/line`
        : "http://localhost:3000/api/auth/line",
      isActive: true
    };
  }
}

