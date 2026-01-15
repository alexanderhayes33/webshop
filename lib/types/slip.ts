export interface SlipOKApiRequest {
  data: string;
  log?: boolean;
  amount?: number;
}

export interface SlipOKSlipData {
  success: boolean;
  message: string;
  transRef: string | null;
  sendingBank: string;
  receivingBank: string;
  transDate: string;
  transTime: string;
  sender: {
    displayName: string;
    name: string;
    account: {
      type: string;
      value: string;
    };
  };
  receiver: {
    displayName: string;
    name: string;
    account: {
      type: string;
      value: string;
    };
  };
  amount: number;
  ref1: string | null;
  ref2: string | null;
  ref3: string | null;
}

export interface SlipOKApiResponse {
  success: boolean;
  code?: number;
  message?: string;
  data: SlipOKSlipData | null;
}

export interface SlipVerificationSettings {
  id?: number;
  provider: string;
  slipok_branch_id: string | null;
  slipok_api_key: string | null;
  minimum_topup_amount: number;
  bank_accounts: Array<{
    account_name: string;
    account_no: string;
    bank_code: string;
  }>;
  is_active: boolean;
}

