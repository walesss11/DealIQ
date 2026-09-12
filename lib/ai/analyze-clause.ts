import { z } from "zod";

import { getChecklistForContractType } from "./checklists/brand-deal";
import { callLLM } from "./provider";

export type FindingCategory =
  | "payment"
  | "deliverables"
  | "content_rights"
  | "exclusivity"
  | "termination"
  | "liability"
  | "image_likeness"
  | "general";

export type FindingSeverity = "high" | "worth_reviewing" | "understand" | "no_issue";

export interface Finding {
  clauseIndex: number;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  whatItSays: string;
  whatItMeans: string;
  whatToConsider: string;
  confidence: number;
}

export type RawFindingInput = Finding;

export interface ClauseForAnalysis {
  id: string;
  index: number;
  text: string;
}

const findingSchema = z.object({
  clauseIndex: z.number().int().nonnegative(),
  category: z.enum([
    "payment",
    "deliverables",
    "content_rights",
    "exclusivity",
    "termination",
    "liability",
    "image_likeness",
    "general",
  ]),
  severity: z.enum(["high", "worth_reviewing", "understand", "no_issue"]),
  title: z.string().min(1).default("Key Provision Finding"),
  whatItSays: z.string().min(1),
  whatItMeans: z.string().min(1),
  whatToConsider: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0.95),
});

const responseSchema = z.object({ findings: z.array(findingSchema) });

export async function analyzeClauses(
  clauses: ClauseForAnalysis[],
  contractType: string,
  userPriorities: string[] = []
): Promise<RawFindingInput[]> {
  if (clauses.length === 0) return [];

  const formattedClauses = clauses
    .map((clause) => `[Clause Index: ${clause.index}]\n${clause.text}`)
    .join("\n\n---\n\n");
  const checklist = getChecklistForContractType(contractType)
    .map((item) => `- ${item.title} (${item.category}): ${item.description}`)
    .join("\n");

  const systemPrompt = `You are PactIQ, an expert contract review and intelligence engine.
Analyze the contract against the following standard provisions and checklist:
${checklist}

==================================================
1. CURRENCY-NEUTRAL CONTRACT REVIEW POLICY (MANDATORY)
==================================================
PactIQ must not treat any currency as inherently better or worse.
NGN, USD, GBP, EUR, and other currencies MUST be treated completely neutrally.
- The mere use of NGN, USD, or any currency is NOT a contractual risk.
- Do NOT flag NGN simply because it is a local currency, the counterparty is international, USD is widely used, or exchange rates may change.
- Do NOT automatically recommend changing NGN to USD, adding an FX adjustment, pegging payment to USD, or using another currency.
- ONLY identify a currency or FX issue where there is an actual contract-specific reason:
  * The currency is unclear, ambiguous, or unspecified;
  * The contract requires currency conversion but does not clearly specify the applicable exchange rate or conversion mechanism;
  * The user is paid in one currency but has material contractual costs/expenses in another specified in the contract;
  * The contract creates an explicit currency mismatch or unilateral deduction;
  * The user explicitly states that FX protection is one of their prioritized goals.
Example: "Creator shall receive ₦750,000 within 7 days." -> Payment amount and currency are clearly stated. No currency risk.

==================================================
2. MISSING / UNCLEAR PROVISIONS POLICY (MANDATORY)
==================================================
A contract can create an issue not only because of what it says, but also because of what it fails to address.
However, only surface missing or unclear provisions where the omission has a REAL and MEANINGFUL consequence for the user in this deal.
- Do NOT treat the absence of a provision as a problem simply because it could theoretically be useful.
- Surface a missing or unclear provision ONLY where:
  1. It is relevant to this particular contract and user's role/obligations;
  2. Its absence creates a meaningful financial, legal, operational, rights-related, or commercial consequence; and
  3. The issue is not already adequately addressed elsewhere in the contract.
- Distinguish between:
  * PRESENT: The contract adequately addresses the issue.
  * PRESENT BUT UNFAVORABLE: The contract contains an explicit term that materially disadvantages the user.
  * MISSING / UNCLEAR: The contract does not adequately address an issue that is materially relevant and whose absence creates meaningful risk.
    (e.g., Open-ended revisions "until satisfied" with no numerical round cap; missing kill fee where unilateral cancellation leaves completed work uncompensated; no payment protection for accrued work upon termination; indefinite exclusivity period or undefined restricted competitor list; unbounded indemnity or lack of liability cap).
- Avoid producing a long checklist of speculative omissions. Prioritize only the most important consequential omissions.

==================================================
3. THREE-LAYER STRUCTURED FINDINGS
==================================================
For each notable term, unfavorable condition, or consequential missing/unclear provision found, return a structured finding in JSON format with:
- "clauseIndex": integer index matching the [Clause Index: N] in the text (for missing protections, cite the related clause that creates the context, e.g., the revision clause or payment clause).
- "category": one of ["payment", "deliverables", "content_rights", "exclusivity", "termination", "liability", "image_likeness", "general"]
- "severity": one of ["high", "worth_reviewing", "understand", "no_issue"]
- "title": a clear, concise title (e.g., "Perpetual Content Licensing", "Uncapped Revision Obligations", "Payment Terms: ₦750,000 within 7 Days")
- "whatItSays": Layer 1: factual restatement of what the clause explicitly states or materially omits.
- "whatItMeans": Layer 2: plain-language practical effect and consequence on the user.
- "whatToConsider": Layer 3: concrete, actionable negotiation suggestion or protective consideration.
- "confidence": confidence score between 0.0 and 1.0

Rules:
- Never invent absent facts, fake clause numbers, fake dates, or imaginary counterparty names.
- User stated priorities to emphasize: ${userPriorities.join(", ") || "All commercial and rights protections"}.
- Return ONLY a valid JSON object matching: {"findings": [...]}`;

  const rawResult = await callLLM({
    systemPrompt,
    userPrompt: `Contract type: ${contractType}\n\n${formattedClauses}`,
    responseFormat: "json",
    temperature: 0.1,
  });

  try {
    return responseSchema.parse(JSON.parse(rawResult)).findings;
  } catch (error: unknown) {
    console.error("Clause analysis returned invalid structured output:", error);
    throw new Error("The clause analysis stage did not return valid structured findings.");
  }
}
