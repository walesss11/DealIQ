import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings · PactIQ",
  description: "Manage your PactIQ profile and intelligence preferences.",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  let priorities: string[] = [];
  if (user.priorities) {
    try {
      priorities = JSON.parse(user.priorities);
    } catch {
      priorities = [];
    }
  }

  let contractTypes: string[] = [];
  if (user.contractTypes) {
    try {
      contractTypes = JSON.parse(user.contractTypes);
    } catch {
      contractTypes = [];
    }
  }

  const userProps = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    userRole: user.userRole,
    onboardingCompleted: user.onboardingCompleted,
    priorities,
    contractTypes,
    contractExperience: user.contractExperience,
  };

  return <SettingsClient user={userProps} />;
}
