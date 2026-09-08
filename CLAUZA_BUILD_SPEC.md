# Clauza — AI Agent Build Specification

## 0. How to use this document

You are an AI coding agent tasked with building Clauza end to end. This document is your spec. Follow it in the order given — sections are sequenced so each phase produces a working, demoable increment rather than a half-built monolith. Do not skip the hallucination-prevention and source-validation requirements in Section 6 to save time; they are core product requirements, not polish.

Where this document says "MVP," build only that. Do not add features from "Later / Post-MVP" sections without being explicitly asked.

---

## 1. Product summary

**One sentence:** Clauza helps people understand what they're agreeing to in a contract, identifies terms that may put them at a disadvantage, and tells them what they may want to negotiate before signing.

**Tagline:** "Know what you're signing."

**What it is not:** a generic AI document summarizer. The output must move a user from "I have no idea what this means" to "I understand what I'm agreeing to, what concerns me, and what I can ask to change."

**Target audiences (build for all of these from the start — no single-audience wedge):**
- Content creators (YouTubers, TikTokers, podcasters, streamers)
- Influencers (sponsorships, brand deals, ambassador agreements)
- Artists (musicians, photographers, designers, visual artists)
- Entertainers (actors, performers, comedians, models)
- Freelancers (developers, designers, writers, consultants, marketers)
- Small businesses without in-house legal

**Geographic scope:** Global / general. Do not hardcode assumptions specific to any one country's legal system. Where jurisdiction-specific interpretation would materially change a finding (e.g., enforceability of non-competes, statutory payment terms, data protection obligations), the system should note that enforceability may depend on the governing law/jurisdiction named in the contract, rather than assert a jurisdiction-specific rule as fact.

---

## 2. Core user flow (MVP)

1. **Landing** — "Know what you're signing." / "Upload your contract. Clauza identifies important terms, explains potential risks, and helps you know what to negotiate." → [Review My Contract]
2. **Upload** — PDF or DOCX (scanned PDFs/images are post-MVP; if a scanned PDF is uploaded, detect it and prompt for a text-based file instead of silently failing).
3. **Tell Clauza who you are** — role selector: Creator/Influencer, Artist/Entertainer, Freelancer, Small Business, Employee, Other.
4. **Tell Clauza about the contract** — contract type selector, options conditional on role (see Section 4).
5. **Optional priorities** — multi-select: Getting paid / Protecting my content or IP / Avoiding exclusivity / Understanding termination / Limiting liability / Understanding deadlines / Everything.
6. **Analysis** (pipeline in Section 5).
7. **Report** (structure in Section 7).
8. **Actions:** Download Report, Ask Clauza More (follow-up Q&A grounded in the same document + findings), Negotiate This (generate alternative clause wording per finding).

---

## 3. Non-goals for MVP

Do not build any of the following unless explicitly requested later:
- Full legal practice management / enterprise CLM
- "AI lawyer" that gives definitive legal advice or predicts outcomes
- E-signature
- Legal research platform
- Contract template marketplace
- Multi-party collaboration/redlining system
- Complex in-app document editor

---

## 4. Contract types by role (MVP taxonomy)

Keep this list closed for MVP. Expand later based on what users actually upload — do not pre-build speculative categories.

| Role | Contract types |
|---|---|
| Creator / Influencer / Artist / Entertainer | Brand Deal, Sponsorship, Influencer Agreement, Content Agreement, Talent Agreement, Licensing Agreement, Other |
| Freelancer | Freelance Agreement, Service Agreement, Consulting Agreement, Other |
| Small Business | Vendor Agreement, Service Agreement, Partnership Agreement, NDA, Other |
| Employee | Employment Agreement, Other |
| Other | General Contract Review (fallback checklist, see 4.1) |

### 4.1 Fallback checklist (role/type = Other)

When role or contract type doesn't match a known category, do not skip specialized analysis — run a general-purpose checklist covering: parties and defined terms, payment terms, scope of obligations, term and termination, IP/ownership provisions (if any), liability and indemnification, confidentiality, dispute resolution/governing law. Flag to the user that this is a general review, not a specialized one for their contract type.

---

## 5. AI pipeline architecture

Do not use a single large prompt that receives the raw document and is told "review this." Build a modular, staged pipeline. Each stage's output is structured data consumed by the next stage — not free text re-interpreted downstream.

