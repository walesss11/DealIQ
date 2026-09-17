import { z } from "zod";

import { callLLM } from "./provider";

export interface CrossClauseCheck {
  id: string;
  name: string;
  description: string;
  targetCategories: string[];
}

export const CROSS_CLAUSE_PATTERNS: CrossClauseCheck[] = [
  {
    id: "exclusivity-vs-term",
    name: "Competitor Restrictions Last Longer Than Deal Duration",
    description:
      "Detect if restrictions stopping you from working with other brands outlast the campaign period or compensation.",
    targetCategories: ["exclusivity", "deliverables", "payment"],
  },
  {
    id: "termination-vs-payment",
    name: "Deal Can Be Cancelled Without Paying for Completed Work",
    description:
      "Detect if the brand can cancel early or on short notice without paying for completed drafts, in-progress work, or materials.",
    targetCategories: ["termination", "payment"],
  },
  {
    id: "revisions-vs-deadlines",
    name: "Brand Approval Delays Threaten Your Posting Deadlines",
    description:
      "Detect if fixed posting deadlines or penalties fail to account for multi-day brand feedback and revision review times.",
    targetCategories: ["deliverables"],
  },
  {
    id: "cancellation-kill-fee",
    name: "Delayed Payment Window With No Early Cancellation Fee",
    description:
      "Detect if payment is delayed (e.g., 60 days after posting) while early cancellation gives you zero kill fee protection.",
    targetCategories: ["payment", "termination"],
  },
  {
    id: "perpetual-ip-vs-one-off",
    name: "Forever Content Ownership Demanded For a One-Time Deal",
    description:
      "Detect if forever, worldwide, or all-media ownership of your content is demanded for a standard short-term or one-off project.",
    targetCategories: ["content_rights", "payment"],
  },
  {
    id: "open-ended-scope-vs-deliverables",
    name: "Broad Catch-All Scope Exceeds Defined Deliverables",
    description:
      "Detect if broad, open-ended service language (e.g., 'all other design or support tasks requested by Company') creates unbounded obligations beyond the specific, quantified deliverables without additional compensation.",
    targetCategories: ["deliverables", "payment"],
  },
];

export interface CrossClauseFinding {
  patternId: string;
  title: string;
  severity: "high" | "worth_reviewing" | "understand";
  primaryClauseIndex: number;
  relatedClauseIndices: number[];
  whatItSays: string;
  whatItMeans: string;
  whatToConsider: string;
  confidence: number;
}

const crossClauseSchema = z.object({
  findings: z.array(
    z.object({
      patternId: z.string(),
      title: z.string().min(1),
      severity: z.enum(["high", "worth_reviewing", "understand"]),
      primaryClauseIndex: z.number().int().nonnegative(),
      relatedClauseIndices: z.array(z.number().int().nonnegative()).default([]),
      whatItSays: z.string().min(1),
      whatItMeans: z.string().min(1),
      whatToConsider: z.string().min(1),
      confidence: z.number().min(0).max(1).default(0.95),
    })
  ),
});

export interface ClauseSnippet {
  id: string;
  index: number;
  text: string;
  section?: string | null;
  title?: string | null;
}

function parseAndNormalizeCrossFindings(raw: string): CrossClauseFinding[] {
  let parsed: unknown;
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parsed = null;
      }
    }
  }

  if (!parsed) return [];

  let rawList: Array<Record<string, unknown>> = [];
  if (Array.isArray(parsed)) {
    rawList = parsed as Array<Record<string, unknown>>;
  } else if (typeof parsed === "object" && parsed !== null && "findings" in parsed && Array.isArray((parsed as { findings?: unknown[] }).findings)) {
    rawList = (parsed as { findings: Array<Record<string, unknown>> }).findings;
  }

  const validSeverities: Record<string, "high" | "worth_reviewing" | "understand"> = {
    high: "high",
    critical: "high",
    severe: "high",
    worth_reviewing: "worth_reviewing",
    medium: "worth_reviewing",
    warning: "worth_reviewing",
    negotiate: "worth_reviewing",
    understand: "understand",
    low: "understand",
    info: "understand",
    noteworthy: "understand",
  };

  const results: CrossClauseFinding[] = [];

  for (const item of rawList) {
    if (!item || typeof item !== "object") continue;

    const patternId = String(item.patternId || "cross-clause-risk").trim();
    const title = String(item.title || "Cross-Clause Contract Tension").trim();
    const rawSeverity = String(item.severity || "worth_reviewing").toLowerCase().trim();
    const severity = validSeverities[rawSeverity] || "worth_reviewing";

    let primaryClauseIndex = typeof item.primaryClauseIndex === "number" ? Math.floor(item.primaryClauseIndex) : parseInt(String(item.primaryClauseIndex || 0), 10);
    if (isNaN(primaryClauseIndex) || primaryClauseIndex < 0) primaryClauseIndex = 0;

    let relatedClauseIndices: number[] = [];
    if (Array.isArray(item.relatedClauseIndices)) {
      relatedClauseIndices = item.relatedClauseIndices
        .map((idx) => (typeof idx === "number" ? Math.floor(idx) : parseInt(String(idx), 10)))
        .filter((idx) => !isNaN(idx) && idx >= 0);
    }

    let confidence = typeof item.confidence === "number" ? item.confidence : parseFloat(String(item.confidence || 0.95));
    if (isNaN(confidence)) confidence = 0.95;
    if (confidence > 1) confidence = confidence / 100;
    if (confidence < 0 || confidence > 1) confidence = 0.95;

    const whatItSays = String(item.whatItSays || item.what_it_says || "").trim();
    const whatItMeans = String(item.whatItMeans || item.what_it_means || "").trim();
    const whatToConsider = String(item.whatToConsider || item.what_to_consider || "").trim();

    if (whatItSays || whatItMeans) {
      results.push({
        patternId,
        title,
        severity,
        primaryClauseIndex,
        relatedClauseIndices,
        whatItSays: whatItSays || "Multiple clauses interact to create contractual asymmetry.",
        whatItMeans: whatItMeans || "Review how these provisions intersect in practice.",
        whatToConsider: whatToConsider || "Harmonize the timelines and terms across these sections.",
        confidence,
      });
    }
  }

  return results;
}

