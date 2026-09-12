import { randomUUID } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const globalForPool = global as unknown as { pgPool?: pg.Pool };

function getPgPool(): pg.Pool {
  if (!globalForPool.pgPool) {
    globalForPool.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
  }
  return globalForPool.pgPool;
}

export interface DbConversation {
  id: string;
  contract_id: string;
  review_id: string | null;
  user_id: string | null;
  title: string | null;
  summary: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbChatMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  focus_context: string | null;
  sources: string | null;
  negotiation_action: string | null;
  created_at: Date;
}

export async function getOrCreateConversation(
  contractId: string,
  reviewId?: string | null,
  userId?: string | null,
  title?: string | null
): Promise<DbConversation> {
  const pool = getPgPool();

  const existing = await pool.query<DbConversation>(
    `SELECT * FROM "conversations" WHERE "contract_id" = $1 ORDER BY "created_at" ASC LIMIT 1`,
    [contractId]
  );

  if (existing.rows.length > 0 && existing.rows[0]) {
    return existing.rows[0];
  }

  const id = `conv_${randomUUID().replace(/-/g, "")}`;
  const convoTitle = title || "Contract Chat";

  const inserted = await pool.query<DbConversation>(
    `INSERT INTO "conversations" ("id", "contract_id", "review_id", "user_id", "title", "created_at", "updated_at")
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`,
    [id, contractId, reviewId || null, userId || null, convoTitle]
  );

  return inserted.rows[0];
}

export async function getConversationWithMessages(contractId: string): Promise<{
  conversation: DbConversation;
  messages: DbChatMessage[];
}> {
  const conversation = await getOrCreateConversation(contractId);
  const pool = getPgPool();

  const messagesRes = await pool.query<DbChatMessage>(
    `SELECT * FROM "chat_messages" WHERE "conversation_id" = $1 ORDER BY "created_at" ASC`,
    [conversation.id]
  );

  return {
    conversation,
    messages: messagesRes.rows,
  };
}

export async function addChatMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  focusContext?: string | null,
  sources?: string | null,
  negotiationAction?: string | null
): Promise<DbChatMessage> {
  const pool = getPgPool();
  const id = `msg_${randomUUID().replace(/-/g, "")}`;

  const res = await pool.query<DbChatMessage>(
    `INSERT INTO "chat_messages" ("id", "conversation_id", "role", "content", "focus_context", "sources", "negotiation_action", "created_at")
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`,
    [
      id,
      conversationId,
      role,
      content,
      focusContext || null,
      sources || null,
      negotiationAction || null,
    ]
  );

  // Update conversation updated_at
  await pool.query(`UPDATE "conversations" SET "updated_at" = NOW() WHERE "id" = $1`, [
    conversationId,
  ]).catch(() => {});

  return res.rows[0];
}

export async function getRecentChatMessages(
  conversationId: string,
  limit = 10
): Promise<DbChatMessage[]> {
  const pool = getPgPool();
  const res = await pool.query<DbChatMessage>(
    `SELECT * FROM (
       SELECT * FROM "chat_messages"
       WHERE "conversation_id" = $1
       ORDER BY "created_at" DESC
       LIMIT $2
     ) sub ORDER BY "created_at" ASC`,
    [conversationId, limit]
  );

  return res.rows;
}

