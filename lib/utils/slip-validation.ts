import { SlipOKSlipData } from "@/lib/types/slip";

export interface BankAccount {
  account_name: string;
  account_no: string;
  bank_code: string;
}

/**
 * ตรวจสอบบัญชีด้วย pattern matching
 * รองรับ 2 แบบ:
 * 1. Position-by-position matching (เมื่อความยาวเท่ากัน) - รองรับ pattern x/X สำหรับข้ามตำแหน่ง
 * 2. Substring matching (เมื่อความยาวไม่เท่ากัน)
 */
export function validateBankAccountPattern(
  userAccount: string,
  apiAccountPattern: string
): boolean {
  try {
    if (!userAccount || !apiAccountPattern) {
      return false;
    }

    // ลบอักขระที่ไม่ใช่ตัวเลขออกจากบัญชีที่ตั้งค่า
    const userNumbers = userAccount.replace(/[^0-9]/g, "");
    // ลบเฉพาะ dash (-) ออกจากบัญชีจาก API
    const apiPattern = apiAccountPattern.replace(/-/g, "");

    if (!userNumbers || !apiPattern) {
      return false;
    }

    // ถ้าความยาวไม่เท่ากัน ใช้ substring matching
    if (userNumbers.length !== apiPattern.length) {
      const apiNumbers = apiPattern.replace(/[^0-9]/g, "");
      if (apiNumbers && apiNumbers.length > 0) {
        return userNumbers.includes(apiNumbers);
      }
      return false;
    }

    // Position-by-position pattern matching
    for (let i = 0; i < apiPattern.length; i++) {
      const userChar = userNumbers[i];
      const patternChar = apiPattern[i];

      // ข้ามตำแหน่งที่เป็น x หรือ X
      if (patternChar === "x" || patternChar === "X") {
        continue;
      }

      // ตรวจสอบเฉพาะตำแหน่งที่เป็นตัวเลข
      if (/\d/.test(patternChar)) {
        if (userChar !== patternChar) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Error in pattern matching:", error);
    return false;
  }
}

export function validateBankAccount(
  slipData: SlipOKSlipData,
  bankAccounts: BankAccount[]
): { valid: boolean; error?: string } {
  if (!bankAccounts || bankAccounts.length === 0) {
    return { valid: true }; // ถ้าไม่มีการตั้งค่าบัญชี ให้ผ่าน
  }

  const receiverAccount = slipData.receiver?.account?.value;
  const receiverBank = slipData.receivingBank;

  if (!receiverAccount) {
    console.error("[validateBankAccount] Missing receiver account in slip data");
    return {
      valid: false,
      error: "ไม่พบข้อมูลบัญชีผู้รับในสลิป"
    };
  }

  console.log("[validateBankAccount] Validating:", {
    receiverAccount,
    receiverBank,
    bankAccounts: bankAccounts.map(acc => ({
      account_no: acc.account_no,
      bank_code: acc.bank_code
    }))
  });

  // เปรียบเทียบกับบัญชีที่ตั้งค่าไว้
  const matchedAccount = bankAccounts.find((account) => {
    // ใช้ pattern matching
    const accountMatch = validateBankAccountPattern(account.account_no, receiverAccount);
    
    console.log(`[validateBankAccount] Pattern match for ${account.account_no} vs ${receiverAccount}:`, accountMatch);

    // เปรียบเทียบรหัสธนาคาร (ถ้ามี)
    const bankMatch = !account.bank_code || 
      account.bank_code === receiverBank ||
      receiverBank?.includes(account.bank_code);

    console.log(`[validateBankAccount] Bank match for ${account.bank_code} vs ${receiverBank}:`, bankMatch);

    return accountMatch && bankMatch;
  });

  if (!matchedAccount) {
    console.error("[validateBankAccount] No matching account found");
    return {
      valid: false,
      error: `บัญชีผู้รับเงินไม่ตรงกับบัญชีที่ตั้งค่าไว้ (${receiverAccount} - ${receiverBank})`
    };
  }

  console.log("[validateBankAccount] Account matched:", matchedAccount);
  return { valid: true };
}

export function validateAmount(
  amount: number,
  minimumAmount: number
): { valid: boolean; error?: string } {
  if (amount < minimumAmount) {
    return {
      valid: false,
      error: `จำนวนเงินไม่ถึงขั้นต่ำ (ขั้นต่ำ: ${minimumAmount} บาท)`
    };
  }

  return { valid: true };
}

