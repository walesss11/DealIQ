import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { ensureAuthSchema } from "./initDb";

const TOKEN_EXPIRY_HOURS = 2;

export async function createPasswordResetToken(email: string): Promise<string> {
  await ensureAuthSchema();

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Invalidate previous tokens for this email
  await prisma.passwordResetToken.deleteMany({
    where: { email: email.toLowerCase().trim() },
  }).catch(() => {});

  await prisma.passwordResetToken.create({
    data: {
      email: email.toLowerCase().trim(),
      token,
      expiresAt,
    },
  });

  return token;
}

export async function validatePasswordResetToken(token: string): Promise<{
  valid: boolean;
  email?: string;
  error?: string;
}> {
  await ensureAuthSchema();

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record) {
    return { valid: false, error: "Invalid or expired password reset link." };
  }

  if (record.usedAt) {
    return { valid: false, error: "This password reset link has already been used." };
  }

  if (record.expiresAt < new Date()) {
    return { valid: false, error: "This password reset link has expired. Please request a new one." };
  }

  return { valid: true, email: record.email };
}

export async function markTokenAsUsed(token: string): Promise<void> {
  await prisma.passwordResetToken.update({
    where: { token },
    data: { usedAt: new Date() },
  }).catch(() => {});
}
