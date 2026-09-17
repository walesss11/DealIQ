import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true, message: "Logged out successfully." });
  } catch (error: unknown) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Failed to log out." }, { status: 500 });
  }
}
