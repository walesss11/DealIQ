import { z } from "zod";
import { callLLM } from "./provider";

export interface FullNegotiationInput {
  filename: string;
  contractType: string;
  userRole?: string | null;
  userPriorities?: string[];
  dealTerms?: Array<{ label: string; value: string }>;
  missingProvisions?: Array<{
    title: string;
    whyItMatters: string;
    suggestedClause: string;
    negotiationSnippet: string;
  }>;
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
Your task is to synthesize the legal findings and risks identified across an agreement into ONE coherent, natural, role-adapted, professional negotiation email ready to be sent directly to the counterparty (the brand, client, employer, or other contracting party).

CRITICAL PERSPECTIVE & VOICE RULES:
1. MUST ADDRESS THE OTHER PARTY (FIRST-PERSON EMAIL):
   - The email is written by the user ("I", "my", "we", "our") and addressed directly to the other party / counterparty ("you", "your team").
   - NEVER write advisory notes, internal coaching, or third-person instructions to the user.
   - ABSOLUTELY FORBIDDEN PHRASES in bullet points:
     ❌ DO NOT WRITE: "Introduce a cap on..."
     ❌ DO NOT WRITE: "Negotiate for..."
     ❌ DO NOT WRITE: "Negotiate to include..."
     ❌ DO NOT WRITE: "The creator should ask for..."
     ❌ DO NOT WRITE: "Consider requesting..."
     ❌ DO NOT WRITE: "Request a shorter payment window..."
   - INSTEAD, write the ACTUAL PROPOSAL or polite request speaking directly to the other party using the EXACT clause reference from the findings:
     ✔️ "[Exact Clause Ref from findings]: Could we please adjust this provision to [specific fair term]..."

2. NO MARKDOWN FORMATTING: Absolutely DO NOT use markdown syntax such as asterisks (**bold**, *italic*), hashtags (#, ##, ###), or backticks in the subject or message. Write in clean, plain professional email text only.

3. STRICT GROUNDING ON CLAUSE CITATIONS:
   - When citing clauses in each numbered point of the email, ONLY cite the exact clause references/section names provided in the "Findings with Clause Citations" list below.
   - NEVER invent, hallucinate, or fabricate clause numbers, section numbers, or article numbers that are not explicitly provided in the findings below.

4. CONSOLIDATE AND SYNTHESIZE: Consolidate closely related issues (e.g. combining multiple IP/usage terms into a single discussion point with their respective section numbers).

5. USE SIMPLE, CLEAR, NATURAL LANGUAGE (THE "EXPLAIN IT TO ME" TEST):
   - Write cleanly and directly. Avoid unnecessary legal jargon, academic terms, and buzzwords.
   - Maintain legal accuracy and exact numerical precision (specific amounts, days, deadlines, milestones).
   - Tone: Clear, calm, direct, professional, approachable, and constructive.

6. ROLE ADAPTATION: Adapt the perspective to the user's role (${input.userRole || "Contract Party"}) and contract type (${input.contractType}):
   - Creator negotiating with a brand: collaborative, creative, professional, clear on scope & usage boundaries.
   - Freelancer/Consultant negotiating with a client: professional, scope-focused, balanced on payment & liability.
   - Small business / Vendor: commercial, risk-conscious, professional partnership tone.
   - Employee: constructive, respectful, focused on standard alignment.

6. RESPECTFUL, COLLABORATIVE & CONCISE: Maintain a constructive, win-win partnership tone that protects the user's rights while showing enthusiasm for working together.

7. EMAIL STRUCTURE:
   - Subject line: Clear, professional reference (e.g. "Re: [Contract Title] - Review and Discussion Points")
   - Greeting: "Hi [Name],"
   - Opening: Express appreciation for sending over the agreement and excitement about working together.
   - Numbered points: Each point referencing its specific Clause / Section number (strictly matching the provided findings), clearly stating what adjustment is proposed to the other party and the collaborative reason why.
   - Closing: Constructive invitation to discuss or confirm the adjustments.
   - Sign-off: "Best regards,\n[Your Name]"

8. CURRENCY NEUTRALITY: Treat all currencies (NGN, USD, GBP, EUR, etc.) neutrally. Do NOT suggest changing NGN to USD, pegging to USD, or adding FX adjustments in the negotiation message unless an actual currency ambiguity or conversion defect was explicitly identified in the findings.

Return ONLY a valid JSON object matching:
{
  "subject": "Re: [Contract Title] - Review and Discussion Points",
  "message": "Hi [Name],\n\nThanks for sending over the agreement. I have reviewed the terms and I am very excited about working together.\n\nBefore we finalize and sign, there are a few specific sections I would like to adjust to make sure we are fully aligned:\n\n1. [Clause Ref from findings]: [Proposed adjustment and collaborative rationale]\n\n2. [Clause Ref from findings]: [Proposed adjustment and collaborative rationale]\n\nI believe these adjustments keep our agreement well-balanced and protect both of our interests throughout the project.\n\nPlease let me know if these work for you, or if you would like to discuss any of these items over a brief call.\n\nBest regards,\n[Your Name]",
  "keyPointsIncluded": ["[Clause Ref 1]", "[Clause Ref 2]"],
  "omittedPointsSummary": "Omitted minor standard terms to keep negotiation focused."
}`;

  const userPrompt = `Contract Document: ${input.filename}
Contract Type: ${input.contractType}
User Role: ${input.userRole || "Not specified"}
User Priorities: ${input.userPriorities?.join(", ") || "Standard commercial protection"}

Deal Summary:
${input.dealTerms?.map((t) => `- ${t.label}: ${t.value}`).join("\n") || "Standard contract"}

${input.missingProvisions && input.missingProvisions.length > 0
  ? `\n\nImportant Missing Protective Provisions to Propose Adding (${input.missingProvisions.length} safeguards):
${input.missingProvisions
  .map(
    (m, idx) => `Missing Provision #${idx + 1}: ${m.title}
- Why it is needed: ${m.whyItMatters}
- Proposed Addition: ${m.suggestedClause}
- Recommended Note: ${m.negotiationSnippet}`
  )
  .join("\n---\n")}`
  : ""}

Findings with Clause Citations to synthesize (${findingsToProcess.length} issues):
${findingsToProcess
  .map((f, idx) => {
    const clauseRef =
      f.clause?.section ||
      f.clause?.title ||
      f.title;
    return `
Finding #${idx + 1}:
- Clause Reference: ${clauseRef}
- Title: ${f.title}
- Severity: ${f.severity}
- Category: ${f.category}
- What it says: ${f.whatItSays}
- What it means: ${f.whatItMeans}
- Issue to resolve: ${f.whatToConsider}
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

    // High quality plain text fallback converted into direct counterparty proposals
    const points = findingsToProcess.slice(0, 4).map((f, i) => {
      const clauseRef =
        f.clause?.section ||
        f.clause?.title ||
        f.title;

      const cleanedTitle = stripMarkdown(f.title).replace(/^(high|moderate|minor|critical)[\s:-]+/i, "");
      let proposal = stripMarkdown(f.whatToConsider);

      // Convert advisory phrasing into direct counterparty proposals
      proposal = proposal
        .replace(/^Negotiate (to include|for) /i, "Could we include ")
        .replace(/^Negotiate /i, "Could we adjust this to ")
        .replace(/^Introduce /i, "Could we specify ")
        .replace(/^Request /i, "Could we ask for ")
        .replace(/^Ensure /i, "Could we ensure that ")
        .replace(/^Add /i, "Could we add ")
        .replace(/^Cap /i, "Could we cap ")
        .replace(/^Limit /i, "Could we limit ")
        .replace(/^Clarify /i, "Could we clarify ")
        .replace(/^Require /i, "Could we specify ");

      if (!/^(could we|can we|i would like|please|would it be possible)/i.test(proposal)) {
        proposal = `Could we please adjust this provision so that ${proposal.charAt(0).toLowerCase() + proposal.slice(1)}`;
      }

      if (!/[.?!]$/.test(proposal)) {
        proposal += ".";
      }

      return `${i + 1}. ${clauseRef} (${cleanedTitle}): ${proposal}`;
    });

    const fallbackMessage = `Hi [Name],

Thanks for sending over the ${input.filename.replace(/\.[^/.]+$/, "")} agreement. I have reviewed the terms and I am very excited about working together.

Before we finalize and sign, there are a few specific sections I would like to adjust to make sure we are fully aligned:

${points.join("\n\n")}

I believe these adjustments keep our agreement well-balanced and protect both of our interests throughout the project.

Please let me know if these work for you, or if you would like to discuss any of these items over a brief call.

Best regards,
[Your Name]`;

    return {
      subject: `Re: ${input.filename.replace(/\.[^/.]+$/, "")} - Review and Discussion Points`,
      message: fallbackMessage,
      keyPointsIncluded: findingsToProcess.slice(0, 4).map((f) => {
        const clauseRef =
          f.clause?.section ||
          f.clause?.title ||
          f.title;
        return `${clauseRef}: ${stripMarkdown(f.title)}`;
      }),
      omittedPointsSummary:
        findingsToProcess.length > 4
          ? `Consolidated top ${4} points from ${findingsToProcess.length} total findings.`
          : undefined,
    };
  }
}
