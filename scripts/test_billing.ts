import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { ensureAuthSchema } from "../lib/auth/initDb";
import { getUserBillingStatus, canAccessReview, markReviewAsPaid } from "../lib/payments/billing";
import { verifyPaystackWebhookSignature } from "../lib/payments/paystack";
import crypto from "crypto";

async function runTest() {
  console.log("=== Testing Paystack Billing & Trial Flow in PactIQ ===");
  await ensureAuthSchema();

  const testEmail = `paystack_test_${Date.now()}@example.com`;
  
  // 1. Create a clean test user
  console.log(`\n1. Creating test user: ${testEmail}...`);
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      name: "Paystack Tester",
      freeReviewUsed: false,
      onboardingCompleted: true,
      userRole: "creator",
    },
  });
  console.log(`✓ User created with ID: ${user.id}`);

  try {
    // 2. Check initial billing status
    console.log("\n2. Checking initial billing status for new user...");
    const initialBilling = await getUserBillingStatus(user.id);
    console.log("Billing Status:", initialBilling);
    if (!initialBilling.hasFreeReview || initialBilling.freeReviewUsed) {
      throw new Error("FAIL: New user should have 1 free review trial available.");
    }
    console.log("✓ Correct: New user has 1 free trial review available.");

    // 3. Create Contract 1 and Review 1 (First Contract)
    console.log("\n3. Creating Contract 1 & Review 1...");
    const contract1 = await prisma.contract.create({
      data: {
        userId: user.id,
        filename: "Test_Brand_Agreement_1.pdf",
        contractType: "Brand Sponsorship",
        versions: {
          create: {
            versionNumber: 1,
            filename: "Test_Brand_Agreement_1.pdf",
            fileReference: "test_doc_ref_1",
            reviews: {
              create: {
                status: "complete",
                userRole: "creator",
              },
            },
          },
        },
      },
      include: {
        versions: {
          include: { reviews: true },
        },
      },
    });

    const review1 = contract1.versions[0].reviews[0];
    console.log(`✓ Contract 1 created (${contract1.id}), Review 1 ID: ${review1.id}`);

    // 4. Check access to Review 1 (Should trigger automatic Free Trial claim)
    console.log("\n4. Checking access to Review 1 (Trial review)...");
    const access1 = await canAccessReview(user.id, review1.id);
    console.log("Review 1 Access Result:", access1);
    if (!access1.canAccess || !access1.isFreeTrial) {
      throw new Error("FAIL: Review 1 should be unlocked via free trial.");
    }
    console.log("✓ Correct: Review 1 unlocked as complimentary trial.");

    // 5. Verify user's billing status after Review 1
    console.log("\n5. Verifying user billing status after using free trial...");
    const updatedBilling = await getUserBillingStatus(user.id);
    console.log("Updated Billing Status:", updatedBilling);
    if (updatedBilling.hasFreeReview || !updatedBilling.freeReviewUsed) {
      throw new Error("FAIL: User should now be marked as free review used.");
    }
    console.log("✓ Correct: User's free review is marked as used.");

    // 6. Create Contract 2 and Review 2 (Second Contract)
    console.log("\n6. Creating Contract 2 & Review 2...");
    const contract2 = await prisma.contract.create({
      data: {
        userId: user.id,
        filename: "Test_Brand_Agreement_2.pdf",
        contractType: "Content Licensing",
        versions: {
          create: {
            versionNumber: 1,
            filename: "Test_Brand_Agreement_2.pdf",
            fileReference: "test_doc_ref_2",
            reviews: {
              create: {
                status: "complete",
                userRole: "creator",
              },
            },
          },
        },
      },
      include: {
        versions: {
          include: { reviews: true },
        },
      },
    });

    const review2 = contract2.versions[0].reviews[0];
    console.log(`✓ Contract 2 created (${contract2.id}), Review 2 ID: ${review2.id}`);

    // 7. Check access to Review 2 before payment (Should be BLOCKED with PAYMENT_REQUIRED)
    console.log("\n7. Checking access to Review 2 before payment (Paywall check)...");
    const access2Before = await canAccessReview(user.id, review2.id);
    console.log("Review 2 Access Result (Before Payment):", access2Before);
    if (access2Before.canAccess || access2Before.reason !== "PAYMENT_REQUIRED") {
      throw new Error("FAIL: Review 2 must require payment of ₦5,000.");
    }
    console.log("✓ Correct: Review 2 is locked behind paywall (₦5,000 required).");

    // 8. Simulate successful Paystack payment verification & unlock
    console.log("\n8. Unlocking Review 2 via Paystack payment verification...");
    const testReference = `pstk_test_ref_${Date.now()}`;
    const unlockResult = await markReviewAsPaid(review2.id, {
      amount: 5000,
      reference: testReference,
      customerEmail: user.email,
      paidAt: new Date(),
      metadata: { reviewId: review2.id, contractId: contract2.id },
    });
    console.log("Payment Record Created:", unlockResult.payment);

    // 9. Check access to Review 2 after payment (Should be UNLOCKED)
    console.log("\n9. Checking access to Review 2 after payment...");
    const access2After = await canAccessReview(user.id, review2.id);
    console.log("Review 2 Access Result (After Payment):", access2After);
    if (!access2After.canAccess || !access2After.isPaid) {
      throw new Error("FAIL: Review 2 should be unlocked as PAID.");
    }
    console.log("✓ Correct: Review 2 is successfully unlocked and paid.");

    // 10. Test HMAC-SHA512 webhook signature verification
    console.log("\n10. Testing Paystack webhook HMAC-SHA512 verification...");
    const secretKey = "sk_test_mock_secret_key_123";
    const samplePayload = JSON.stringify({
      event: "charge.success",
      data: {
        reference: testReference,
        amount: 500000,
        status: "success",
      },
    });
    const validSignature = crypto.createHmac("sha512", secretKey).update(samplePayload).digest("hex");
    const isSignatureValid = verifyPaystackWebhookSignature(samplePayload, validSignature, secretKey);
    const isInvalidRejected = !verifyPaystackWebhookSignature(samplePayload, "invalid_signature_hash", secretKey);

    if (!isSignatureValid || !isInvalidRejected) {
      throw new Error("FAIL: Webhook signature verification logic failed.");
    }
    console.log("✓ Correct: HMAC-SHA512 webhook verification validated accurately.");

    console.log("\n=======================================================");
    console.log("🎉 ALL PAYSTACK BILLING & PAYMENT TESTS PASSED 100%!");
    console.log("=======================================================\n");
  } finally {
    // Clean up test data
    console.log("Cleaning up test user data...");
    await prisma.payment.deleteMany({ where: { userId: user.id } });
    await prisma.finding.deleteMany({
      where: {
        review: {
          contractVersion: {
            contract: { userId: user.id },
          },
        },
      },
    });
    await prisma.review.deleteMany({
      where: {
        contractVersion: {
          contract: { userId: user.id },
        },
      },
    });
    await prisma.clause.deleteMany({
      where: {
        contractVersion: {
          contract: { userId: user.id },
        },
      },
    });
    await prisma.contractVersion.deleteMany({
      where: {
        contract: { userId: user.id },
      },
    });
    await prisma.contract.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log("✓ Test data cleaned up successfully.");
  }
}

runTest().catch((e) => {
  console.error("Test failed with error:", e);
  process.exit(1);
});
