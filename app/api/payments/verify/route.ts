import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ensureAuthSchema } from "@/lib/auth/initDb";
import { verifyPaystackTransaction } from "@/lib/payments/paystack";
import { markReviewAsPaid } from "@/lib/payments/billing";

export async function POST(request: NextRequest) {
  try {
    await ensureAuthSchema();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reference = body.reference;

    if (!reference || typeof reference !== "string") {
      return NextResponse.json({ error: "A valid transaction reference is required." }, { status: 400 });
    }

    // Verify with Paystack
    const verification = await verifyPaystackTransaction(reference);

    if (verification.status !== "success") {
      // Update payment record to failed
      await prisma.payment.updateMany({
        where: { transactionReference: reference },
        data: { status: verification.status || "failed" },
      });

      return NextResponse.json({
        success: false,
        status: verification.status,
        message: verification.gatewayResponse || "Payment was not successful.",
      }, { status: 400 });
    }

    // Retrieve the target reviewId from payment record or metadata
    let reviewId = verification.metadata?.reviewId as string | undefined;
    let contractId = verification.metadata?.contractId as string | undefined;

    if (!reviewId) {
      const existingPayment = await prisma.payment.findUnique({
        where: { transactionReference: reference },
      });
      reviewId = existingPayment?.reviewId;
    }

    if (!reviewId) {
      return NextResponse.json({
        error: "Could not link payment to a contract review.",
      }, { status: 404 });
    }

    // Mark review as paid and unlock
    const amountNGN = Math.round(verification.amount / 100);
    const { review } = await markReviewAsPaid(reviewId, {
      amount: amountNGN,
      reference,
      customerEmail: verification.customerEmail,
      paidAt: verification.paidAt || new Date(),
      metadata: verification.metadata,
    });

    if (!contractId) {
      const reviewWithContract = await prisma.review.findUnique({
        where: { id: reviewId },
        include: { contractVersion: true },
      });
      contractId = reviewWithContract?.contractVersion.contractId;
    }

    return NextResponse.json({
      success: true,
      isPaid: true,
      contractId,
      reviewId: review.id,
      amount: amountNGN,
      message: "Payment verified successfully. Review unlocked.",
      reportUrl: `/review/${contractId}`,
    });
  } catch (error: unknown) {
    console.error("Verify payment API error:", error);
    const message = error instanceof Error ? error.message : "Payment verification failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.json({ error: "Reference parameter is required." }, { status: 400 });
  }

  // Delegate to POST logic
  return POST(new NextRequest(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ reference }),
  }));
}
