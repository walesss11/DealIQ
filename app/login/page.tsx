import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Sign In · PactIQ",
  description: "Sign in to your PactIQ contract intelligence workspace.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
