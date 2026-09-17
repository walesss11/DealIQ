import { getCurrentUser } from "@/lib/auth/session";
import OnboardingWizard from "./OnboardingWizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Personalize PactIQ · Onboarding",
  description: "Personalize your PactIQ contract intelligence preferences.",
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  let contractTypes: string[] = [];
  if (user?.contractTypes) {
    try {
      contractTypes = JSON.parse(user.contractTypes);
    } catch {
      contractTypes = [];
    }
  }

  let priorities: string[] = [];
  if (user?.priorities) {
    try {
      priorities = JSON.parse(user.priorities);
    } catch {
      priorities = [];
    }
  }

  const initialState = {
    onboardingStep: user?.onboardingStep || 1,
    userRole: user?.userRole || null,
    contractTypes,
    priorities,
    contractExperience: user?.contractExperience || null,
  };

  return <OnboardingWizard initialState={initialState} />;
}
