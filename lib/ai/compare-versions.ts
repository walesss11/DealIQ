import { z } from "zod";
import { callLLM } from "./provider";

export type ConcernStatus = "addressed" | "partially_addressed" | "unresolved";

export interface PreviousConcernEvolution {
  id: string;
  title: string;
  category: string;
  status: ConcernStatus;
  previousConcern: string; // Layer 1/2 from previous review
  previousRecommendation: string; // Layer 3 / negotiation ask
  revisedTerm: string; // What the revised agreement now says
  substantiveExplanation: string; // Why it is addressed, partially addressed, or still unresolved
  sourceRef?: string; // Clause reference in revised document
}

export interface SubstantiveChangeItem {
  id: string;
  title: string;
  category: string;
  beforeText: string;
  afterText: string;
  whyItMatters: string;
  originalClauseRef?: string;
  revisedClauseRef?: string;
}

export interface NewMaterialIssueItem {
  id: string;
  title: string;
  category: string;
  severity: "high" | "worth_reviewing" | "understand";
  description: string;
  whyItMatters: string;
  revisedClauseRef?: string;
}

export interface DealAsItStandsSnapshot {
  compensation: string;
  paymentSchedule: string;
  deliverables: string;
  usageRights: string;
  ipOwnership: string;
  exclusivity: string;
  termAndTermination: string;
  revisions: string;
  keyRestrictions?: string;
  otherObligations?: string;
}

// Legacy change item for backwards compatibility
export interface VersionChangeItem {
  id: string;
  category: string;
  title: string;
  status: "accepted" | "partially_accepted" | "unchanged" | "new_provision" | "removed_provision";
  statusLabel: string;
  originalClauseRef?: string;
  originalText?: string;
  revisedClauseRef?: string;
  revisedText?: string;
  whatChanged: string;
  whyItMatters: string;
  previousNegotiationSnippet?: string;
  actionRecommendation?: string;
  severity?: "high" | "worth_reviewing" | "understand";
}

export interface VersionComparisonResult {
  previousVersionNumber: number;
  currentVersionNumber: number;
  overviewSummary: string;
  summaryCounts: {
    totalChanges: number;
    addressedCount: number;
    partiallyAddressedCount: number;
    unresolvedCount: number;
    newProvisionsCount: number;
    // Backwards compatibility mappings
    acceptedCount?: number;
    unchangedCount?: number;
    removedProvisionsCount?: number;
  };
  previousConcerns: PreviousConcernEvolution[];
  whatChanged: SubstantiveChangeItem[];
  newIssues: NewMaterialIssueItem[];
  dealAsItStands: DealAsItStandsSnapshot;
  pactiqTake: string;
  // Legacy changes array for backwards compatibility
  changes: VersionChangeItem[];
}

export interface CompareVersionsInput {
  previousVersionNumber: number;
  currentVersionNumber: number;
  contractType: string;
  userRole?: string | null;
  userPriorities?: string[];
  previousClauses: Array<{
    id: string;
    section?: string | null;
    title?: string | null;
    text: string;
    position: number;
  }>;
  previousFindings: Array<{
    id: string;
    category: string;
    severity: string;
    title: string;
    whatItSays: string;
    whatItMeans: string;
    whatToConsider: string;
    suggestedRewrite?: string | null;
    emailSnippet?: string | null;
    clause?: {
      section?: string | null;
      title?: string | null;
      position?: number;
    } | null;
  }>;
  revisedClauses: Array<{
    id: string;
    section?: string | null;
    title?: string | null;
    text: string;
    position: number;
  }>;
  revisedExtractedText: string;
}

export function stripMarkdown(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/\bsection\s+(\d+|[IVXLCDM]+(?:\.[0-9a-z]+)*)/gi, "Clause $1")
    .replace(/\bsections\s+(\d+|[IVXLCDM]+(?:\.[0-9a-z]+)*)/gi, "Clauses $1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .trim();
}