```
Uploaded document
  → Document Processor (format detection, text extraction)
  → Clause Segmentation (break into addressable clause units w/ section, page, position)
  → Contract Classification (confirm/refine contract type from actual content, not just user's selection)
  → User Context + Priorities merge (role, contract type, stated priorities)
  → Specialized Checklist selection (per Section 4 taxonomy)
  → Clause-Level Analysis (per-clause: category, plain-language meaning, risk tier, why it matters)
  → Cross-Clause Analysis (see 5.1 — explicit checklist, not open-ended)
  → Risk Engine (assign/reconcile severity across clause-level + cross-clause findings)
  → Negotiation Recommendation generation (per finding: options + optional suggested wording)
  → Source Validation (see Section 6 — mandatory gate before a finding reaches the report)
  → Structured Report assembly
```

Use cheaper/faster models for extraction and segmentation; reserve the strongest available model for clause reasoning, cross-clause reasoning, and source validation. Cache extracted text and intermediate structured results per contract version so re-runs (e.g., regenerating one section) don't re-process the whole document.

### 5.1 Cross-clause analysis — MVP scope

Cross-clause reasoning (detecting risk that spans multiple clauses, including *absence* of a provision) is the hardest part of this system to keep reliable. For MVP, do not build this as an open-ended "notice anything connected" pass. Implement it as an explicit, closed checklist of known cross-clause patterns:

