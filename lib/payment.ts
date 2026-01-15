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
      const flattened = flattenObject(value, fullKey);
      // If empty object, don't include it in signature (as per documentation)
      // flattenObject will return empty object for {}, so we skip it
      if (Object.keys(flattened).length > 0) {
        result = { ...result, ...flattened };
      }
      // Empty objects are not included in signature
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

function buildKeyValueString(obj: Record<string, any>): string {
  // According to Compay API docs: filter out null, undefined, and empty values
  // Payment API may exclude null values from signature
  const filtered: Record<string, any> = {};
  for (const key in obj) {
    const value = obj[key];
    // Filter out undefined and null values
    if (value === undefined || value === null) {
      continue;
    }
    // Filter out empty strings
    if (value === "") {
      continue;
    }
    // Include all other values
    filtered[key] = value;
  }

  // Flatten all keys (including nested like extendParams.foo, extendParams.bar)
  // Empty objects are already filtered by flattenObject
  const flat = flattenObject(filtered);
  
  // Always use alphabetical order (as per API docs)
  const sortedKeys = Object.keys(flat).sort();

  const keyValuePairs = sortedKeys.map((key) => {
    const value = flat[key];
    // According to docs: use `${key}=${value}` directly
    // Null values are already filtered out above
    // Handle boolean - convert to string
    if (typeof value === "boolean") {
      return `${key}=${value}`;
    }
    // Handle number - convert to string
    if (typeof value === "number") {
      return `${key}=${value}`;
    }
    // Handle object/array - should not reach here if empty object (already filtered by flattenObject)
    if (typeof value === "object" && !Array.isArray(value)) {
      // This should only happen for non-empty objects that weren't flattened
      return `${key}=${JSON.stringify(value)}`;
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

