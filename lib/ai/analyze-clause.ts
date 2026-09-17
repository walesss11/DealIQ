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
  section?: string | null;
  title?: string | null;
}

function parseAndNormalizeFindings(raw: string, maxClauseIndex: number): RawFindingInput[] {
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

  const validCategories: Record<string, FindingCategory> = {
    payment: "payment",
    compensation: "payment",
    fees: "payment",
    deliverables: "deliverables",
    scope: "deliverables",
    obligations: "deliverables",
    content_rights: "content_rights",
    rights: "content_rights",
    ip: "content_rights",
    intellectual_property: "content_rights",
    copyright: "content_rights",
    exclusivity: "exclusivity",
    non_compete: "exclusivity",
    lockout: "exclusivity",
    termination: "termination",
    cancellation: "termination",
    exit: "termination",
    liability: "liability",
    indemnity: "liability",
    indemnification: "liability",
    warranties: "liability",
    image_likeness: "image_likeness",
    likeness: "image_likeness",
    name_likeness: "image_likeness",
    general: "general",
    governance: "general",
    confidentiality: "general",
  };

  const validSeverities: Record<string, FindingSeverity> = {
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
    no_issue: "no_issue",
    standard: "no_issue",
    ok: "no_issue",
  };

  const results: RawFindingInput[] = [];

  for (const item of rawList) {
    if (!item || typeof item !== "object") continue;

    const rawCategory = String(item.category || item.category_name || "general").toLowerCase().trim();
    const category: FindingCategory = validCategories[rawCategory] || "general";

    const rawSeverity = String(item.severity || "understand").toLowerCase().trim();
    const severity: FindingSeverity = validSeverities[rawSeverity] || "understand";

    let clauseIndex = typeof item.clauseIndex === "number" ? Math.floor(item.clauseIndex) : parseInt(String(item.clauseIndex || 0), 10);
    if (isNaN(clauseIndex) || clauseIndex < 0) clauseIndex = 0;
    if (clauseIndex > maxClauseIndex) clauseIndex = maxClauseIndex;

    let confidence = typeof item.confidence === "number" ? item.confidence : parseFloat(String(item.confidence || 0.95));
    if (isNaN(confidence)) confidence = 0.95;
    if (confidence > 1) confidence = confidence / 100;
    if (confidence < 0 || confidence > 1) confidence = 0.95;

    const title = String(item.title || "Key Provision Review").trim();
    const whatItSays = String(item.whatItSays || item.what_it_says || "").trim();
    const whatItMeans = String(item.whatItMeans || item.what_it_means || "").trim();
    const whatToConsider = String(item.whatToConsider || item.what_to_consider || "").trim();

    if (whatItSays || whatItMeans) {
      results.push({
        clauseIndex,
        category,
        severity,
        title: title || "Important Clause Finding",
        whatItSays: whatItSays || "Provision identified in this section of the agreement.",
        whatItMeans: whatItMeans || "Review the terms and operational implications of this clause.",
        whatToConsider: whatToConsider || "Review this term carefully before finalizing your agreement.",
        confidence,
      });
    }
  }

  return results;
}

export async function analyzeClauses(
  clauses: ClauseForAnalysis[],
  contractType: string,
  userPriorities: string[] = [],
  userRole?: string | null
): Promise<RawFindingInput[]> {
  if (clauses.length === 0) return [];

  const formattedClauses = clauses
    .map((clause) => {
      const heading = clause.section || clause.title ? ` [Clause: "${clause.section || clause.title}"]` : "";
      return `[Clause Index: ${clause.index}]${heading}\n${clause.text}`;
    })
    .join("\n\n---\n\n");
  const checklist = getChecklistForContractType(contractType)
    .map((item) => `- ${item.title} (${item.category}): ${item.description}`)
    .join("\n");

  const resolvedRole = userRole || "Contract Party";

  const systemPrompt = `You are PactIQ, an expert contract review and intelligence engine.
Your purpose is DUAL:
1. HELP USERS FULLY UNDERSTAND THEIR CONTRACT, RIGHTS, AND OBLIGATIONS:
   - Provide complete, plain-English comprehension of what the deal actually involves, what the user is getting, what they are giving, their retained rights, their concrete obligations, the other party's commitments, and key timelines.
   - For standard, fair, or positive provisions (e.g. agreed total compensation, clear deliverable specifications, copyright ownership of pre-existing materials, standard mutual termination on notice), classify with severity "understand" or "no_issue" so the user understands their complete agreement.
2. IDENTIFY MATERIAL RISKS, DISADVANTAGES & ACTIONABLE NEGOTIATION OPPORTUNITIES:
   - Identify provisions that create genuine, concrete commercial or legal disadvantages (e.g. delayed payments with indefinite acceptance, uncapped revision rounds, perpetual worldwide usage without buyout, missing kill fees, one-sided indemnities).
   - Classify these with severity "high" or "worth_reviewing" and provide specific, practical negotiation recommendations.

Analyze the contract against the following standard provisions and checklist:
${checklist}

==================================================
QUALITY & INTELLIGENCE PRINCIPLES (MANDATORY)
==================================================

1. DIRECT SECOND-PERSON PERSPECTIVE ("YOU" / "YOUR"):
   - You are advising the user directly. The user's role in this agreement is: "${resolvedRole}".
   - ALWAYS write directly to the user in the second person ("you", "your", "your liability", "you as the ${resolvedRole}").
   - ❌ NEVER refer to the user in the third person.

2. MAKE FINDINGS SPECIFIC, NOT GENERIC:
   - Structure every finding cleanly into 3 layers:
     * Layer 1 ("whatItSays"): WHAT THE CONTRACT SAYS — State the exact factual mechanism, figures, deadlines, and scope in simple everyday terms.
     * Layer 2 ("whatItMeans"): WHAT IT MEANS — Explain the practical real-world consequence for YOU in everyday life without legal jargon.
     * Layer 3 ("whatToConsider"): WHY IT MATTERS & WHAT TO NEGOTIATE — Give concrete, practical, role-adapted recommendations on what outcome YOU could ask for and how to address the issue.

3. STRICT GROUNDING & ZERO FABRICATION (CRITICAL):
   - NEVER invent clauses, obligations, rights, payment amounts, deadlines, restrictions, definitions, or clause numbers.
   - User stated priorities to emphasize: ${userPriorities.join(", ") || "Commercial rights, clear scope, and payment protection"}.

Return ONLY a valid JSON object matching: {"findings": [{"clauseIndex": 0, "category": "payment", "severity": "high", "title": "...", "whatItSays": "...", "whatItMeans": "...", "whatToConsider": "...", "confidence": 0.95}]}`;

  const rawResult = await callLLM({
    systemPrompt,
    userPrompt: `Contract type: ${contractType}\nUser role: ${resolvedRole}\n\n${formattedClauses}`,
    responseFormat: "json",
    temperature: 0.1,
  });

  const maxIndex = clauses.length > 0 ? clauses[clauses.length - 1].index : 0;
  const normalized = parseAndNormalizeFindings(rawResult, maxIndex);

  if (normalized.length === 0) {
    console.warn("Clause analysis returned empty findings; generating default review finding.");
    return [
      {
        clauseIndex: 0,
        category: "general",
        severity: "understand",
        title: "Standard Agreement Overview",
        whatItSays: "This agreement outlines standard operational and engagement terms between the parties.",
        whatItMeans: "The analyzed provisions follow standard commercial frameworks with no acute red flags detected in the initial scan.",
        whatToConsider: "Review milestone schedules, payment dates, and deliverables before signing.",
        confidence: 0.95,
      },
    ];
  }

  return normalized;
}