- Contract term vs. exclusivity period (exclusivity outlasting or disproportionate to the term)
- Termination rights vs. payment trigger (termination clause exists but is silent on payment for completed/in-progress work)
- Deliverables/scope vs. deadlines (deadlines that don't account for stated revision or approval cycles)
- Payment amount/schedule vs. termination (no kill fee or partial payment provision on early termination)
- IP/content rights grant vs. stated deal value or duration (perpetual/broad grant paired with a short-term or one-off engagement)

Each pattern in this checklist is its own deterministic check with its own prompt/logic — not a single generic "find cross-clause issues" instruction. Add new patterns to this list deliberately over time; don't let the model freelance new pattern types in production.

---

## 6. Hallucination prevention & source validation (mandatory, non-negotiable)

Clauza must never invent clauses, payment amounts, dates, rights, obligations, parties, or deadlines. If something can't be determined from the document, the report must say so explicitly ("Clauza couldn't determine this from the contract") rather than omit it silently or guess.

**Concrete pipeline requirement — not just a prompt instruction:** every Finding that reaches the report must pass a dedicated verification step before inclusion:

1. The Finding cites a specific clause (by clause ID / section / page).
2. A validation pass checks: does the cited clause text, as extracted, actually exist verbatim (or near-verbatim, accounting for OCR/extraction noise) in the document?
3. A second check (can be a separate model call with only the clause text + the finding's claim, not the whole document) asks: does this clause text actually support this specific claim?
4. If either check fails, the Finding is rejected — not softened, not kept with a caveat. Rejected findings should be logged for review but never shown to the user as-is.

Every Finding shown to the user must have a "View Source Clause" affordance that shows the actual cited text and its location (section/page). This is a UI requirement, not optional polish — it is core to product trust.

---

## 7. Report structure

### 7.1 Deal Snapshot (top of report)
Short structured summary of what the AI could determine: contract type, payment amount, key deliverables, contract term, exclusivity period (if any), content/IP rights posture, payment timing. Any field the AI couldn't determine should say so, not be left blank without explanation.

Summary counts: e.g. "🔴 3 things needing attention / 🟠 5 worth reviewing / 🟡 4 important provisions to understand."

### 7.2 Three-layer finding format (apply to every finding — this is the core product mechanic)

For each finding, always separate:
- **Layer 1 — What the contract says:** direct, factual restatement of the clause.
- **Layer 2 — What this means:** plain-language interpretation of practical effect.
- **Layer 3 — What you could consider doing:** concrete, actionable suggestion (not legal advice framed as certainty).

Never collapse these into a single generic sentence like "this clause grants broad rights." Always include Layer 3 and a "View Source Clause" link back to the exact text.

### 7.3 Risk tiers

Do not use numeric/percentage scoring (no "72% safe" — this is false precision). Use four qualitative tiers:
- 🔴 High attention — potentially significant financial, rights, liability, or professional consequences.
- 🟠 Worth reviewing — potential concern that depends on context.
- 🟡 Understand this — important provision that isn't necessarily unfavorable.
- 🟢 No major issue identified — the AI didn't identify an obvious concern (never phrase as "this clause is safe").

### 7.4 "What should I negotiate?" (core action feature)

For every significant (🔴/🟠) finding, generate 2–4 concrete negotiation options (e.g., reduce duration, narrow scope, add a payment condition, cap liability), plus an optional "Generate alternative wording" action that produces copyable suggested clause language the user could send to the counterparty.

---

## 8. Data model (MVP)

```
User
  id, email, name, user_type, created_at

Contract
  id, user_id, filename, contract_type, status, created_at

ContractVersion
  id, contract_id, version_number, file_reference, extracted_text, created_at

Clause
  id, contract_version_id, title, section, text, page_number, position, clause_type

Review
  id, contract_version_id, status, overall_attention, model_version, created_at, completed_at

Finding
  id, review_id, clause_id, category, severity, title, summary, why_it_matters,
  recommendation, suggested_rewrite, confidence, source_validated (bool)

Payment
  id, user_id, review_id, amount, currency, provider, status, transaction_reference, created_at
```

**Immutability requirement:** Reviews and their Findings are immutable once created. A re-run (new model version, re-analysis) creates a new Review linked to the same ContractVersion, not an in-place overwrite. This preserves an audit trail — important for a product making claims about legal documents — and lets "why did the AI say something different this time" be answerable.

---

## 9. Security & privacy requirements (build in from the start, not later)

- HTTPS everywhere; secure authentication; server-side authorization on every document/finding access.
- Private object storage — no public document URLs, ever.
- User A must never be able to access User B's contract or findings under any code path. Write an explicit authorization check at the data-access layer, not just at the route layer.
- Encryption at rest where the storage provider supports it.
- Explicit, stated document retention policy before any real user uploads anything (e.g., raw file auto-deleted after N days; extracted text/findings retained per user's account settings). This must be a decision made and implemented, not deferred.
- No model training on user-uploaded documents without explicit opt-in.
- Secure handling of any third-party AI/data-processing API keys — never client-side.
- User-facing deletion functionality for contracts and account data.

---

## 10. Legal positioning (product copy constraints)

The product must never claim:
- "This contract is safe."
- "You don't need a lawyer."

Use language like: "Clauza uses AI to help you understand contract terms and identify provisions that may deserve attention." For high-stakes agreements, surface: "Consider consulting a qualified lawyer before signing." Bake this into report templates, not just marketing copy — it should be a persistent, unremovable footer/disclaimer on every generated report.

---

## 11. Tech stack (MVP)

- Frontend: Next.js, React, TypeScript, Tailwind
- Backend: Next.js API routes for MVP simplicity, or a separate FastAPI service if AI pipeline complexity warrants it — reuse existing codebase/experience where it makes sense rather than rebuilding from scratch
- Database: PostgreSQL
- Storage: private object storage (e.g., S3-compatible) with signed URLs, never public
- AI: abstract the LLM provider behind an internal service interface so the provider/model can be swapped per pipeline stage without touching calling code

---

## 12. Build order (phased)

**Phase 1 — Core pipeline, one contract type, no auth polish**
- Upload → extract → segment → classify → single specialized checklist (pick Creator/Brand Deal as the first fully-built vertical, since it's the smallest, best-defined checklist) → clause-level findings with three-layer format and source validation → basic report render.
- Skip: negotiation wording generation, cross-clause analysis, payments, multiple contract types.

**Phase 2 — Expand analysis depth**
- Add cross-clause checklist (Section 5.1).
- Add "What should I negotiate?" + suggested wording generation.
- Add remaining contract types/roles from Section 4.

**Phase 3 — Product completeness**
- Auth, per-user contract history, deletion, retention policy enforcement.
- Payments (pay-per-review) — freemium: basic overview + limited findings free; full review behind payment.
- "Ask Clauza More" — follow-up Q&A scoped strictly to the uploaded document + generated findings (must also go through source validation for any factual claim about the document).

**Phase 4 — Post-MVP (do not build without explicit request)**
- Scanned PDF / image OCR support.
- Subscription tier (saved contracts, version comparison, clause library, renewal reminders).
- Contract version comparison / redlining.

---

## 13. Definition of done for MVP

A contract uploaded by a real user in the Creator/Brand Deal vertical produces a report where:
- Every finding has a valid, verified source citation.
- Every finding follows the three-layer format.
- Risk tiers are qualitative, not numeric.
- At least the closed cross-clause checklist (Section 5.1) runs and surfaces findings when applicable.
- The legal disclaimer footer is present on every report.
- No cross-user data leakage is possible under any tested access path.
