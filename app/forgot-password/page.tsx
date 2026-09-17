import { Suspense } from "react";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata = {
  title: "Forgot Password · PactIQ",
  description: "Reset your PactIQ account password.",
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