export function extractDealSnapshotFromClauses(
  clauses: Array<{ text: string; title?: string | null; section?: string | null }>
): DealAsItStandsSnapshot {
  function findClauseText(keywords: string[], fallback: string): string {
    const matchIdx = clauses.findIndex((c) => {
      const t = (c.text || "").toLowerCase();
      const title = (c.title || "").toLowerCase();
      const sec = (c.section || "").toLowerCase();
      return keywords.some((k) => title.includes(k) || sec.includes(k) || t.includes(k));
    });
    if (matchIdx === -1) return fallback;

    const parts: string[] = [clauses[matchIdx].text.trim()];
    // Collect next 2 related paragraphs if they belong to the same section
    for (let i = matchIdx + 1; i < Math.min(matchIdx + 3, clauses.length); i++) {
      const nextText = clauses[i].text.trim();
      if (/^\d+\.\s+[A-Za-z]/.test(nextText)) break;
      if (nextText.length > 0) parts.push(nextText);
      if (parts.join(" ").length >= 260) break;
    }

    const clean = stripMarkdown(parts.join(" ")).replace(/\s+/g, " ").trim();
    return clean.length > 250 ? clean.slice(0, 250) + "..." : clean;
  }

  return {
    compensation: findClauseText(["total fee", "compensation", "shall pay", "total compensation", "fee", "fees", "₦", "$", "£"], "Agreed compensation specified in revision."),
    paymentSchedule: findClauseText(["payment schedule", "installment", "net 30", "days of signing", "milestone", "payable as follows"], "Payment according to agreed milestones."),
    deliverables: findClauseText(["initial project includes", "project includes", "deliverables include", "deliverables:", "screens", "component library", "reels", "posts", "deliverable", "deliverables", "scope", "services"], "Specified content deliverables and creative scope."),
    usageRights: findClauseText(["usage rights", "license", "licensing", "grant of rights", "perpetual", "months", "worldwide"], "Licensed media usage rights across agreed channels."),
    ipOwnership: findClauseText(["intellectual property", "copyright", "ownership", "retains ownership"], "You retain copyright with a commercial license granted to the client."),
    exclusivity: findClauseText(["exclusivity", "non-compete", "competitive", "competitor"], "Exclusivity restrictions as outlined in the revised agreement."),
    termAndTermination: findClauseText(["term and termination", "termination", "terminate", "written notice", "cancellation"], "Agreement term and mutual cancellation on notice."),
    revisions: findClauseText(["revision", "revisions", "approval", "review period", "rounds"], "Included revision rounds and sign-off timeline."),
  };
}

