import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySlipWithSlipOK } from "@/lib/utils/slip-api";
import { validateBankAccount, validateAmount } from "@/lib/utils/slip-validation";
import { SlipOKApiResponse } from "@/lib/types/slip";

// ใช้ service role key สำหรับการเขียนข้อมูล
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบ authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // ตรวจสอบ user ด้วย service role client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { qrPayload, orderId } = body;

    if (!qrPayload || typeof qrPayload !== "string" || qrPayload.trim() === "") {
      console.error("[verify-slip] Missing qrPayload");
      return NextResponse.json(
        { success: false, error: "กรุณากรอก QR Payload" },
        { status: 400 }
      );
    }

    // ดึง SlipOK settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("slip_verification_settings")
      .select("*")
      .eq("provider", "slipok")
      .eq("is_active", true)
      .maybeSingle();

    if (settingsError || !settings) {
      console.error("[verify-slip] SlipOK settings not found:", settingsError);
      return NextResponse.json(
        { success: false, error: "ยังไม่ได้ตั้งค่า SlipOK API" },
        { status: 400 }
      );
    }

    if (!settings.slipok_branch_id || !settings.slipok_api_key) {
      console.error("[verify-slip] SlipOK credentials missing");
      return NextResponse.json(
        { success: false, error: "กรุณาตั้งค่า SlipOK Branch ID และ API Key" },
        { status: 400 }
      );
    }

    // ดึง order เพื่อตรวจสอบยอดเงิน
    let orderAmount: number | undefined;
    if (orderId) {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("total_amount, status")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (order) {
        orderAmount = Number(order.total_amount);
      }
    }

    // เรียก SlipOK API
    let slipResponse: SlipOKApiResponse;
    try {
      slipResponse = await verifySlipWithSlipOK(
        qrPayload.trim(),
        settings.slipok_branch_id,
        settings.slipok_api_key,
        orderAmount
      );
    } catch (error: any) {
      console.error("SlipOK API Error:", error);
      return NextResponse.json(
        { success: false, error: "เกิดข้อผิดพลาดในการเชื่อมต่อ SlipOK API" },
        { status: 500 }
      );
    }

    // ตรวจสอบ error codes
    let shouldContinue = false; // flag สำหรับ error code 1013, 1014 ที่ validation ผ่านแล้ว

    if (!slipResponse.success) {
      const errorCode = slipResponse.code;

      // Error codes ที่ต้อง reject ทันที
      if (errorCode === 1010 || errorCode === 1012) {
        const errorMessage = 
          errorCode === 1010 ? "ธนาคารล่าช้า กรุณาลองใหม่อีกครั้ง" :
          errorCode === 1012 ? "สลิปนี้เคยใช้แล้ว" :
          slipResponse.message || "เกิดข้อผิดพลาดในการตรวจสอบสลิป";

        console.error(`[verify-slip] SlipOK error code ${errorCode}:`, errorMessage);

        // บันทึกประวัติ
        await supabaseAdmin.from("slip_history").insert({
          user_id: user.id,
          order_id: orderId || null,
          transaction_id: null,
          amount: orderAmount || 0,
          qr_payload: qrPayload.trim(),
          status: "failed",
          error_message: errorMessage,
          slipok_response: slipResponse
        });

        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: 400 }
        );
      }

      // Error codes 1013, 1014 อาจมี data กลับมา ตรวจสอบต่อ
      if (errorCode === 1013 || errorCode === 1014) {
        console.log(`[verify-slip] Error code ${errorCode} received:`, {
          hasData: !!slipResponse.data,
          data: slipResponse.data,
          message: slipResponse.message
        });

        // สำหรับ error code 1014 (บัญชีไม่ตรง) ให้เช็คด้วย validateBankAccount เสมอ
        // แม้ว่า SlipOK API จะบอกว่าบัญชีไม่ตรง แต่เราต้องเช็คกับบัญชีที่ตั้งค่าไว้เอง
        if (errorCode === 1014) {
          const bankAccounts = (settings.bank_accounts as any) || [];
          
          // ถ้าไม่มี data กลับมา ไม่สามารถเช็คได้
          if (!slipResponse.data) {
            console.warn(`[verify-slip] Error 1014 but no data returned from SlipOK API - cannot validate`);
            const errorMessage = "บัญชีไม่ตรง - ไม่สามารถตรวจสอบข้อมูลบัญชีได้";
            
            await supabaseAdmin.from("slip_history").insert({
              user_id: user.id,
              order_id: orderId || null,
              transaction_id: null,
              amount: orderAmount || 0,
              qr_payload: qrPayload.trim(),
              status: "failed",
              error_message: errorMessage,
              slipok_response: slipResponse
            });

            return NextResponse.json(
              { success: false, error: errorMessage },
              { status: 400 }
            );
          }

          // ถ้ามี data กลับมา ให้เช็คด้วย validateBankAccount (ไม่สนใจว่า SlipOK บอกว่าอะไร)
          const receiverAccount = slipResponse.data.receiver?.account?.value;
          const receiverBank = slipResponse.data.receivingBank;

          console.log(`[verify-slip] Error 1014 - Validating against configured accounts:`, {
            receiverAccount,
            receiverBank,
            configuredAccounts: bankAccounts.map((acc: any) => ({
              account_no: acc.account_no,
              bank_code: acc.bank_code
            }))
          });

          if (!bankAccounts || bankAccounts.length === 0) {
            console.warn(`[verify-slip] No bank accounts configured, rejecting error 1014`);
            await supabaseAdmin.from("slip_history").insert({
              user_id: user.id,
              order_id: orderId || null,
              transaction_id: slipResponse.data.transRef || null,
              amount: slipResponse.data.amount || orderAmount || 0,
              qr_payload: qrPayload.trim(),
              status: "failed",
              error_message: "บัญชีไม่ตรง - ไม่มีการตั้งค่าบัญชี",
              slipok_response: slipResponse
            });

            return NextResponse.json(
              { success: false, error: "บัญชีไม่ตรง" },
              { status: 400 }
            );
          }

          // เช็คด้วย validateBankAccount (เปรียบเทียบกับบัญชีที่ตั้งค่าไว้)
          const bankValidation = validateBankAccount(slipResponse.data, bankAccounts);

          console.log(`[verify-slip] Bank account validation result:`, {
            valid: bankValidation.valid,
            error: bankValidation.error,
            receiverAccount,
            receiverBank
          });

          if (!bankValidation.valid) {
            // ถ้า validateBankAccount ไม่ผ่าน ให้ reject
            console.error(`[verify-slip] Bank account validation failed:`, bankValidation.error);
            await supabaseAdmin.from("slip_history").insert({
              user_id: user.id,
              order_id: orderId || null,
              transaction_id: slipResponse.data.transRef || null,
              amount: slipResponse.data.amount || orderAmount || 0,
              qr_payload: qrPayload.trim(),
              status: "failed",
              error_message: bankValidation.error || "บัญชีไม่ตรง",
              slipok_response: slipResponse
            });

            return NextResponse.json(
              { success: false, error: bankValidation.error || "บัญชีไม่ตรง" },
              { status: 400 }
            );
          }

          // ถ้า validateBankAccount ผ่าน ให้ดำเนินการต่อ (ข้าม error code 1014 จาก SlipOK)
          console.log(`[verify-slip] Bank account validation PASSED - ignoring SlipOK error 1014, continuing...`);
          shouldContinue = true;
        }

        // สำหรับ error code 1013 (ยอดเงินไม่ตรง) ถ้ามี data ให้ตรวจสอบยอดเงินอีกครั้ง
        if (errorCode === 1013 && slipResponse.data) {
          const slipData = slipResponse.data;
          const amountValidation = validateAmount(
            slipData.amount,
            Number(settings.minimum_topup_amount || 49)
          );

          if (!amountValidation.valid) {
            console.error(`[verify-slip] Amount validation failed after error 1013:`, amountValidation.error);
            await supabaseAdmin.from("slip_history").insert({
              user_id: user.id,
              order_id: orderId || null,
              transaction_id: slipData.transRef || null,
              amount: slipData.amount,
              qr_payload: qrPayload.trim(),
              status: "failed",
              error_message: amountValidation.error,
              slipok_response: slipResponse
            });

            return NextResponse.json(
              { success: false, error: amountValidation.error },
              { status: 400 }
            );
          }

          // ถ้ายอดเงินผ่าน ให้ดำเนินการต่อ (ข้าม error code 1013)
          console.log(`[verify-slip] Amount validation passed after error 1013, continuing...`);
          shouldContinue = true;
        }

        // ถ้า validation ไม่ผ่านทั้ง 2 แบบ ให้ reject
        if (!shouldContinue) {
          const errorMessage = 
            errorCode === 1013 ? "ยอดเงินไม่ตรง" :
            errorCode === 1014 ? "บัญชีไม่ตรง" :
            slipResponse.message || "เกิดข้อผิดพลาดในการตรวจสอบสลิป";

          console.error(`[verify-slip] SlipOK error code ${errorCode} validation failed:`, errorMessage);
          await supabaseAdmin.from("slip_history").insert({
            user_id: user.id,
            order_id: orderId || null,
            transaction_id: slipResponse.data?.transRef || null,
            amount: slipResponse.data?.amount || orderAmount || 0,
            qr_payload: qrPayload.trim(),
            status: "failed",
            error_message: errorMessage,
            slipok_response: slipResponse
          });

          return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 400 }
          );
        }
      } else {
        // Error อื่นๆ
        console.error(`[verify-slip] SlipOK error code ${errorCode}:`, slipResponse.message);
        await supabaseAdmin.from("slip_history").insert({
          user_id: user.id,
          order_id: orderId || null,
          transaction_id: null,
          amount: orderAmount || 0,
          qr_payload: qrPayload.trim(),
          status: "failed",
          error_message: slipResponse.message || "เกิดข้อผิดพลาด",
          slipok_response: slipResponse
        });

        return NextResponse.json(
          { success: false, error: slipResponse.message || "เกิดข้อผิดพลาดในการตรวจสอบสลิป" },
          { status: 400 }
        );
      }
    }

    // ถ้า error code 1013 หรือ 1014 แต่ validation ผ่านแล้ว ให้ใช้ data จาก slipResponse
    // ถ้าไม่ใช่ ให้เช็คตามปกติ
    let slipData: any = null;

    if (shouldContinue && slipResponse.data) {
      // ใช้ data จาก error code 1013/1014 ที่ validation ผ่านแล้ว
      slipData = slipResponse.data;
      console.log("[verify-slip] Using slip data from error code 1013/1014 after validation passed");
    } else if (slipResponse.success && slipResponse.data && slipResponse.data.success) {
      // ใช้ data จาก response ที่ success
      slipData = slipResponse.data;
    } else if (!shouldContinue) {
      // ไม่มี data หรือ data ไม่ valid (เฉพาะกรณีที่ไม่ใช่ shouldContinue)
      console.error("[verify-slip] SlipOK response missing data or data.success is false:", slipResponse);
      await supabaseAdmin.from("slip_history").insert({
        user_id: user.id,
        order_id: orderId || null,
        transaction_id: slipResponse.data?.transRef || null,
        amount: slipResponse.data?.amount || orderAmount || 0,
        qr_payload: qrPayload.trim(),
        status: "failed",
        error_message: "สลิปไม่ถูกต้อง",
        slipok_response: slipResponse
      });

      return NextResponse.json(
        { success: false, error: "สลิปไม่ถูกต้องหรือไม่สามารถอ่านได้" },
        { status: 400 }
      );
    }

    if (!slipData) {
      console.error("[verify-slip] No valid slip data found");
      return NextResponse.json(
        { success: false, error: "สลิปไม่ถูกต้องหรือไม่สามารถอ่านได้" },
        { status: 400 }
      );
    }

    // ตรวจสอบยอดเงิน
    const amountValidation = validateAmount(
      slipData.amount,
      Number(settings.minimum_topup_amount || 49)
    );

    if (!amountValidation.valid) {
      console.error("[verify-slip] Amount validation failed:", amountValidation.error);
      await supabaseAdmin.from("slip_history").insert({
        user_id: user.id,
        order_id: orderId || null,
        transaction_id: slipData.transRef || null,
        amount: slipData.amount,
        qr_payload: qrPayload.trim(),
        status: "failed",
        error_message: amountValidation.error,
        slipok_response: slipResponse
      });

      return NextResponse.json(
        { success: false, error: amountValidation.error },
        { status: 400 }
      );
    }

    // ตรวจสอบบัญชีผู้รับ
    const bankAccounts = (settings.bank_transfer_accounts as any) || [];
    const bankValidation = validateBankAccount(slipData, bankAccounts);

    if (!bankValidation.valid) {
      console.error("[verify-slip] Bank account validation failed:", bankValidation.error);
      await supabaseAdmin.from("slip_history").insert({
        user_id: user.id,
        order_id: orderId || null,
        transaction_id: slipData.transRef || null,
        amount: slipData.amount,
        qr_payload: qrPayload.trim(),
        status: "failed",
        error_message: bankValidation.error,
        slipok_response: slipResponse
      });

      return NextResponse.json(
        { success: false, error: bankValidation.error },
        { status: 400 }
      );
    }

    // ตรวจสอบสลิปซ้ำ
    const { data: existingSlip } = await supabaseAdmin
      .from("slip_history")
      .select("id")
      .or(`transaction_id.eq.${slipData.transRef || ""},qr_payload.eq.${qrPayload.trim()}`)
      .eq("status", "success")
      .maybeSingle();

    if (existingSlip) {
      console.error("[verify-slip] Duplicate slip detected:", existingSlip);
      await supabaseAdmin.from("slip_history").insert({
        user_id: user.id,
        order_id: orderId || null,
        transaction_id: slipData.transRef || null,
        amount: slipData.amount,
        qr_payload: qrPayload.trim(),
        status: "failed",
        error_message: "สลิปนี้เคยใช้แล้ว",
        slipok_response: slipResponse
      });

      return NextResponse.json(
        { success: false, error: "สลิปนี้เคยใช้แล้ว" },
        { status: 400 }
      );
    }

    // ตรวจสอบยอดเงินกับ order (ถ้ามี)
    if (orderId && orderAmount) {
      const amountDiff = Math.abs(slipData.amount - orderAmount);
      if (amountDiff > 0.01) {
        console.error(`[verify-slip] Amount mismatch: slip=${slipData.amount}, order=${orderAmount}`);
        await supabaseAdmin.from("slip_history").insert({
          user_id: user.id,
          order_id: orderId,
          transaction_id: slipData.transRef || null,
          amount: slipData.amount,
          qr_payload: qrPayload.trim(),
          status: "failed",
          error_message: `ยอดเงินไม่ตรงกับคำสั่งซื้อ (สลิป: ${slipData.amount}, คำสั่งซื้อ: ${orderAmount})`,
          slipok_response: slipResponse
        });

        return NextResponse.json(
          { success: false, error: `ยอดเงินไม่ตรงกับคำสั่งซื้อ (สลิป: ${slipData.amount}, คำสั่งซื้อ: ${orderAmount})` },
          { status: 400 }
        );
      }
    }

    // อัพเดท order status (ถ้ามี)
    if (orderId) {
      const { error: orderError } = await supabaseAdmin
        .from("orders")
        .update({ status: "confirmed" })
        .eq("id", orderId)
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (!orderError) {
        // บันทึก status history
        await supabaseAdmin.from("order_status_history").insert({
          order_id: orderId,
          status: "confirmed",
          notes: "ชำระเงินผ่าน SlipOK"
        });
      }
    }

    // บันทึกประวัติสำเร็จ
    const { data: slipHistory } = await supabaseAdmin
      .from("slip_history")
      .insert({
        user_id: user.id,
        order_id: orderId || null,
        transaction_id: slipData.transRef || null,
        amount: slipData.amount,
        qr_payload: qrPayload.trim(),
        status: "success",
        error_message: null,
        slipok_response: slipResponse
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      data: {
        message: orderId 
          ? "ชำระเงินสำเร็จ! คำสั่งซื้อได้รับการยืนยันแล้ว"
          : `ตรวจสอบสลิปสำเร็จ! จำนวน ${slipData.amount.toFixed(2)} บาท`,
        transactionAmount: slipData.amount,
        minimumAmount: Number(settings.minimum_topup_amount || 49),
        slipData: {
          transRef: slipData.transRef,
          sendingBank: slipData.sendingBank,
          receivingBank: slipData.receivingBank,
          transDate: slipData.transDate,
          transTime: slipData.transTime
        }
      }
    });
  } catch (error: any) {
    console.error("Verify slip error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "เกิดข้อผิดพลาดในการตรวจสอบสลิป" },
      { status: 500 }
    );
  }
}

