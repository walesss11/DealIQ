import { prisma } from "@/lib/db/prisma";
import { ensureAuthSchema } from "@/lib/auth/initDb";
import { isAdminUser } from "@/lib/auth/admin";
import { CONTRACT_REVIEW_PRICE_NGN } from "./paystack";

export interface UserBillingStatus {
  hasFreeReview: boolean;
  freeReviewUsed: boolean;
  totalContractsCount: number;
  paidReviewsCount: number;
  priceNGN: number;
}

export interface ReviewAccessResult {
  canAccess: boolean;
  isFreeTrial: boolean;
  isPaid: boolean;
  priceNGN: number;
  reason?: "FREE_TRIAL" | "PAID" | "ADMIN" | "PAYMENT_REQUIRED" | "NOT_FOUND" | "NOT_OWNER";
}

/**
 * Returns a user's current billing state and whether their 1 free review trial is available.
 */
export async function getUserBillingStatus(userId: string): Promise<UserBillingStatus> {
  await ensureAuthSchema();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      freeReviewUsed: true,
      role: true,
      _count: {
        select: {
          contracts: true,
          payments: {
            where: { status: "paid" },
          },
        },
      },
    },
  });

  if (!user) {
    return {
      hasFreeReview: true,
      freeReviewUsed: false,
      totalContractsCount: 0,
      paidReviewsCount: 0,
      priceNGN: CONTRACT_REVIEW_PRICE_NGN,
    };
  }

  // Count how many completed free trial reviews the user actually has
  const completedFreeReviews = await prisma.review.count({
    where: {
      status: "complete",
      isFreeTrial: true,
      contractVersion: {
        contract: { userId: user.id },
      },
    },
  });

  // A free review is considered consumed only if user has a completed free review
  const freeReviewUsed = Boolean(user.freeReviewUsed && completedFreeReviews > 0);
  const hasFreeReview = !freeReviewUsed;

  return {
    hasFreeReview,
    freeReviewUsed,
    totalContractsCount: user._count.contracts,
    paidReviewsCount: user._count.payments,
    priceNGN: CONTRACT_REVIEW_PRICE_NGN,
  };
}

/**
 * Checks if a user has access to a specific review (free trial, paid, or admin).
 */
