export interface DepositQRRequest {
  refId: string;
  amount: number;
  userId: string;
  accountName: string;
  accountNo: string;
  bankCode: string;
  timestamp: string;
  extendParams?: Record<string, any>;
}

export interface DepositQRResponse {
  data: {
    status: string;
    refId: string;
    transactionId: string;
    amount: number;
    method: string;
    qrcode: string;
    extendParams?: Record<string, any>;
    fee: number;
    transferAmount: number;
    successTime: string | null;
    timestamp: string;
  };
  code: number;
  msg: string;
  cause: string;
}

function flattenObject(obj: Record<string, any>, prefix = ""): Record<string, any> {
  let result: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result = { ...result, ...flattenObject(value, fullKey) };
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

function buildKeyValueString(obj: Record<string, any>): string {
  // Filter out undefined and null values
  const filtered: Record<string, any> = {};
  for (const key in obj) {
    if (obj[key] !== undefined && obj[key] !== null) {
      filtered[key] = obj[key];
    }
  }

  // Flatten all keys (including nested like extendParams.foo, extendParams.bar)
  const flat = flattenObject(filtered);
  const sortedKeys = Object.keys(flat).sort();

  const keyValuePairs = sortedKeys.map((key) => {
    const value = flat[key];
    // Handle boolean
    if (typeof value === "boolean") {
      return `${key}=${value ? "true" : "false"}`;
    }
    // Handle number - convert to string without scientific notation
    if (typeof value === "number") {
      return `${key}=${value}`;
    }
    return `${key}=${value}`;
  });

  return keyValuePairs.join("&");
}

export async function generateSignature(
  payload: Record<string, any>,
  secretKey: string,
  partnerId?: string
): Promise<string> {
  const keyValueString = buildKeyValueString(payload);
  const keyString = partnerId ? `${partnerId}:${keyValueString}` : keyValueString;

  // Log for debugging (only in server-side)
  if (typeof window === "undefined") {
    console.log("Key Value String:", keyValueString);
    console.log("Key String for Signature:", keyString);
  }

  if (typeof window === "undefined") {
    const crypto = await import("crypto");
    const signature = crypto.createHmac("sha256", secretKey).update(keyString).digest("hex");
    console.log("Generated Signature:", signature);
    return signature;
  } else {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(keyString);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

export function createDepositQRRequest(
  orderId: string,
  amount: number,
  userId: string,
  bankAccount: {
    accountName: string;
    accountNo: string;
    bankCode: string;
  },
  extendParams?: Record<string, any>
): DepositQRRequest {
  return {
    refId: orderId,
    amount,
    userId,
    accountName: bankAccount.accountName,
    accountNo: bankAccount.accountNo,
    bankCode: bankAccount.bankCode,
    timestamp: new Date().toISOString(),
    extendParams
  };
}