export function normalizeComparisonResult(raw: unknown): VersionComparisonResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, any>;

  const prevConcerns: PreviousConcernEvolution[] = Array.isArray(obj.previousConcerns)
    ? obj.previousConcerns.map((pc: any, i: number) => ({
        id: pc.id || `pc-${i + 1}`,
        title: stripMarkdown(pc.title || "Identified Term"),
        category: pc.category || "general",
        status: (pc.status === "addressed" || pc.status === "partially_addressed" || pc.status === "unresolved"
          ? pc.status
          : pc.status === "accepted"
          ? "addressed"
          : pc.status === "partially_accepted"
          ? "partially_addressed"
          : "unresolved") as ConcernStatus,
        previousConcern: stripMarkdown(pc.previousConcern || pc.originalText || "Previous term identified in review"),
        previousRecommendation: stripMarkdown(pc.previousRecommendation || pc.previousNegotiationSnippet || "Requested modification"),
        revisedTerm: stripMarkdown(pc.revisedTerm || pc.revisedText || "Revised term in current draft"),
        substantiveExplanation: stripMarkdown(pc.substantiveExplanation || pc.whatChanged || pc.whyItMatters || "Evaluated based on revised draft terms."),
        sourceRef: pc.sourceRef || pc.revisedClauseRef || pc.originalClauseRef,
      }))
    : [];

  if (prevConcerns.length === 0 && Array.isArray(obj.changes)) {
    obj.changes.forEach((ch: any, i: number) => {
      if (ch.status !== "new_provision") {
        prevConcerns.push({
          id: ch.id || `pc-${i + 1}`,
          title: stripMarkdown(ch.title || "Negotiated Term"),
          category: ch.category || "general",
          status: (ch.status === "accepted" ? "addressed" : ch.status === "partially_accepted" ? "partially_addressed" : "unresolved") as ConcernStatus,
          previousConcern: stripMarkdown(ch.originalText || "Previous provision from earlier draft"),
          previousRecommendation: stripMarkdown(ch.previousNegotiationSnippet || ch.actionRecommendation || "Recommended modification"),
          revisedTerm: stripMarkdown(ch.revisedText || "Updated clause in revised draft"),
          substantiveExplanation: stripMarkdown(ch.whatChanged || ch.whyItMatters || "Substantive change in revised contract"),
          sourceRef: ch.revisedClauseRef || ch.originalClauseRef,
        });
      }
    });
  }

  const whatChangedList: SubstantiveChangeItem[] = Array.isArray(obj.whatChanged) && obj.whatChanged.length > 0
    ? obj.whatChanged.map((wc: any, i: number) => ({
        id: wc.id || `wc-${i + 1}`,
        title: stripMarkdown(wc.title || "Material Change"),
        category: wc.category || "general",
        beforeText: stripMarkdown(wc.beforeText || "Previous term text"),
        afterText: stripMarkdown(wc.afterText || "Revised term text"),
        whyItMatters: stripMarkdown(wc.whyItMatters || "Impact on your rights and obligations"),
        originalClauseRef: wc.originalClauseRef,
        revisedClauseRef: wc.revisedClauseRef,
      }))
    : [];

  if (whatChangedList.length === 0) {
    if (Array.isArray(obj.changes) && obj.changes.length > 0) {
      obj.changes.forEach((ch: any, i: number) => {
        if (ch.status !== "new_provision" && (ch.originalText || ch.revisedText || ch.whatChanged)) {
          whatChangedList.push({
            id: ch.id || `wc-${i + 1}`,
            title: stripMarkdown(ch.title || "Contract Modification"),
            category: ch.category || "general",
            beforeText: stripMarkdown(ch.originalText || ch.whatChanged || "Previous draft wording"),
            afterText: stripMarkdown(ch.revisedText || ch.whatChanged || "Updated wording in revision"),
            whyItMatters: stripMarkdown(ch.whyItMatters || ch.whatChanged || "Changes your contractual terms."),
            originalClauseRef: ch.originalClauseRef,
            revisedClauseRef: ch.revisedClauseRef,
          });
        }
      });
    } else if (prevConcerns.length > 0) {
      prevConcerns.forEach((pc, i) => {
        whatChangedList.push({
          id: `wc-synth-${i + 1}`,
          title: pc.title,
          category: pc.category,
          beforeText: pc.previousConcern,
          afterText: pc.revisedTerm,
          whyItMatters: pc.substantiveExplanation,
          originalClauseRef: pc.sourceRef,
          revisedClauseRef: pc.sourceRef,
        });
      });
    }
  }

  const newIssuesList: NewMaterialIssueItem[] = Array.isArray(obj.newIssues)
    ? obj.newIssues.map((ni: any, i: number) => ({
        id: ni.id || `ni-${i + 1}`,
        title: stripMarkdown(ni.title || "New Provision"),
        category: ni.category || "general",
        severity: ni.severity || "worth_reviewing",
        description: stripMarkdown(ni.description || "Added in revised version"),
        whyItMatters: stripMarkdown(ni.whyItMatters || "Newly added term"),
        revisedClauseRef: ni.revisedClauseRef,
      }))
    : [];

  if (newIssuesList.length === 0 && Array.isArray(obj.changes)) {
    obj.changes
      .filter((ch: any) => ch.status === "new_provision")
      .forEach((ch: any, i: number) => {
        newIssuesList.push({
          id: ch.id || `ni-${i + 1}`,
          title: stripMarkdown(ch.title || "New Provision Added"),
          category: ch.category || "general",
          severity: ch.severity || "worth_reviewing",
          description: stripMarkdown(ch.revisedText || ch.whatChanged || "Added in revised version"),
          whyItMatters: stripMarkdown(ch.whyItMatters || "Affects your rights and obligations."),
          revisedClauseRef: ch.revisedClauseRef,
        });
      });
  }

  const rawDeal = obj.dealAsItStands && typeof obj.dealAsItStands === "object" ? obj.dealAsItStands : {};
  const dealAsItStands: DealAsItStandsSnapshot = {
    compensation: stripMarkdown(rawDeal.compensation) || "Agreed fee specified in revision.",
    paymentSchedule: stripMarkdown(rawDeal.paymentSchedule) || "Payment schedule specified in revision.",
    deliverables: stripMarkdown(rawDeal.deliverables) || "Specified content deliverables and scope.",
    usageRights: stripMarkdown(rawDeal.usageRights) || "Licensed media usage rights and duration.",
    ipOwnership: stripMarkdown(rawDeal.ipOwnership) || "Copyright and content ownership terms.",
    exclusivity: stripMarkdown(rawDeal.exclusivity) || "Competitor restrictions and lockout terms.",
    termAndTermination: stripMarkdown(rawDeal.termAndTermination) || "Term duration and cancellation rights.",
    revisions: stripMarkdown(rawDeal.revisions) || "Included revision rounds and approval process.",
    keyRestrictions: rawDeal.keyRestrictions ? stripMarkdown(rawDeal.keyRestrictions) : undefined,
    otherObligations: rawDeal.otherObligations ? stripMarkdown(rawDeal.otherObligations) : undefined,
  };

  const addressedCount = obj.summaryCounts?.addressedCount ?? obj.summaryCounts?.acceptedCount ?? prevConcerns.filter((c) => c.status === "addressed").length;
  const partiallyAddressedCount = obj.summaryCounts?.partiallyAddressedCount ?? obj.summaryCounts?.partiallyAcceptedCount ?? prevConcerns.filter((c) => c.status === "partially_addressed").length;
  const unresolvedCount = obj.summaryCounts?.unresolvedCount ?? obj.summaryCounts?.unchangedCount ?? prevConcerns.filter((c) => c.status === "unresolved").length;
  const newProvisionsCount = obj.summaryCounts?.newProvisionsCount ?? newIssuesList.length;
  const totalChanges = obj.summaryCounts?.totalChanges || (addressedCount + partiallyAddressedCount + unresolvedCount + newProvisionsCount);

  return {
    previousVersionNumber: obj.previousVersionNumber || 1,
    currentVersionNumber: obj.currentVersionNumber || 2,
    overviewSummary: stripMarkdown(obj.overviewSummary) || `Version ${obj.currentVersionNumber || 2} revision review and comparison completed.`,
    pactiqTake: stripMarkdown(obj.pactiqTake || obj.overviewSummary) || "Review the updated provisions and remaining points below.",
    summaryCounts: {
      totalChanges,
      addressedCount,
      partiallyAddressedCount,
      unresolvedCount,
      newProvisionsCount,
      acceptedCount: addressedCount,
      unchangedCount: unresolvedCount,
      removedProvisionsCount: 0,
    },
    previousConcerns: prevConcerns,
    whatChanged: whatChangedList,
    newIssues: newIssuesList,
    dealAsItStands,
    changes: Array.isArray(obj.changes) ? obj.changes : [],
  };
}

