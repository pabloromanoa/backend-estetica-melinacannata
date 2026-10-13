/** Datos para que el cliente transfiera la seña (va directo a la cuenta del prestador). */
export interface BankDetails {
  alias: string | null;
  cbu: string | null;
  holder: string | null;
  cuil: string | null;
  bankName: string | null;
}

export const EMPTY_BANK_DETAILS: BankDetails = {
  alias: null,
  cbu: null,
  holder: null,
  cuil: null,
  bankName: null,
};

/** Integrante del personal que atiende clientes (rol PROVIDER). */
export interface Provider {
  id: string;
  userId: string;
  displayName: string;
  specialty: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  bankDetails: BankDetails;
}
