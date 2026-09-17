import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = {
  title: "Reset Password · PactIQ",
  description: "Set a new password for your PactIQ account.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