const comparisonSchema = z.object({
  overviewSummary: z.string().min(1),
  pactiqTake: z.string().min(1),
  summaryCounts: z.object({
    totalChanges: z.number().int().nonnegative().default(0),
    addressedCount: z.number().int().nonnegative().default(0),
    partiallyAddressedCount: z.number().int().nonnegative().default(0),
    unresolvedCount: z.number().int().nonnegative().default(0),
    newProvisionsCount: z.number().int().nonnegative().default(0),
  }).default({ totalChanges: 0, addressedCount: 0, partiallyAddressedCount: 0, unresolvedCount: 0, newProvisionsCount: 0 }),
  previousConcerns: z.array(
    z.object({
      id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
      title: z.string().min(1),
      category: z.string().default("general"),
      status: z.enum(["addressed", "partially_addressed", "unresolved"]),
      previousConcern: z.string().min(1),
      previousRecommendation: z.string().min(1),
      revisedTerm: z.string().min(1),
      substantiveExplanation: z.string().min(1),
      sourceRef: z.string().optional(),
    })
  ).default([]),
  whatChanged: z.array(
    z.object({
      id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
      title: z.string().min(1),
      category: z.string().default("general"),
      beforeText: z.string().min(1),
      afterText: z.string().min(1),
      whyItMatters: z.string().min(1),
      originalClauseRef: z.string().optional(),
      revisedClauseRef: z.string().optional(),
    })
  ).default([]),
  newIssues: z.array(
    z.object({
      id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
      title: z.string().min(1),
      category: z.string().default("general"),
      severity: z.enum(["high", "worth_reviewing", "understand"]).default("worth_reviewing"),
      description: z.string().min(1),
      whyItMatters: z.string().min(1),
      revisedClauseRef: z.string().optional(),
    })
  ).default([]),
  dealAsItStands: z.object({
    compensation: z.string().default("Agreed fee specified in revision."),
    paymentSchedule: z.string().default("Milestones and payment timing specified in revision."),
    deliverables: z.string().default("Content deliverables and campaign scope."),
    usageRights: z.string().default("License scope and duration."),
    ipOwnership: z.string().default("IP ownership and copyright retention terms."),
    exclusivity: z.string().default("Competitor restrictions and lockout duration."),
    termAndTermination: z.string().default("Contract term and cancellation conditions."),
    revisions: z.string().default("Revision rounds and approval timeline."),
    keyRestrictions: z.string().optional(),
    otherObligations: z.string().optional(),
  }).default({
    compensation: "Agreed fee specified in revision.",
    paymentSchedule: "Milestones and payment timing specified in revision.",
    deliverables: "Content deliverables and campaign scope.",
    usageRights: "License scope and duration.",
    ipOwnership: "IP ownership and copyright retention terms.",
    exclusivity: "Competitor restrictions and lockout duration.",
    termAndTermination: "Contract term and cancellation conditions.",
    revisions: "Revision rounds and approval timeline.",
  }),
});

