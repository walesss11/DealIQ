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
    name: "Exclusivity Period vs. Deal Duration",
    description:
      "Detect if post-campaign exclusivity restrictions outlast or are disproportionate to the contract term or compensation.",
    targetCategories: ["exclusivity", "deliverables", "payment"],
  },
  {
    id: "termination-vs-payment",
    name: "Termination Rights vs. Payment for Work Completed",
    description:
      "Detect if the counterparty can terminate for convenience or on short notice without paying for completed drafts, in-progress work, or materials.",
    targetCategories: ["termination", "payment"],
  },
  {
    id: "revisions-vs-deadlines",
    name: "Revision & Approval Cycles vs. Fixed Deadlines",
    description:
      "Detect if fixed posting deadlines or penalties fail to account for multi-day brand approval or revision turnaround times.",
    targetCategories: ["deliverables"],
  },
  {
    id: "cancellation-kill-fee",
    name: "Payment Schedule vs. Absence of Kill Fee",
    description:
      "Detect if payment is backloaded or delayed while early cancellation offers zero kill fee or fee protection.",
    targetCategories: ["payment", "termination"],
  },
  {
    id: "perpetual-ip-vs-one-off",
    name: "Perpetual Rights Grant vs. One-Off Deal Value",
    description:
      "Detect if perpetual, worldwide, or all-media IP ownership/licensing is demanded for a standard short-term or one-off creator engagement.",
    targetCategories: ["content_rights", "payment"],
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
}

export async function analyzeCrossClauses(
  clauses: ClauseSnippet[],
  contractType: string
): Promise<CrossClauseFinding[]> {
  if (clauses.length === 0) return [];

  const formattedClauses = clauses
    .map((clause) => `[Clause Index: ${clause.index}]\n${clause.text}`)
    .join("\n\n---\n\n");

  const patternList = CROSS_CLAUSE_PATTERNS.map(
    (p) => `- ID "${p.id}": ${p.name} -> ${p.description}`
  ).join("\n");

  const systemPrompt = `You are DealIQ's Cross-Clause Contract Risk Engine. Your purpose is to evaluate compound risks across multiple clauses using ONLY the following closed checklist of 5 patterns:
${patternList}

For each pattern that is clearly present and supported by the text:
1. "patternId": Must match one of the 5 pattern IDs above.
2. "primaryClauseIndex": The main clause index where this risk is anchored.
3. "relatedClauseIndices": Array of other clause indices involved in the compound risk.
4. "title": Concise title highlighting the cross-clause conflict.
5. "severity": "high" or "worth_reviewing" or "understand".
6. "whatItSays": Factual restatement citing what the related clauses state or omit (Layer 1).
7. "whatItMeans": Plain-language explanation of how the combination of clauses creates a disadvantage (Layer 2).
8. "whatToConsider": Practical recommendation to harmonize or renegotiate the terms (Layer 3).
9. "confidence": Confidence score between 0.0 and 1.0.

Rules:
- Do not freelance outside the 5 designated patterns.
- If a pattern is NOT present in the document, do NOT include it.
- Return ONLY valid JSON: {"findings": [...]}`;

  try {
    const rawResult = await callLLM({
      systemPrompt,
      userPrompt: `Contract type: ${contractType}\n\nDocument clauses:\n${formattedClauses}`,
      responseFormat: "json",
      temperature: 0.1,
    });

    return crossClauseSchema.parse(JSON.parse(rawResult)).findings;
  } catch (error: unknown) {
    console.error("Cross-clause analysis failed:", error);
    return [];
  }
}
