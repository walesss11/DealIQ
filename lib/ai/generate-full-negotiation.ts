import { z } from "zod";
import { callLLM } from "./provider";

export interface FullNegotiationInput {
  filename: string;
  contractType: string;
  userRole?: string | null;
  userPriorities?: string[];
  dealTerms?: Array<{ label: string; value: string }>;
  findings: Array<{
    id: string;
    category: string;
    severity: string;
    title: string;
    whatItSays: string;
    whatItMeans: string;
    whatToConsider: string;
    suggestedRewrite?: string | null;
    emailSnippet?: string | null;
    isCrossClause?: boolean;
    clause?: {
      section?: string | null;
      title?: string | null;
      text?: string;
      position?: number;
    } | null;
  }>;
}

export interface FullNegotiationResponse {
  subject: string;
  message: string;
  keyPointsIncluded: string[];
  omittedPointsSummary?: string;
}

export function stripMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .trim();
}

const fullNegotiationSchema = z.object({
  subject: z.string().min(1),
  message: z.string().min(1),
  keyPointsIncluded: z.array(z.string()),
  omittedPointsSummary: z.string().optional(),
});

export async function generateFullNegotiation(
  input: FullNegotiationInput
): Promise<FullNegotiationResponse> {
  // Filter findings: High and worth_reviewing take precedence; ignore purely informational "no_issue"
  const actionableFindings = input.findings.filter(
    (f) => f.severity === "high" || f.severity === "worth_reviewing"
  );

  const findingsToProcess =
    actionableFindings.length > 0
      ? actionableFindings
      : input.findings.filter((f) => f.severity !== "no_issue");

  const systemPrompt = `You are PactIQ's senior contract negotiation strategist.
Your task is to synthesize the individual legal findings and risks identified across an agreement into ONE coherent, natural, role-adapted, professional negotiation email.

CRITICAL FORMATTING & CONTENT RULES:
1. NO MARKDOWN FORMATTING: Absolutely DO NOT use markdown syntax such as asterisks (**bold**, *italic*), hashtags (#, ##, ###), or backticks in the subject or message. Write in clean, plain professional email text only.
2. REFER TO CLAUSE NUMBERS AND SECTIONS: In each numbered point of the email, explicitly reference the specific clause number or section name (e.g. "1. Section 4 (Usage Rights): ...", "2. Clause 8.2 (Termination): ..."). Do not make generic points without referencing the specific clause number/section from the contract.
3. CONSOLIDATE AND SYNTHESIZE: Consolidate closely related issues (e.g. combining multiple IP/usage terms into a single discussion point with their respective section numbers). Do not simply concatenate separate snippets.
4. TONE & ROLE ADAPTATION: Adapt the tone to the user's role (${input.userRole || "Contract Party"}) and contract type (${input.contractType}):
   - Creator negotiating with a brand: collaborative, creative, professional, clear on scope & usage boundaries.
   - Freelancer/Consultant negotiating with a client: professional, scope-focused, balanced on payment & liability.
   - Small business / Vendor: commercial, risk-conscious, professional partnership tone.
   - Employee: constructive, respectful, focused on standard alignment.
5. RESPECTFUL & CONCISE: Professional, respectful, constructive, concise, clear, and negotiation-oriented.
6. EMAIL STRUCTURE:
   - Subject line: Clear, professional reference (e.g. "Re: [Contract Name] - Review and Discussion Points")
   - Greeting: "Hi [Name],"
   - Opening: Express appreciation for sending over the agreement.
   - Numbered points: Each point referencing its specific Clause / Section number, the practical issue, and the proposed adjustment.
   - Closing: Constructive invitation to discuss.
   - Sign-off: "Best regards,\n[Your Name]"
7. CURRENCY NEUTRALITY: Treat all currencies (NGN, USD, GBP, EUR, etc.) neutrally. Do NOT suggest changing NGN to USD, pegging to USD, or adding FX adjustments in the negotiation message unless an actual currency ambiguity or conversion defect was explicitly identified in the findings.
8. GROUNDING & FIDELITY: Rely strictly on the actual contract issues and sections provided. For missing provisions (e.g. revision limits, kill fee, payment milestone protection), propose clear, balanced contractual additions referencing the relevant section.

Return ONLY a valid JSON object matching:
{
  "subject": "Re: [Contract Title] - Review and Discussion Points",
  "message": "Hi [Name],\\n\\nThanks for sending over...\\n\\n1. Section 3 (Payment Terms): [Point 1]\\n2. Section 7 (IP Rights): [Point 2]...\\n\\nBest regards,\\n[Your Name]",
  "keyPointsIncluded": ["Section 3 (Payment)", "Section 7 (IP Rights)"],
  "omittedPointsSummary": "Omitted minor standard terms to keep negotiation focused."
}`;

  const userPrompt = `Contract Document: ${input.filename}
Contract Type: ${input.contractType}
User Role: ${input.userRole || "Not specified"}
User Priorities: ${input.userPriorities?.join(", ") || "Standard commercial protection"}

Deal Summary:
${input.dealTerms?.map((t) => `- ${t.label}: ${t.value}`).join("\n") || "Standard contract"}

Findings with Clause Citations to synthesize (${findingsToProcess.length} issues):
${findingsToProcess
  .map((f, idx) => {
    const clauseRef =
      f.clause?.section ||
      f.clause?.title ||
      (f.clause?.position !== undefined ? `Clause #${f.clause.position + 1}` : "Clause");
    return `
Finding #${idx + 1}:
- Clause Reference: ${clauseRef}
- Title: ${f.title}
- Severity: ${f.severity}
- Category: ${f.category}
- What it says: ${f.whatItSays}
- What it means: ${f.whatItMeans}
- Actionable suggestion: ${f.whatToConsider}
${f.suggestedRewrite ? `- Proposed wording: ${f.suggestedRewrite}` : ""}`;
  })
  .join("\n---")}`;

  try {
    const rawResult = await callLLM({
      systemPrompt,
      userPrompt,
      responseFormat: "json",
      temperature: 0.25,
    });

    const parsed = fullNegotiationSchema.parse(JSON.parse(rawResult));
    return {
      subject: stripMarkdown(parsed.subject),
      message: stripMarkdown(parsed.message),
      keyPointsIncluded: parsed.keyPointsIncluded.map((p) => stripMarkdown(p)),
      omittedPointsSummary: parsed.omittedPointsSummary
        ? stripMarkdown(parsed.omittedPointsSummary)
        : undefined,
    };
  } catch (error: unknown) {
    console.error("Failed to generate full negotiation message:", error);

    // High quality plain text fallback referencing clause numbers
    const points = findingsToProcess.slice(0, 4).map((f, i) => {
      const clauseRef =
        f.clause?.section ||
        f.clause?.title ||
        (f.clause?.position !== undefined ? `Clause #${f.clause.position + 1}` : `Section ${i + 1}`);
      return `${i + 1}. ${clauseRef} (${stripMarkdown(f.title)}): ${stripMarkdown(f.whatToConsider)}`;
    });

    const fallbackMessage = `Hi [Name],

Thanks for sending over the ${input.filename.replace(/\.[^/.]+$/, "")} agreement. I've reviewed the terms and I'm very excited about working together.

Before we finalize and sign, there are a few specific sections I'd like to adjust to make sure we're fully aligned:

${points.join("\n\n")}

I believe these adjustments keep our agreement well-balanced and protect both of our interests throughout the project.

Please let me know if these work for you, or if you'd like to discuss any of these items over a brief call.

Best regards,
[Your Name]`;

    return {
      subject: `Re: ${input.filename.replace(/\.[^/.]+$/, "")} - Review and Discussion Points`,
      message: fallbackMessage,
      keyPointsIncluded: findingsToProcess.slice(0, 4).map((f) => {
        const clauseRef =
          f.clause?.section ||
          f.clause?.title ||
          (f.clause?.position !== undefined ? `Clause #${f.clause.position + 1}` : "Clause");
        return `${clauseRef}: ${stripMarkdown(f.title)}`;
      }),
      omittedPointsSummary:
        findingsToProcess.length > 4
          ? `Consolidated top ${4} points from ${findingsToProcess.length} total findings.`
          : undefined,
    };
  }
}
