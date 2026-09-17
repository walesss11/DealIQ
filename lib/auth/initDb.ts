import pg from "pg";

const { Pool } = pg;

let initPromise: Promise<void> | null = null;

export async function ensureAuthSchema(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
    });

    try {
      await pool.query(`
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" TEXT;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" TIMESTAMP;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "user_role" TEXT;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'USER';
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "free_review_used" BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "contract_types" TEXT;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "priorities" TEXT;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "contract_experience" TEXT;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_step" INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT NOW();

        ALTER TABLE "contract_versions" ADD COLUMN IF NOT EXISTS "filename" TEXT;
        ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "comparison_result" TEXT;
        ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "is_paid" BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "is_free_trial" BOOLEAN NOT NULL DEFAULT false;

        ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP;
        ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "metadata" TEXT;
        CREATE UNIQUE INDEX IF NOT EXISTS "payments_transaction_reference_key" ON "payments"("transaction_reference");

        CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
          "id" TEXT PRIMARY KEY,
          "admin_id" TEXT NOT NULL,
          "admin_email" TEXT NOT NULL,
          "action" TEXT NOT NULL,
          "target_user_id" TEXT,
          "target_user_email" TEXT,
          "details" TEXT,
          "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS "admin_audit_logs_admin_id_idx" ON "admin_audit_logs"("admin_id");
        CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

        CREATE TABLE IF NOT EXISTS "accounts" (
          "id" TEXT PRIMARY KEY,
          "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "type" TEXT NOT NULL DEFAULT 'oauth',
          "provider" TEXT NOT NULL,
          "provider_account_id" TEXT NOT NULL,
          "refresh_token" TEXT,
          "access_token" TEXT,
          "expires_at" INTEGER,
          "token_type" TEXT,
          "scope" TEXT,
          "id_token" TEXT,
          "session_state" TEXT,
          "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
          CONSTRAINT "accounts_provider_provider_account_id_key" UNIQUE ("provider", "provider_account_id")
        );

        CREATE TABLE IF NOT EXISTS "sessions" (
          "id" TEXT PRIMARY KEY,
          "session_token" TEXT UNIQUE NOT NULL,
          "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
          "expires" TIMESTAMP NOT NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
          "id" TEXT PRIMARY KEY,
          "email" TEXT NOT NULL,
          "token" TEXT UNIQUE NOT NULL,
          "expires_at" TIMESTAMP NOT NULL,
          "used_at" TIMESTAMP,
          "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");
      `);
    } catch (error) {
      console.warn("Could not ensure auth schema:", error);
    } finally {
      await pool.end().catch(() => {});
    }
  })();

  return initPromise;
}
