import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ensureAuthSchema } from "@/lib/auth/initDb";
import {
  initializePaystackTransaction,
  CONTRACT_REVIEW_PRICE_NGN,
  CONTRACT_REVIEW_PRICE_KOBO,
} from "@/lib/payments/paystack";

export async function POST(request: NextRequest) {
  try {
    await ensureAuthSchema();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reviewId, contractId } = body;

    let targetReview;

    if (reviewId) {
      targetReview = await prisma.review.findUnique({
        where: { id: reviewId },
        include: {
          contractVersion: {
            include: { contract: true },
          },
        },
      });
    } else if (contractId) {
      const contract = await prisma.contract.findUnique({
        where: { id: contractId },
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
            take: 1,
            include: {
              reviews: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      });

      targetReview = contract?.versions[0]?.reviews[0]
        ? {
            ...contract.versions[0].reviews[0],
            contractVersion: {
              ...contract.versions[0],
              contract,
            },
          }
        : null;
    }

    if (!targetReview) {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    const contract = targetReview.contractVersion.contract;
    if (contract.userId && contract.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden. You do not own this contract." }, { status: 403 });
    }

    // If review is already paid or marked as free trial, return early
    if (targetReview.isPaid || targetReview.isFreeTrial) {
      return NextResponse.json({
        alreadyPaid: true,
        message: "This review has already been unlocked.",
        reportUrl: `/review/${contract.id}`,
      });
    }

    // Check if any version in this deal has already been unlocked
    const existingUnlockedReview = await prisma.review.findFirst({
      where: {
        contractVersion: { contractId: contract.id },
        OR: [
          { isPaid: true },
          { isFreeTrial: true },
          { payments: { some: { status: "paid" } } },
        ],
      },
    });

    if (existingUnlockedReview) {
      await prisma.review.update({
        where: { id: targetReview.id },
        data: {
          isPaid: Boolean(existingUnlockedReview.isPaid),
          isFreeTrial: Boolean(existingUnlockedReview.isFreeTrial),
        },
      });

      return NextResponse.json({
        alreadyPaid: true,
        message: "This deal has already been unlocked. Versions are free of charge.",
        reportUrl: `/review/${contract.id}`,
      });
    }

    // Generate unique reference
    const reference = `pactiq_${targetReview.id.slice(-8)}_${Date.now()}`;

    // Get origin for callback URL
    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${origin}/review/${contract.id}?payment=callback&reference=${reference}`;

    const metadata = {
      userId: user.id,
      reviewId: targetReview.id,
      contractId: contract.id,
      contractFilename: contract.filename,
      customerEmail: user.email,
    };

    // Initialize with Paystack
    const paystackInit = await initializePaystackTransaction({
      email: user.email,
      amountInKobo: CONTRACT_REVIEW_PRICE_KOBO,
      reference,
      callbackUrl,
      metadata,
    });

    // Create pending payment record
    await prisma.payment.upsert({
      where: { transactionReference: reference },
      update: {
        status: "pending",
        amount: CONTRACT_REVIEW_PRICE_NGN,
        currency: "NGN",
      },
      create: {
        userId: user.id,
        reviewId: targetReview.id,
        amount: CONTRACT_REVIEW_PRICE_NGN,
        currency: "NGN",
        provider: "paystack",
        status: "pending",
        transactionReference: reference,
        metadata: JSON.stringify(metadata),
      },
    });

    return NextResponse.json({
      success: true,
      authorizationUrl: paystackInit.authorizationUrl,
      authorization_url: paystackInit.authorizationUrl,
      reference: paystackInit.reference,
      accessCode: paystackInit.accessCode,
      access_code: paystackInit.accessCode,
      amountNGN: CONTRACT_REVIEW_PRICE_NGN,
    });
  } catch (error: unknown) {
    console.error("Initialize payment API error:", error);
    const message = error instanceof Error ? error.message : "Failed to initialize payment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
