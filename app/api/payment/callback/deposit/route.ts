import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const PAYMENT_API_KEY = process.env.PAYMENT_API_KEY || "";
const PAYMENT_PARTNER_ID = process.env.PAYMENT_PARTNER_ID || PAYMENT_API_KEY;

interface DepositCallbackRequest {
  timestamp: string;
  successTime: string;
  refId: string;
  transactionId: string;
  amount: number;
  payAmount: number;
  fee: number;
  method: string;
  extendParams?: Record<string, any>;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get API key from headers
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey) {
      console.error("Missing x-api-key in callback");
      return NextResponse.json(
        {
          code: 400,
          msg: "Missing required headers"
        },
        { status: 400 }
      );
    }

    // Verify x-api-key matches our configured API key
    if (apiKey !== PAYMENT_PARTNER_ID && apiKey !== PAYMENT_API_KEY) {
      console.error("Invalid API key in callback:", apiKey);
      return NextResponse.json(
        {
          code: 401,
          msg: "Unauthorized"
        },
        { status: 401 }
      );
    }

    const body: DepositCallbackRequest = await request.json();

    console.log("Deposit Callback Received:", {
      refId: body.refId,
      transactionId: body.transactionId,
      status: body.status,
      amount: body.amount,
      payAmount: body.payAmount
    });

    // Process callback based on status
    if (body.status === "PAID") {
      // Find order by order_number (refId)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, status, total_amount")
        .eq("order_number", body.refId)
        .single();

      if (orderError || !order) {
        console.error("Order not found:", body.refId, orderError);
        return NextResponse.json(
          {
            code: 404,
            msg: "Order not found"
          },
          { status: 404 }
        );
      }

      // 2. Verify amount matches (prevent amount tampering)
      const amountDifference = Math.abs(order.total_amount - body.amount);
      if (amountDifference > 0.01) { // Allow small floating point differences
        console.error("Amount mismatch:", {
          orderAmount: order.total_amount,
          callbackAmount: body.amount,
          difference: amountDifference
        });
        return NextResponse.json(
          {
            code: 400,
            msg: "Amount mismatch"
          },
          { status: 400 }
        );
      }

      // 3. Verify order is still pending (prevent duplicate processing)
      if (order.status !== "pending") {
        console.warn("Order already processed:", {
          orderId: order.id,
          currentStatus: order.status
        });
        // Return success even if already processed (idempotent)
        return NextResponse.json(
          {
            code: 0,
            msg: "Success"
          },
          { status: 200 }
        );
      }

      // Update order status to confirmed if still pending
      if (order.status === "pending") {
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: "confirmed",
            updated_at: new Date().toISOString()
          })
          .eq("id", order.id);

        if (updateError) {
          console.error("Error updating order:", updateError);
          return NextResponse.json(
            {
              code: 500,
              msg: "Failed to update order"
            },
            { status: 500 }
          );
        }

        // Create status history entry
        await supabase.from("order_status_history").insert({
          order_id: order.id,
          status: "confirmed",
          notes: `ชำระเงินสำเร็จ - Transaction ID: ${body.transactionId}`,
          created_at: new Date().toISOString()
        });

        console.log("Order updated successfully:", order.id);
      }
    }

    return NextResponse.json(
      {
        code: 0,
        msg: "Success"
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error processing deposit callback:", error);
    return NextResponse.json(
      {
        code: 500,
        msg: "Internal server error"
      },
      { status: 500 }
    );
  }
}

