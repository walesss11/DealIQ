import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log("Connecting to Postgres...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "conversations" (
      "id" TEXT NOT NULL,
      "contract_id" TEXT NOT NULL,
      "review_id" TEXT,
      "user_id" TEXT,
      "title" TEXT,
      "summary" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "conversations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "conversations_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS "conversations_contract_id_idx" ON "conversations"("contract_id");
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "conversations_review_id_idx" ON "conversations"("review_id");
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "conversations_user_id_idx" ON "conversations"("user_id");
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "chat_messages" (
      "id" TEXT NOT NULL,
      "conversation_id" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "focus_context" TEXT,
      "sources" TEXT,
      "negotiation_action" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_created_at_idx" ON "chat_messages"("conversation_id", "created_at");
  `);

  console.log("Successfully verified and created conversation and chat_messages tables!");
  await pool.end();
}

run().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