export async function canAccessReview(userId: string, reviewId: string): Promise<ReviewAccessResult> {
  await ensureAuthSchema();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, freeReviewUsed: true },
  });

  if (!user) {
    return {
      canAccess: false,
      isFreeTrial: false,
      isPaid: false,
      priceNGN: CONTRACT_REVIEW_PRICE_NGN,
      reason: "NOT_FOUND",
    };
  }

  // 1. Admins have universal diagnostic access (with zero-knowledge text stripping)
  if (isAdminUser(user)) {
    return {
      canAccess: true,
      isFreeTrial: false,
      isPaid: true,
      priceNGN: CONTRACT_REVIEW_PRICE_NGN,
      reason: "ADMIN",
    };
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      contractVersion: {
        include: { contract: true },
      },
      payments: {
        where: { status: "paid" },
      },
    },
  });

  if (!review) {
    return {
      canAccess: false,
      isFreeTrial: false,
      isPaid: false,
      priceNGN: CONTRACT_REVIEW_PRICE_NGN,
      reason: "NOT_FOUND",
    };
  }

  // Ensure user owns this contract
  const contract = review.contractVersion.contract;
  if (contract.userId && contract.userId !== user.id) {
    return {
      canAccess: false,
      isFreeTrial: false,
      isPaid: false,
      priceNGN: CONTRACT_REVIEW_PRICE_NGN,
      reason: "NOT_OWNER",
    };
  }

  // 2. If review is already marked as free trial or paid
  if (review.isFreeTrial) {
    return {
      canAccess: true,
      isFreeTrial: true,
      isPaid: false,
      priceNGN: CONTRACT_REVIEW_PRICE_NGN,
      reason: "FREE_TRIAL",
    };
  }

  if (review.isPaid || review.payments.length > 0) {
    if (!review.isPaid) {
      await prisma.review.update({
        where: { id: review.id },
        data: { isPaid: true },
      });
    }
    return {
      canAccess: true,
      isFreeTrial: false,
      isPaid: true,
      priceNGN: CONTRACT_REVIEW_PRICE_NGN,
      reason: "PAID",
    };
  }

  // 3. DEAL / VERSION INHERITANCE:
  // Adding a new version to an existing deal does NOT cost extra.
  // If ANY version in this same contract was already paid or unlocked via free trial, unlock this version automatically.
  const existingUnlockedReview = await prisma.review.findFirst({
    where: {
      contractVersion: {
        contractId: contract.id,
      },
      OR: [
        { isPaid: true },
        { isFreeTrial: true },
        { payments: { some: { status: "paid" } } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  if (existingUnlockedReview) {
    const isFree = Boolean(existingUnlockedReview.isFreeTrial);
    const isPaid = Boolean(existingUnlockedReview.isPaid || !isFree);

    await prisma.review.update({
      where: { id: review.id },
      data: {
        isFreeTrial: isFree,
        isPaid: isPaid,
      },
    });

    return {
      canAccess: true,
      isFreeTrial: isFree,
      isPaid: isPaid,
      priceNGN: CONTRACT_REVIEW_PRICE_NGN,
      reason: isFree ? "FREE_TRIAL" : "PAID",
    };
  }

  // 4. Count completed free trial reviews for this user
  const completedFreeReviews = await prisma.review.count({
    where: {
      status: "complete",
      isFreeTrial: true,
      contractVersion: {
        contract: { userId: user.id },
      },
    },
  });

  // If user has not consumed their 1 free review yet, grant trial access to this review
  if (!user.freeReviewUsed || completedFreeReviews === 0) {
    await prisma.$transaction([
      prisma.review.update({
        where: { id: review.id },
        data: { isFreeTrial: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { freeReviewUsed: true },
      }),
    ]);

    return {
      canAccess: true,
      isFreeTrial: true,
      isPaid: false,
      priceNGN: CONTRACT_REVIEW_PRICE_NGN,
      reason: "FREE_TRIAL",
    };
  }

  // 5. Payment is required
  return {
    canAccess: false,
    isFreeTrial: false,
    isPaid: false,
    priceNGN: CONTRACT_REVIEW_PRICE_NGN,
    reason: "PAYMENT_REQUIRED",
  };
}

/**
 * Marks a review as paid after successful payment verification.
 */
export async function markReviewAsPaid(
  reviewId: string,
  paymentData: {
    amount: number;
    reference: string;
    customerEmail?: string;
    paidAt?: Date;
    metadata?: Record<string, unknown>;
  }
) {
  await ensureAuthSchema();

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      contractVersion: {
        include: { contract: true },
      },
    },
  });

  if (!review) {
    throw new Error(`Review with id "${reviewId}" was not found.`);
  }

  const userId = review.contractVersion.contract.userId;
  if (!userId) {
    throw new Error(`No user is associated with contract for review "${reviewId}".`);
  }

  // Record/update payment record & unlock review
  const existingPayment = await prisma.payment.findFirst({
    where: { transactionReference: paymentData.reference },
  });

  let updatedPayment;
  if (existingPayment) {
    updatedPayment = await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        status: "paid",
        paidAt: paymentData.paidAt || new Date(),
        metadata: paymentData.metadata ? JSON.stringify(paymentData.metadata) : undefined,
      },
    });
  } else {
    updatedPayment = await prisma.payment.create({
      data: {
        userId,
        reviewId,
        amount: paymentData.amount,
        currency: "NGN",
        provider: "paystack",
        status: "paid",
        transactionReference: paymentData.reference,
        paidAt: paymentData.paidAt || new Date(),
        metadata: paymentData.metadata ? JSON.stringify(paymentData.metadata) : undefined,
      },
    });
  }

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: { isPaid: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { freeReviewUsed: true },
  });

  return { payment: updatedPayment, review: updatedReview };
}
