import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserBillingStatus } from "@/lib/payments/billing";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const billingStatus = await getUserBillingStatus(user.id);
    return NextResponse.json(billingStatus);
  } catch (error: unknown) {
    console.error("Billing status API error:", error);
    const message = error instanceof Error ? error.message : "Failed to retrieve billing status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
