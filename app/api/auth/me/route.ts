import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    let parsedContractTypes: string[] = [];
    if (user.contractTypes) {
      try {
        parsedContractTypes = JSON.parse(user.contractTypes);
      } catch {
        parsedContractTypes = [];
      }
    }

    let parsedPriorities: string[] = [];
    if (user.priorities) {
      try {
        parsedPriorities = JSON.parse(user.priorities);
      } catch {
        parsedPriorities = [];
      }
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        onboardingCompleted: user.onboardingCompleted,
        userRole: user.userRole,
        contractTypes: parsedContractTypes,
        priorities: parsedPriorities,
        contractExperience: user.contractExperience,
        onboardingStep: user.onboardingStep,
      },
    });
  } catch (error: unknown) {
    console.error("Failed to get current user:", error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
