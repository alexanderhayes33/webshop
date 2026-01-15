import { SlipOKApiRequest, SlipOKApiResponse } from "@/lib/types/slip";

export async function verifySlipWithSlipOK(
  qrPayload: string,
  branchId: string,
  apiKey: string,
  amount?: number
): Promise<SlipOKApiResponse> {
  const url = `https://api.slipok.com/api/line/apikey/${branchId}`;

  const requestBody: SlipOKApiRequest = {
    data: qrPayload,
    log: true
  };

  if (amount !== undefined) {
    requestBody.amount = amount;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-authorization": apiKey
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();

  if (!response.ok) {
    // แม้ว่า response จะไม่ ok (เช่น 400) แต่บาง error codes (1013, 1014, 1012) อาจมี data กลับมา
    // ตามเอกสาร SlipOK: error code 1013, 1014, 1012 จะมี data object ใน response
    return {
      success: false,
      code: data.code || response.status,
      message: data.message || "เกิดข้อผิดพลาดในการตรวจสอบสลิป",
      data: data.data || null // เก็บ data จาก response แม้ว่าจะ error
    };
  }

  return data as SlipOKApiResponse;
}

