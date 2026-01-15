export const BANK_CODES = [
  { code: "002", name: "ธนาคารกรุงเทพ (BBL)" },
  { code: "004", name: "ธนาคารกสิกรไทย (KBANK)" },
  { code: "006", name: "ธนาคารกรุงไทย (KTB)" },
  { code: "008", name: "JPMorgan Chase Bank" },
  { code: "009", name: "Oversea-Chinese Banking Corporation" },
  { code: "010", name: "The Bank of Tokyo-Mitsubishi UFJ" },
  { code: "011", name: "ธนาคารทีเอ็มบีธนชาต (TTB)" },
  { code: "014", name: "ธนาคารไทยพาณิชย์ (SCB)" },
  { code: "017", name: "Citibank" },
  { code: "018", name: "Sumitomo Mitsui Banking Corporation" },
  { code: "020", name: "Standard Chartered Bank" },
  { code: "022", name: "ธนาคารซีไอเอ็มบีไทย (CIMB)" },
  { code: "023", name: "RHB Bank" },
  { code: "024", name: "ธนาคารยูโอบี (UOB)" },
  { code: "025", name: "ธนาคารกรุงศรีอยุธยา (BAY)" },
  { code: "026", name: "Mega International Commercial Bank" },
  { code: "027", name: "Bank of America" },
  { code: "028", name: "Calyon" },
  { code: "029", name: "Indian Overseas Bank" },
  { code: "030", name: "ธนาคารออมสิน" },
  { code: "031", name: "Hong Kong & Shanghai Corporation" },
  { code: "032", name: "Deutsche Bank" },
  { code: "033", name: "ธนาคารอาคารสงเคราะห์ (GHB)" },
  { code: "034", name: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)" },
  { code: "035", name: "ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย (EXIM)" },
  { code: "039", name: "Mizuho Corporate Bank" },
  { code: "045", name: "BNP Paribas" },
  { code: "052", name: "Bank of China" },
  { code: "066", name: "ธนาคารอิสลามแห่งประเทศไทย" },
  { code: "067", name: "ธนาคารทิสโก้ (TISCO)" },
  { code: "069", name: "ธนาคารเกียรตินาคิน (KK)" },
  { code: "070", name: "Industrial and Commercial Bank of China" },
  { code: "071", name: "ธนาคารไทยเครดิต เพื่อรายย่อย (TCRB)" },
  { code: "073", name: "ธนาคารแลนด์ แอนด์ เฮาส์ (LHBANK)" },
  { code: "079", name: "ANZ Bank" },
  { code: "080", name: "Sumitomo Mitsui Trust Bank" },
  { code: "098", name: "ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย (SMEB)" }
] as const;

export function getBankName(code: string): string {
  const bank = BANK_CODES.find(b => b.code === code);
  return bank?.name || code;
}

