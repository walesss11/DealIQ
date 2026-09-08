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
    .map((item) => `- ${item.title}: ${item.description}`)
    .join("\n");

  const systemPrompt = `You are DealIQ, a careful contract analyst. Analyze the contract against the following closed checklist:
${checklist}

For each issue or notable term found, return a structured finding in JSON format with:
- "clauseIndex": integer index matching the [Clause Index: N] in the text
- "category": one of ["payment", "deliverables", "content_rights", "exclusivity", "termination", "liability", "image_likeness", "general"]
- "severity": one of ["high", "worth_reviewing", "understand", "no_issue"]
- "title": a clear, concise title (e.g., "Perpetual Content Licensing", "Net-60 Payment Terms")
- "whatItSays": factual restatement of what the clause explicitly states (Layer 1)
- "whatItMeans": plain-language practical effect on the creator (Layer 2)
- "whatToConsider": concrete, actionable negotiation or protective consideration (Layer 3)
- "confidence": confidence score between 0.0 and 1.0

Rules:
- Never invent absent terms, amounts, dates, rights, or obligations.
- User stated priorities to emphasize: ${userPriorities.join(", ") || "Everything"}.
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
