import { NextRequest, NextResponse } from "next/server";
import {
  DepositQRRequest,
  DepositQRResponse,
  generateSignature
} from "@/lib/payment";

const PAYMENT_API_URL = process.env.PAYMENT_API_URL || "https://example.com";
const PAYMENT_API_KEY = process.env.PAYMENT_API_KEY || "";
const PAYMENT_SECRET_KEY = process.env.PAYMENT_SECRET_KEY || "";
const PAYMENT_PARTNER_ID = process.env.PAYMENT_PARTNER_ID || PAYMENT_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!PAYMENT_API_KEY || !PAYMENT_SECRET_KEY) {
      return NextResponse.json(
        {
          code: 500,
          msg: "Payment API configuration is missing",
          cause: "Please configure PAYMENT_API_KEY and PAYMENT_SECRET_KEY"
        },
        { status: 500 }
      );
    }

    const body: DepositQRRequest = await request.json();

    // Log request for debugging
    console.log("Payment QR Request:", {
      refId: body.refId,
      amount: body.amount,
      userId: body.userId,
      accountName: body.accountName,
      accountNo: body.accountNo,
      bankCode: body.bankCode,
      timestamp: body.timestamp
    });

    // Validation checks
    if (!body.refId || !body.amount || !body.userId) {
      console.error("Validation failed: Missing required fields");
      return NextResponse.json(
        {
          code: 400,
          msg: "Missing required fields",
          cause: `Missing: ${!body.refId ? "refId " : ""}${!body.amount ? "amount " : ""}${!body.userId ? "userId" : ""}`
        },
        { status: 400 }
      );
    }

    if (!body.accountName || !body.accountNo || !body.bankCode) {
      console.error("Validation failed: Missing bank account information");
      return NextResponse.json(
        {
          code: 400,
          msg: "Missing bank account information",
          cause: `Missing: ${!body.accountName ? "accountName " : ""}${!body.accountNo ? "accountNo " : ""}${!body.bankCode ? "bankCode" : ""}`
        },
        { status: 400 }
      );
    }

    // Validate amount is positive number
    if (typeof body.amount !== "number" || body.amount <= 0) {
      console.error("Validation failed: Invalid amount");
      return NextResponse.json(
        {
          code: 400,
          msg: "Invalid amount",
          cause: "Amount must be a positive number"
        },
        { status: 400 }
      );
    }

    console.log("Validation passed, generating signature...");

    // Remove extendParams if it's empty or undefined
    const requestBody = { ...body };
    if (!requestBody.extendParams || Object.keys(requestBody.extendParams).length === 0) {
      delete requestBody.extendParams;
    }

    console.log("Request body for signature:", JSON.stringify(requestBody, null, 2));

    const signature = await generateSignature(requestBody, PAYMENT_SECRET_KEY, PAYMENT_PARTNER_ID);
    
    // Remove trailing slash from URL
    const apiUrl = PAYMENT_API_URL.replace(/\/$/, "");
    const endpoint = `${apiUrl}/payment/deposit/qrcode`;
    
    console.log("Calling payment API:", endpoint);
    console.log("Full Signature:", signature);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-api-key": PAYMENT_API_KEY,
        "x-signature": signature,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    console.log("Payment API Response Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Payment API Error:", errorText);
      
      // Try to parse as JSON
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { msg: errorText };
      }
      
      return NextResponse.json(
        {
          code: response.status,
          msg: errorData.msg || "Failed to create QR code",
          cause: errorData.cause || errorText || `HTTP ${response.status}`
        },
        { status: response.status }
      );
    }

    const data: DepositQRResponse = await response.json();

    if (data.code !== 0) {
      return NextResponse.json(
        {
          code: data.code,
          msg: data.msg,
          cause: data.cause
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Error creating deposit QR:", error);
    return NextResponse.json(
      {
        code: 9995,
        msg: "Unable to process your request at the moment. Please try again later.",
        cause: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