export async function compareContractVersions(
  input: CompareVersionsInput
): Promise<VersionComparisonResult> {
  const previousFindingsSummary = input.previousFindings
    .filter((f) => f.severity !== "no_issue")
    .map((f, i) => {
      const clauseRef =
        f.clause?.section ||
        f.clause?.title ||
        f.title;
      return `Previous Finding #${i + 1} [${f.severity.toUpperCase()}]: [${clauseRef}] "${f.title}" (${f.category})
- Previous Concern: ${f.whatItSays}
- Practical Impact: ${f.whatItMeans}
- Previous Negotiation Recommendation: ${f.whatToConsider}
${f.suggestedRewrite ? `- Proposed wording sent to counterparty: ${f.suggestedRewrite}` : ""}
${f.emailSnippet ? `- Negotiation snippet: ${f.emailSnippet}` : ""}`;
    })
    .join("\n\n");

  const prevClausesList = input.previousClauses
    .slice(0, 40)
    .map(
      (c) =>
        `[${c.section || c.title || "Provision"}]: ${c.text.substring(0, 350)}`
    )
    .join("\n\n");

  const revClausesList = input.revisedClauses
    .slice(0, 40)
    .map(
      (c) =>
        `[${c.section || c.title || "Provision"}]: ${c.text.substring(0, 350)}`
    )
    .join("\n\n");

  const resolvedRole = input.userRole || "Contract Party";

  const systemPrompt = `You are PactIQ's Senior Version Comparison & Negotiation Intelligence Engine.
You are evaluating a REVISED contract (Version ${input.currentVersionNumber}) against its PREVIOUS version (Version ${input.previousVersionNumber}) for the same ongoing deal.
The user you are advising holds the role of: "${resolvedRole}".

==================================================
CORE PRINCIPLE: CONTINUATION OF THE DEAL
==================================================
This is NOT a standalone contract review. It is a continuation of the same negotiation.
Your task is to:
1. Compare what changed substantively between the two drafts.
2. Evaluate which of the user's PREVIOUS CONCERNS have been addressed, partially addressed, or remain unresolved.
3. Identify any NEW material provisions/risks introduced in the revised contract.
4. Summarize THE DEAL AS IT STANDS based ONLY on the revised contract.
5. Provide PactIQ's executive take on the current state of the negotiation.

==================================================
RULES & GUIDELINES:
==================================================
1. DIRECT SECOND-PERSON ("YOU" / "YOUR"):
   - Always speak directly to the user as "you" and "your".
   - ❌ Never write in the third person (e.g. "The creator gets paid", "The influencer must deliver").
   - ✅ Write: "Ensures you receive payment...", "Limits your revision obligations...", "You grant...".

2. SUBSTANTIVE & GROUNDED CHANGES ONLY:
   - Focus only on material commercial and legal changes (Compensation, Deliverables, Usage Rights, Exclusivity, Termination, Revisions, Liability, Indemnity, etc.).
   - Ignore formatting, whitespace, typography, or renumbering that does not change legal meaning.
   - Ground every finding in the provided clause samples. Do not invent clause numbers or facts.

3. CLASSIFY PREVIOUS ISSUES RIGOROUSLY:
   - "addressed": The revised contract meaningfully resolves the previous concern (e.g., usage rights reduced from perpetual to 6 months).
   - "partially_addressed": The revised contract improves the position, but meaningful risk or excessive scope remains for you (e.g., exclusivity reduced from 12 to 6 months, but competitor list remains industry-wide).
   - "unresolved": The concern remains substantially unchanged or ignored.

4. IDENTIFY GENUINELY NEW ISSUES:
   - Surface newly added obligations, restrictions, or terms ONLY if they were genuinely introduced in Version ${input.currentVersionNumber} and did not exist in Version ${input.previousVersionNumber}.
   - CRITICAL: If no new material provisions were added in this revision, return an empty array [] for "newIssues". NEVER fabricate or imagine new clauses.

5. "DEAL AS IT STANDS" (CURRENT-STATE SUMMARY):
   - Summarize the current contractual terms based SOLELY on the actual text in Version ${input.currentVersionNumber}.
   - Distinguish specific, quantified deliverables (e.g. 12 core screens, component library, 2 rounds of review, Figma files) from general scope-of-services descriptions. Preserve the specific deliverables accurately without substituting broad generic summaries.
   - Write clear, concise, plain-English summaries for each deal parameter based on the provided revised clauses.

6. STRICT GROUNDING & ZERO FABRICATION (MANDATORY):
   - NEVER invent or fabricate section numbers, clause numbers, or provision text.
   - NEVER copy mock example values. Every cited clause number, before/after quote, and term MUST exist in the provided clauses below.
   - Output clean plain text without markdown asterisks (**bold**, *italic*), hashtags (#), or backticks.

==================================================
RESPONSE SCHEMA (JSON ONLY):
==================================================
Return ONLY a valid JSON object matching this schema:
{
  "overviewSummary": "A concise 1-2 sentence overview of what Version ${input.currentVersionNumber} changed and what remains to negotiate.",
  "pactiqTake": "PactIQ executive assessment of the current negotiation stance and the most important remaining priority.",
  "summaryCounts": {
    "totalChanges": 0,
    "addressedCount": 0,
    "partiallyAddressedCount": 0,
    "unresolvedCount": 0,
    "newProvisionsCount": 0
  },
  "previousConcerns": [
    {
      "id": "pc1",
      "title": "Title of previous concern",
      "category": "payment | deliverables | content_rights | exclusivity | termination | liability | general",
      "status": "addressed | partially_addressed | unresolved",
      "previousConcern": "What was identified in the previous review",
      "previousRecommendation": "What was previously asked for or recommended",
      "revisedTerm": "What the revised agreement actually says now based on the provided clauses",
      "substantiveExplanation": "Plain-English explanation of why this is addressed, partially addressed, or unresolved",
      "sourceRef": "Exact section heading or number from document text"
    }
  ],
  "whatChanged": [
    {
      "id": "wc1",
      "title": "Title of modified provision",
      "category": "payment | deliverables | content_rights | exclusivity | termination | liability | general",
      "beforeText": "Exact text quote or summary from previous version",
      "afterText": "Exact text quote or summary from current revised version",
      "whyItMatters": "Practical and commercial impact on you",
      "originalClauseRef": "Exact section heading or number in previous version",
      "revisedClauseRef": "Exact section heading or number in revised version"
    }
  ],
  "newIssues": [
    // Return empty array [] if no new material terms were added
  ],
  "dealAsItStands": {
    "compensation": "Current compensation amount and currency from revised draft",
    "paymentSchedule": "Current payment milestones and timing from revised draft",
    "deliverables": "Current content deliverables and campaign scope from revised draft",
    "usageRights": "Current license scope and duration from revised draft",
    "ipOwnership": "Current copyright and IP terms from revised draft",
    "exclusivity": "Current exclusivity lockout scope and duration from revised draft",
    "termAndTermination": "Current contract term and cancellation terms from revised draft",
    "revisions": "Current revision round limit and approval process from revised draft"
  }
}`;

  const userPrompt = `Contract Type: ${input.contractType}
User Role: ${input.userRole || "Contract Party"}
User Priorities: ${input.userPriorities?.join(", ") || "Commercial rights and payment protection"}

=== PREVIOUS FINDINGS & NEGOTIATIONS (Version ${input.previousVersionNumber}) ===
${previousFindingsSummary || "No previous high-priority issues were recorded."}

=== PREVIOUS VERSION CLAUSES (Sample) ===
${prevClausesList}

=== REVISED VERSION CLAUSES (Sample) ===
${revClausesList}`;

  try {
    const rawResult = await callLLM({
      systemPrompt,
      userPrompt,
      responseFormat: "json",
      temperature: 0.15,
    });

    const parsed = comparisonSchema.parse(JSON.parse(rawResult));

    // Map backwards-compatible change items for legacy views
    const legacyChanges: VersionChangeItem[] = [
      ...parsed.previousConcerns.map((pc) => ({
        id: pc.id,
        category: pc.category,
        title: stripMarkdown(pc.title),
        status: (pc.status === "addressed"
          ? "accepted"
          : pc.status === "partially_addressed"
          ? "partially_accepted"
          : "unchanged") as VersionChangeItem["status"],
        statusLabel:
          pc.status === "addressed"
            ? "Requested Change Addressed"
            : pc.status === "partially_addressed"
            ? "Partially Addressed"
            : "Issue Remains Unresolved",
        originalClauseRef: pc.sourceRef,
        originalText: stripMarkdown(pc.previousConcern),
        revisedClauseRef: pc.sourceRef,
        revisedText: stripMarkdown(pc.revisedTerm),
        whatChanged: stripMarkdown(pc.substantiveExplanation),
        whyItMatters: stripMarkdown(pc.substantiveExplanation),
        previousNegotiationSnippet: stripMarkdown(pc.previousRecommendation),
        actionRecommendation:
          pc.status === "addressed"
            ? "Resolved. No further negotiation needed on this point."
            : "Review remaining scope and decide whether to send a final counter.",
        severity: (pc.status === "unresolved" ? "high" : "understand") as VersionChangeItem["severity"],
      })),
      ...parsed.newIssues.map((ni) => ({
        id: ni.id,
        category: ni.category,
        title: stripMarkdown(ni.title),
        status: "new_provision" as const,
        statusLabel: "New Material Provision Added",
        revisedClauseRef: ni.revisedClauseRef,
        revisedText: stripMarkdown(ni.description),
        whatChanged: stripMarkdown(ni.description),
        whyItMatters: stripMarkdown(ni.whyItMatters),
        actionRecommendation: "Evaluate whether this newly added provision affects your rights.",
        severity: ni.severity,
      })),
    ];

    const addressedCount = parsed.summaryCounts.addressedCount || parsed.previousConcerns.filter((c) => c.status === "addressed").length;
    const partiallyAddressedCount = parsed.summaryCounts.partiallyAddressedCount || parsed.previousConcerns.filter((c) => c.status === "partially_addressed").length;
    const unresolvedCount = parsed.summaryCounts.unresolvedCount || parsed.previousConcerns.filter((c) => c.status === "unresolved").length;
    const newProvisionsCount = parsed.summaryCounts.newProvisionsCount || parsed.newIssues.length;
    const totalChanges = parsed.summaryCounts.totalChanges || (addressedCount + partiallyAddressedCount + unresolvedCount + newProvisionsCount);

    return {
      previousVersionNumber: input.previousVersionNumber,
      currentVersionNumber: input.currentVersionNumber,
      overviewSummary: stripMarkdown(parsed.overviewSummary),
      pactiqTake: stripMarkdown(parsed.pactiqTake),
      summaryCounts: {
        totalChanges,
        addressedCount,
        partiallyAddressedCount,
        unresolvedCount,
        newProvisionsCount,
        acceptedCount: addressedCount,
        unchangedCount: unresolvedCount,
        removedProvisionsCount: 0,
      },
      previousConcerns: parsed.previousConcerns.map((pc) => ({
        ...pc,
        title: stripMarkdown(pc.title),
        previousConcern: stripMarkdown(pc.previousConcern),
        previousRecommendation: stripMarkdown(pc.previousRecommendation),
        revisedTerm: stripMarkdown(pc.revisedTerm),
        substantiveExplanation: stripMarkdown(pc.substantiveExplanation),
        sourceRef: pc.sourceRef ? stripMarkdown(pc.sourceRef) : undefined,
      })),
      whatChanged: parsed.whatChanged.map((wc) => ({
        ...wc,
        title: stripMarkdown(wc.title),
        beforeText: stripMarkdown(wc.beforeText),
        afterText: stripMarkdown(wc.afterText),
        whyItMatters: stripMarkdown(wc.whyItMatters),
        originalClauseRef: wc.originalClauseRef ? stripMarkdown(wc.originalClauseRef) : undefined,
        revisedClauseRef: wc.revisedClauseRef ? stripMarkdown(wc.revisedClauseRef) : undefined,
      })),
      newIssues: parsed.newIssues.map((ni) => ({
        ...ni,
        title: stripMarkdown(ni.title),
        description: stripMarkdown(ni.description),
        whyItMatters: stripMarkdown(ni.whyItMatters),
        revisedClauseRef: ni.revisedClauseRef ? stripMarkdown(ni.revisedClauseRef) : undefined,
      })),
      dealAsItStands: {
        compensation: stripMarkdown(parsed.dealAsItStands.compensation),
        paymentSchedule: stripMarkdown(parsed.dealAsItStands.paymentSchedule),
        deliverables: stripMarkdown(parsed.dealAsItStands.deliverables),
        usageRights: stripMarkdown(parsed.dealAsItStands.usageRights),
        ipOwnership: stripMarkdown(parsed.dealAsItStands.ipOwnership),
        exclusivity: stripMarkdown(parsed.dealAsItStands.exclusivity),
        termAndTermination: stripMarkdown(parsed.dealAsItStands.termAndTermination),
        revisions: stripMarkdown(parsed.dealAsItStands.revisions),
        keyRestrictions: parsed.dealAsItStands.keyRestrictions ? stripMarkdown(parsed.dealAsItStands.keyRestrictions) : undefined,
        otherObligations: parsed.dealAsItStands.otherObligations ? stripMarkdown(parsed.dealAsItStands.otherObligations) : undefined,
      },
      changes: legacyChanges,
    };
  } catch (error: unknown) {
    console.error("Failed to execute contract version comparison:", error);

    // Grounded fallback comparison based on previous findings & revised clauses
    const fallbackConcerns: PreviousConcernEvolution[] = input.previousFindings
      .filter((f) => f.severity === "high" || f.severity === "worth_reviewing")
      .slice(0, 6)
      .map((f, i) => {
        const clauseRef =
          f.clause?.section ||
          f.clause?.title ||
          f.title;
        return {
          id: `fallback-${i + 1}`,
          title: stripMarkdown(f.title),
          category: f.category,
          status: "unresolved" as ConcernStatus,
          previousConcern: stripMarkdown(f.whatItSays),
          previousRecommendation: stripMarkdown(f.whatToConsider),
          revisedTerm: "This provision was identified in your previous review. Review the revised draft to verify whether the counterparty made adjustments.",
          substantiveExplanation: "This issue was previously flagged for negotiation. Review the current wording in the revised draft to determine if your concern was satisfied.",
          sourceRef: clauseRef,
        };
      });

    const fallbackWhatChanged: SubstantiveChangeItem[] = fallbackConcerns.map((fc, i) => ({
      id: `wc-fallback-${i + 1}`,
      title: fc.title,
      category: fc.category,
      beforeText: fc.previousConcern,
      afterText: fc.revisedTerm,
      whyItMatters: fc.substantiveExplanation,
      originalClauseRef: fc.sourceRef,
      revisedClauseRef: fc.sourceRef,
    }));

    const dealSnapshot = extractDealSnapshotFromClauses(input.revisedClauses);

    return {
      previousVersionNumber: input.previousVersionNumber,
      currentVersionNumber: input.currentVersionNumber,
      overviewSummary: `PactIQ reviewed Version ${input.currentVersionNumber} against Version ${input.previousVersionNumber}. Examine the updated terms, previous concerns, and current commercial position below.`,
      pactiqTake: `Overall, Version ${input.currentVersionNumber} represents the latest negotiation stage of your agreement. Compare the terms below and prepare your next negotiation counter-offer.`,
      summaryCounts: {
        totalChanges: fallbackConcerns.length,
        addressedCount: 0,
        partiallyAddressedCount: 0,
        unresolvedCount: fallbackConcerns.length,
        newProvisionsCount: 0,
        acceptedCount: 0,
        unchangedCount: fallbackConcerns.length,
        removedProvisionsCount: 0,
      },
      previousConcerns: fallbackConcerns,
      whatChanged: fallbackWhatChanged,
      newIssues: [],
      dealAsItStands: dealSnapshot,
      changes: fallbackConcerns.map((fc) => ({
        id: fc.id,
        category: fc.category,
        title: fc.title,
        status: "unchanged" as const,
        statusLabel: "Issue Requires Verification",
        originalClauseRef: fc.sourceRef,
        originalText: fc.previousConcern,
        revisedClauseRef: fc.sourceRef,
        whatChanged: fc.substantiveExplanation,
        whyItMatters: fc.substantiveExplanation,
        actionRecommendation: "Check whether counterparty modified this term.",
        severity: "worth_reviewing" as const,
      })),
    };
  }
}
