# Clauza — Stack Decisions & Agent Task Breakdown

Companion to `CLAUZA_BUILD_SPEC.md`. That file is the product/architecture spec. This file locks the open technical decisions and breaks Phase 1 into agent-sized tasks with their own acceptance criteria, so an agentic coding tool (e.g. Antigravity) can work through it incrementally instead of attempting the whole MVP in one pass.

---

## 1. Locked stack decisions

These replace the "or" choices left open in the build spec. If you want to change any of these, change them here before the agent starts — don't let the agent decide mid-build.

| Decision | Choice | Why |
|---|---|---|
| Backend | Next.js API routes (App Router route handlers) | One codebase, one deploy, simplest for MVP. Split out a separate FastAPI service later only if the AI pipeline's compute/latency needs outgrow serverless functions. |
| Database | PostgreSQL, run locally for development | Local install via pgAdmin. Note: won't be reachable once deployed — move to a hosted Postgres (Supabase/Neon) at deploy time by swapping `DATABASE_URL`; nothing else changes. |
| ORM | Prisma | Matches the data model in Section 8 of the build spec directly; migrations are agent-friendly. |
| Auth | Auth.js (NextAuth) with email/password or magic link | No need for social login complexity in MVP; magic link avoids password-storage concerns entirely if you want to skip password handling altogether. |
| File storage | Supabase Storage | Private buckets, signed URLs — matches Section 9 security requirement of "no public document URLs." Uses Supabase's own SDK (project URL + service role key), not generic S3 credentials. |
| LLM provider | Anthropic API (Claude) | Strong structured-output and long-document reasoning fit; abstract behind the internal service interface per Section 11 so this can be swapped later. |
| Text extraction (PDF/DOCX) | `pdf-parse` (PDF) and `mammoth` (DOCX) as first pass | Cheap, deterministic extraction before any LLM call touches the document. |
| Deployment | Vercel | Native Next.js support, simplest path from repo to live URL. |
| Payments (Phase 3 only) | Stripe | Not needed until Phase 3 — noted here so env vars are anticipated. |

---

## 2. Environment variables

Set these up before the agent writes any code that depends on them — an agent working without a defined config surface tends to invent inconsistent variable names across files.

```
DATABASE_URL=                      # local Postgres connection string; swap to hosted Postgres URL at deploy time
NEXTAUTH_URL=
NEXTAUTH_SECRET=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL (Project Settings → API)
SUPABASE_SERVICE_ROLE_KEY=         # Supabase service_role key (Project Settings → API) — never expose client-side
STORAGE_BUCKET=                    # name of the private bucket created in Supabase Storage
# Phase 3 only:
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Note: none of these values belong in this file or any file committed to the repo — only the variable *names* live here as documentation. Actual values go in `.env.local` only, which stays out of git.

---

## 3. Repo structure (starting scaffold)

```
/app
  /(marketing)/page.tsx           # landing page
  /upload/page.tsx                # upload + role/type/priority flow
  /review/[id]/page.tsx           # report view
  /api
    /contracts/route.ts           # upload handling
    /contracts/[id]/analyze/route.ts   # triggers pipeline
    /contracts/[id]/route.ts      # fetch contract + review
/lib
  /ai
    provider.ts                   # LLM provider abstraction (Section 11)
    extract.ts                    # text extraction stage
    segment.ts                    # clause segmentation stage
    classify.ts                   # contract classification stage
    analyze-clause.ts             # clause-level analysis stage
    cross-clause.ts               # closed cross-clause checklist (spec Section 5.1)
    validate-source.ts            # source validation gate (spec Section 6)
    generate-negotiation.ts       # negotiation options + suggested wording
  /db
    prisma.ts                     # Prisma client singleton
  /storage
    client.ts                     # storage provider abstraction
/prisma
  schema.prisma                   # data model from build spec Section 8
```

---

## 4. Phase 1 task breakdown (feed to the agent one task at a time)

Each task below has its own acceptance criteria. Don't move to the next task until the current one's criteria are met — this is what keeps an agentic tool from producing one unreviewable mega-change.

### Task 1.1 — Project scaffold
Set up Next.js (TypeScript, Tailwind, App Router), Prisma with the Section 8 schema, and the folder structure above. Wire `DATABASE_URL` and run initial migration.
**Done when:** `npx prisma studio` shows all Section 8 tables; app boots with a blank landing page.

### Task 1.2 — Upload flow (no AI yet)
Build the landing page, upload page (PDF/DOCX only, reject other types with a clear message), and the role → contract type → priorities selector from build spec Section 2, steps 3–5. On submit, create `Contract` and `ContractVersion` rows and store the raw file in private storage.
**Done when:** a real PDF/DOCX upload results in a stored file, a signed URL that isn't publicly guessable, and correct rows in `Contract`/`ContractVersion`.

### Task 1.3 — Extraction + segmentation
Implement `extract.ts` (pdf-parse / mammoth) and `segment.ts` (break extracted text into `Clause` rows with section/page/position). No LLM calls yet — this is deterministic parsing plus a first structuring pass.
**Done when:** a sample brand-deal PDF produces a reasonable set of `Clause` rows with correct page numbers and non-empty text.

### Task 1.4 — Contract classification + checklist selection
Implement `classify.ts`: given extracted text + user-selected role/type, confirm or refine the contract type, and select the Creator/Brand Deal checklist (the only one built in Phase 1 — see build spec Section 12).
**Done when:** classification output is a structured object (not free text) with a confidence value, stored on the `Review` row.

### Task 1.5 — Clause-level analysis (three-layer format)
Implement `analyze-clause.ts` against the Creator/Brand Deal checklist from build spec Section 7. Each output Finding must have: category, the three layers (says/means/consider), and a risk tier (🔴/🟠/🟡/🟢 — qualitative only, never numeric).
**Done when:** running this on a real brand-deal contract produces Findings covering payment, deliverables, content rights, exclusivity, termination, liability, and image/likeness where present in the document.

### Task 1.6 — Source validation gate
Implement `validate-source.ts` per build spec Section 6: verbatim/near-verbatim match check between a Finding's cited clause and the actual extracted text, plus a second pass confirming the clause supports the claim. Findings that fail either check are rejected and logged, never shown to the user.
**Done when:** a deliberately mismatched test case (Finding citing a clause that doesn't support its claim) is correctly rejected and does not appear in the report.

### Task 1.7 — Report render
Build the report page: Deal Snapshot, risk-tier counts, findings list in three-layer format, "View Source Clause" affordance showing the actual cited text, and the persistent legal disclaimer footer (build spec Section 10).
**Done when:** a full upload → analyze → report cycle works end-to-end on a real contract with no manual DB intervention, and every displayed Finding has a working source link.

---

## 5. What's deliberately deferred past Task 1.7

Per build spec Section 12 — do not let the agent pull these forward into Phase 1:
- Cross-clause analysis, negotiation wording generation
- Any role/contract type beyond Creator/Brand Deal
- Auth, payments, contract history/deletion UI
- "Ask Clauza More" follow-up Q&A

These are Phase 2/3 tasks in the build spec — write them as separate task lists once Phase 1 is demoable.