export async function analyzeCrossClauses(
  clauses: ClauseSnippet[],
  contractType: string,
  userRole?: string | null
): Promise<CrossClauseFinding[]> {
  if (clauses.length === 0) return [];

  const formattedClauses = clauses
    .map((clause) => {
      const heading = clause.section || clause.title ? ` [Clause: "${clause.section || clause.title}"]` : "";
      return `[Clause Index: ${clause.index}]${heading}\n${clause.text}`;
    })
    .join("\n\n---\n\n");

  const patternList = CROSS_CLAUSE_PATTERNS.map(
    (p) => `- ID "${p.id}": ${p.name} -> ${p.description}`
  ).join("\n");

  const resolvedRole = userRole || "Contract Party";

  const systemPrompt = `You are PactIQ's Cross-Clause Contract Risk Engine. Your purpose is to evaluate compound risks and consequential omissions across multiple clauses using ONLY the following closed checklist of 6 patterns:
${patternList}

POLICY RULES:
1. DIRECT SECOND-PERSON PERSPECTIVE ("YOU" / "YOUR") (MANDATORY):
   - Always write directly to the user in the second person ("you", "your", "you as the ${resolvedRole}").
   - ❌ NEVER refer to the user as "the creator", "the influencer", "the contractor", or "the party".
   - ✅ Write: "If the brand cancels early, you receive zero payment for completed drafts", "This restricts your ability to collaborate with competing brands...", "You bear all risk...".
2. USE SIMPLE, PLAIN LANGUAGE & THE "EXPLAIN IT TO ME" TEST (MANDATORY):
   - Translate complex legal concepts into clear, plain English. A user without legal training should immediately understand what the issue means after reading it once.
   - Use ordinary words. Keep sentences concise. Avoid legal jargon, academic terms, and fear-based language.
   - Prefer concrete descriptions over abstract statements (e.g., "If the other party cancels early, you will not be paid for work you already completed" rather than "This constitutes an unmitigated early-termination exposure").
   - PRESERVE PRECISION: Do NOT remove exact numbers, deadlines, or amounts (e.g. 60 days, ₦900,000, 7 days' notice). Simple language must remain factually precise.
3. DISTINGUISH SPECIFIC DELIVERABLES FROM GENERAL SCOPE:
   - When evaluating scope (Pattern "open-ended-scope-vs-deliverables"), check whether broad catch-all descriptions (e.g. "and any reasonable design tasks requested by the Company") create open-ended obligations beyond the specifically promised deliverables (e.g. 12 screens and 2 feedback rounds). Explain how this creates scope creep or uncompensated work without making baseless assumptions.
4. TITLE & TONE:
   - Titles should be friendly, clear, and highlight the practical tension (e.g., "Brand Can Cancel Deal Without Paying for In-Progress Work", "Broad Scope Language Exceeds Defined Deliverables").
   - Tone must be calm, direct, objective, and professional.
5. CURRENCY NEUTRALITY: Treat all currencies (NGN, USD, GBP, EUR, etc.) completely neutrally. The mere use of NGN or any currency is NOT a risk.
6. MEANINGFUL CONSEQUENCES: Only identify compound risks or missing provisions where the interplay of clauses creates a genuine, concrete financial, operational, or legal disadvantage for you.
7. STRICT CLAUSE GROUNDING: Factual restatements must cite what the clauses explicitly state or omit without inventing external facts or fabricating clause numbers. Use the exact clause headers provided.

For each pattern that is clearly present and supported by the text:
1. "patternId": Must match one of the 6 pattern IDs above.
2. "primaryClauseIndex": The main clause index where this risk is anchored.
3. "relatedClauseIndices": Array of other clause indices involved in the compound risk.
4. "title": Friendly plain-English title highlighting the conflict.
5. "severity": "high" or "worth_reviewing" or "understand".
6. "whatItSays": Factual restatement citing what the related clauses state or omit for you in plain words (Layer 1).
7. "whatItMeans": Plain-language explanation of how the combination of clauses creates an everyday disadvantage for you (Layer 2).
8. "whatToConsider": Practical everyday recommendation to harmonize or renegotiate the terms in your favor (Layer 3).
9. "confidence": Confidence score between 0.0 and 1.0.

Rules:
- Do not freelance outside the 5 designated patterns.
- NEVER invent or fabricate clause numbers that do not appear in the provided text.
- If a pattern is NOT present in the document, do NOT include it.
- Return ONLY valid JSON: {"findings": [...]}`;

  try {
    const rawResult = await callLLM({
      systemPrompt,
      userPrompt: `Contract type: ${contractType}\nUser role: ${resolvedRole}\n\nDocument clauses:\n${formattedClauses}`,
      responseFormat: "json",
      temperature: 0.1,
    });

    return parseAndNormalizeCrossFindings(rawResult);
  } catch (error: unknown) {
    console.error("Cross-clause analysis failed:", error);
    return [];
  }
}
