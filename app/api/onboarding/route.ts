import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      onboardingCompleted: user.onboardingCompleted,
      onboardingStep: user.onboardingStep,
      userRole: user.userRole,
      contractTypes: parsedContractTypes,
      priorities: parsedPriorities,
      contractExperience: user.contractExperience,
    });
  } catch (error: unknown) {
    console.error("Failed to get onboarding state:", error);
    return NextResponse.json({ error: "Failed to load onboarding state" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      onboardingStep,
      userRole,
      contractTypes,
      priorities,
      contractExperience,
      completed,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (typeof onboardingStep === "number") {
      updateData.onboardingStep = onboardingStep;
    }
    if (typeof userRole === "string") {
      updateData.userRole = userRole;
    }
    if (Array.isArray(contractTypes)) {
      updateData.contractTypes = JSON.stringify(contractTypes);
    }
    if (Array.isArray(priorities)) {
      updateData.priorities = JSON.stringify(priorities);
    }
    if (typeof contractExperience === "string") {
      updateData.contractExperience = contractExperience;
    }
    if (typeof completed === "boolean") {
      updateData.onboardingCompleted = completed;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    // Re-issue session cookie so JWT payload reflects updated onboarding state
    if (typeof completed === "boolean") {
      const { createSession } = await import("@/lib/auth/session");
      await createSession(updatedUser.id).catch((err) => {
        console.warn("Could not refresh session cookie after onboarding update:", err);
      });
    }

    return NextResponse.json({
      success: true,
      onboardingCompleted: updatedUser.onboardingCompleted,
      onboardingStep: updatedUser.onboardingStep,
    });
  } catch (error: unknown) {
    console.error("Failed to update onboarding state:", error);
    return NextResponse.json({ error: "Failed to update onboarding state" }, { status: 500 });
  }
}
