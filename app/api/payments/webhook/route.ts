import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ensureAuthSchema } from "@/lib/auth/initDb";
import { verifyPaystackWebhookSignature } from "@/lib/payments/paystack";
import { markReviewAsPaid } from "@/lib/payments/billing";

export async function POST(request: NextRequest) {
  try {
    await ensureAuthSchema();

    const signature = request.headers.get("x-paystack-signature");
    const rawBody = await request.text();

    // Verify HMAC signature
    const isValid = verifyPaystackWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("Paystack webhook rejected: Invalid signature header.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    console.log(`Paystack webhook received: event="${event}", reference="${data?.reference}"`);

    if (event === "charge.success" && data) {
      const reference = data.reference;
      const amountNGN = Math.round((data.amount || 0) / 100);
      const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
      const customerEmail = data.customer?.email;

      let reviewId = data.metadata?.reviewId;

      if (!reviewId && reference) {
        const existingPayment = await prisma.payment.findUnique({
          where: { transactionReference: reference },
        });
        reviewId = existingPayment?.reviewId;
      }

      if (reviewId) {
        await markReviewAsPaid(reviewId, {
          amount: amountNGN,
          reference,
          customerEmail,
          paidAt,
          metadata: data.metadata,
        });
        console.log(`Successfully processed Paystack webhook and unlocked review="${reviewId}"`);
      } else {
        console.warn(`Webhook charge.success received but no reviewId could be resolved for reference="${reference}"`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("Paystack webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
