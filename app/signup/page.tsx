import { Suspense } from "react";
import SignUpForm from "./SignUpForm";

export const metadata = {
  title: "Create Account · PactIQ",
  description: "Create your PactIQ account for contract intelligence and review.",
};

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>}>
      <SignUpForm />
    </Suspense>
  );
}
