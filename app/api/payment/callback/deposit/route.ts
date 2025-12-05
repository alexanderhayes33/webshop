import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { generateSignature } from "@/lib/payment";

const PAYMENT_SECRET_KEY = process.env.PAYMENT_SECRET_KEY || "";
const PAYMENT_PARTNER_ID = process.env.PAYMENT_PARTNER_ID || process.env.PAYMENT_API_KEY || "";

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
    if (!PAYMENT_SECRET_KEY) {
      console.error("PAYMENT_SECRET_KEY is not configured");
      return NextResponse.json(
        {
          code: 500,
          msg: "Server configuration error"
        },
        { status: 500 }
      );
    }

    // Get signature from headers
    const signature = request.headers.get("x-signature");
    const apiKey = request.headers.get("x-api-key");

    if (!signature || !apiKey) {
      console.error("Missing signature or api-key in callback");
      return NextResponse.json(
        {
          code: 400,
          msg: "Missing required headers"
        },
        { status: 400 }
      );
    }

    const body: DepositCallbackRequest = await request.json();

    console.log("Deposit Callback Received:", {
      refId: body.refId,
      transactionId: body.transactionId,
      status: body.status,
      amount: body.amount
    });

    // Verify signature
    const expectedSignature = await generateSignature(
      body as any,
      PAYMENT_SECRET_KEY,
      PAYMENT_PARTNER_ID
    );

    if (signature !== expectedSignature) {
      console.error("Invalid signature in callback");
      return NextResponse.json(
        {
          code: 400,
          msg: "Invalid signature"
        },
        { status: 400 }
      );
    }

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