export async function ensureCascadeConstraints(): Promise<void> {
  const pool = getPgPool();
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_versions_contract_id_fkey') THEN
          ALTER TABLE "contract_versions" DROP CONSTRAINT "contract_versions_contract_id_fkey";
        END IF;
        ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contract_id_fkey"
          FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE;

        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clauses_contract_version_id_fkey') THEN
          ALTER TABLE "clauses" DROP CONSTRAINT "clauses_contract_version_id_fkey";
        END IF;
        ALTER TABLE "clauses" ADD CONSTRAINT "clauses_contract_version_id_fkey"
          FOREIGN KEY ("contract_version_id") REFERENCES "contract_versions"("id") ON DELETE CASCADE;

        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_contract_version_id_fkey') THEN
          ALTER TABLE "reviews" DROP CONSTRAINT "reviews_contract_version_id_fkey";
        END IF;
        ALTER TABLE "reviews" ADD CONSTRAINT "reviews_contract_version_id_fkey"
          FOREIGN KEY ("contract_version_id") REFERENCES "contract_versions"("id") ON DELETE CASCADE;

        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'findings_review_id_fkey') THEN
          ALTER TABLE "findings" DROP CONSTRAINT "findings_review_id_fkey";
        END IF;
        ALTER TABLE "findings" ADD CONSTRAINT "findings_review_id_fkey"
          FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE;

        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'findings_clause_id_fkey') THEN
          ALTER TABLE "findings" DROP CONSTRAINT "findings_clause_id_fkey";
        END IF;
        ALTER TABLE "findings" ADD CONSTRAINT "findings_clause_id_fkey"
          FOREIGN KEY ("clause_id") REFERENCES "clauses"("id") ON DELETE CASCADE;

        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_review_id_fkey') THEN
          ALTER TABLE "payments" DROP CONSTRAINT "payments_review_id_fkey";
        END IF;
        ALTER TABLE "payments" ADD CONSTRAINT "payments_review_id_fkey"
          FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE;

        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_contract_id_fkey') THEN
          ALTER TABLE "conversations" DROP CONSTRAINT "conversations_contract_id_fkey";
        END IF;
        ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contract_id_fkey"
          FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE;

        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_conversation_id_fkey') THEN
          ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_conversation_id_fkey";
        END IF;
        ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey"
          FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN OTHERS THEN
          -- Ignore if table does not exist or insufficient permissions
          NULL;
      END $$;
    `);
  } catch (err) {
    console.warn("Could not ensure cascade constraints:", err);
  }
}

export async function deleteContractCompletely(contractId: string): Promise<void> {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Delete chat messages
    await client.query(
      `DELETE FROM "chat_messages"
       WHERE "conversation_id" IN (SELECT "id" FROM "conversations" WHERE "contract_id" = $1)`,
      [contractId]
    );

    // 2. Delete conversations
    await client.query(
      `DELETE FROM "conversations" WHERE "contract_id" = $1`,
      [contractId]
    );

    // 3. Delete payments linked to reviews of versions of this contract
    await client.query(
      `DELETE FROM "payments"
       WHERE "review_id" IN (
         SELECT r."id" FROM "reviews" r
         JOIN "contract_versions" v ON r."contract_version_id" = v."id"
         WHERE v."contract_id" = $1
       )`,
      [contractId]
    );

    // 4. Delete findings linked to reviews of versions of this contract
    await client.query(
      `DELETE FROM "findings"
       WHERE "review_id" IN (
         SELECT r."id" FROM "reviews" r
         JOIN "contract_versions" v ON r."contract_version_id" = v."id"
         WHERE v."contract_id" = $1
       )`,
      [contractId]
    );

    // 5. Delete reviews linked to versions of this contract
    await client.query(
      `DELETE FROM "reviews"
       WHERE "contract_version_id" IN (
         SELECT "id" FROM "contract_versions" WHERE "contract_id" = $1
       )`,
      [contractId]
    );

    // 6. Delete clauses linked to versions of this contract
    await client.query(
      `DELETE FROM "clauses"
       WHERE "contract_version_id" IN (
         SELECT "id" FROM "contract_versions" WHERE "contract_id" = $1
       )`,
      [contractId]
    );

    // 7. Delete contract_versions
    await client.query(
      `DELETE FROM "contract_versions" WHERE "contract_id" = $1`,
      [contractId]
    );

    // 8. Delete contract
    await client.query(
      `DELETE FROM "contracts" WHERE "id" = $1`,
      [contractId]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function clearChatMessages(contractId: string): Promise<void> {
  const pool = getPgPool();
  await pool.query(
    `DELETE FROM "chat_messages"
     WHERE "conversation_id" IN (SELECT "id" FROM "conversations" WHERE "contract_id" = $1)`,
    [contractId]
  );
}

export async function getLatestChatPerContract(contractIds: string[]): Promise<
  Map<string, { lastMessageAt: Date; messageSnippet: string }>
> {
  const map = new Map<string, { lastMessageAt: Date; messageSnippet: string }>();
  if (contractIds.length === 0) return map;

  const pool = getPgPool();
  try {
    const res = await pool.query<{
      contract_id: string;
      last_message_at: Date;
      content: string;
    }>(
      `SELECT DISTINCT ON (c.contract_id)
         c.contract_id,
         m.created_at AS last_message_at,
         m.content
       FROM "conversations" c
       JOIN "chat_messages" m ON m.conversation_id = c.id
       WHERE c.contract_id = ANY($1::text[])
       ORDER BY c.contract_id, m.created_at DESC`,
      [contractIds]
    );

    for (const row of res.rows) {
      map.set(row.contract_id, {
        lastMessageAt: row.last_message_at,
        messageSnippet: row.content.slice(0, 100),
      });
    }
  } catch (e) {
    console.warn("Could not load latest chat messages per contract:", e);
  }

  return map;
}
