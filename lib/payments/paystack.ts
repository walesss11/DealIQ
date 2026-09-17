import crypto from "crypto";

export const CONTRACT_REVIEW_PRICE_NGN = 5000;
export const CONTRACT_REVIEW_PRICE_KOBO = CONTRACT_REVIEW_PRICE_NGN * 100; // 500,000 kobo

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export interface InitializeTransactionInput {
  email: string;
  amountInKobo?: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeTransactionResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface VerifyTransactionResponse {
  status: "success" | "failed" | "abandoned" | "reversed" | "pending";
  reference: string;
  amount: number; // in kobo
  currency: string;
  paidAt?: Date;
  channel?: string;
  customerEmail: string;
  gatewayResponse?: string;
  metadata?: Record<string, unknown>;
}

export function getPaystackSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured in environment variables.");
  }
  return key.trim();
}

export function getPaystackPublicKey(): string {
  const key = process.env.PAYSTACK_PUBLIC_KEY || "";
  return key.trim();
}

export function isPaystackTestMode(): boolean {
  try {
    return getPaystackSecretKey().startsWith("sk_test_");
  } catch {
    return true;
  }
}

/**
 * Initializes a transaction on Paystack
 */
export async function initializePaystackTransaction(
  input: InitializeTransactionInput
): Promise<InitializeTransactionResponse> {
  const secretKey = getPaystackSecretKey();
  const amount = input.amountInKobo || CONTRACT_REVIEW_PRICE_KOBO;

  const payload: Record<string, unknown> = {
    email: input.email,
    amount,
    currency: "NGN",
    reference: input.reference,
    metadata: {
      ...input.metadata,
      custom_fields: [
        {
          display_name: "Service",
          variable_name: "service",
          value: "PactIQ Contract Intelligence Review",
        },
      ],
    },
  };

  if (input.callbackUrl) {
    payload.callback_url = input.callbackUrl;
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.status || !data.data) {
    throw new Error(data.message || "Failed to initialize Paystack transaction.");
  }

  return {
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
    reference: data.data.reference,
  };
}

/**
 * Verifies a transaction on Paystack by reference
 */
export async function verifyPaystackTransaction(
  reference: string
): Promise<VerifyTransactionResponse> {
  const secretKey = getPaystackSecretKey();

  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();

  if (!response.ok || !data.status || !data.data) {
    throw new Error(data.message || `Verification failed for transaction reference: ${reference}`);
  }

  const txData = data.data;

  return {
    status: txData.status as "success" | "failed" | "abandoned" | "reversed" | "pending",
    reference: txData.reference,
    amount: txData.amount,
    currency: txData.currency || "NGN",
    paidAt: txData.paid_at ? new Date(txData.paid_at) : undefined,
    channel: txData.channel,
    customerEmail: txData.customer?.email || "",
    gatewayResponse: txData.gateway_response,
    metadata: txData.metadata,
  };
}

/**
 * Verifies the HMAC-SHA512 signature of a Paystack Webhook payload
 */
export function verifyPaystackWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secretOverride?: string
): boolean {
  if (!signatureHeader) return false;

  const webhookSecret = secretOverride || process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
  if (!webhookSecret) return false;

  try {
    const hash = crypto
      .createHmac("sha512", webhookSecret.trim())
      .update(rawBody)
      .digest("hex");

    return hash === signatureHeader;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return false;
  }
}
