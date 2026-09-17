import { z } from "zod";
import { callLLM } from "./provider";

export interface NegotiationOption {
  option: string;
  rationale: string;
}

export interface NegotiationPackage {
  findingTitle: string;
  options: NegotiationOption[];
  suggestedWording: string;
  emailSnippet: string;
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

const negotiationSchema = z.object({
  options: z.array(
    z.object({
      option: z.string().min(1),
      rationale: z.string().min(1),
    })
  ).min(2).max(4),
  suggestedWording: z.string().min(1),
  emailSnippet: z.string().min(1),
});

export async function generateNegotiation(
  findingTitle: string,
  clauseText: string,
  whatItSays: string,
  whatItMeans: string,
  whatToConsider: string,
  contractType: string,
  clauseReferenceInput?: string
): Promise<NegotiationPackage> {
  const clauseReference = clauseReferenceInput || "this clause";

  const systemPrompt = `You are PactIQ's expert contract negotiation strategist.
Your goal is to provide specific, practical, realistic negotiation options, balanced contract rewrites, and ready-to-send counter-proposals for professionals and creators.

CRITICAL FORMATTING & NEGOTIATION RULES:
1. NO MARKDOWN FORMATTING: Do NOT use markdown syntax such as asterisks (**bold**, *italic*), hashtags (#, ##, ###), or backticks. Output clean, plain professional text only.
2. GROUNDED IN THE SPECIFIC PROVISION: Reference the exact clause heading or citation (${clauseReference}). Address the precise contractual mechanism (e.g., acceptance window, payment milestone, revision cap, IP license term, liability cap).
3. PRACTICAL TACTICAL OPTIONS (2 to 4 items):
   - Provide concrete, realistic alternatives for the user's internal strategy.
   - Weak: "Ask for better terms."
   - Strong: "Option 1: Add a 5-business-day deemed acceptance period. Option 2: Tie final milestone to deliverable submission rather than discretionary approval."
4. BALANCED CONTRACT REWRITE ("suggestedWording"):
   - Provide professional, clean replacement contract language that fairly protects the user while remaining reasonable for the counterparty.
   - Use clear, modern drafting language rather than dense archaic legalese.
5. READY-TO-SEND COUNTERPARTY EMAIL ("emailSnippet"):
   - Written in the FIRST PERSON ("I", "my", "we") speaking DIRECTLY to the other party / client ("you", "your team").
   - NEVER write advisory coaching or third-person instructions to the user.
   - USE SIMPLE, PLAIN, PROFESSIONAL LANGUAGE: Clear, calm, approachable, and respectful. Avoid legal jargon or aggressive tone.
   - Example: "Hi [Name], regarding ${clauseReference}, could we please adjust this so that deliverables are deemed accepted within 5 business days of submission? This helps keep project timelines on schedule while ensuring you have ample time to review."

Return ONLY a valid JSON object matching:
{
  "options": [
    { "option": "Specific action proposal", "rationale": "Commercial protection achieved" }
  ],
  "suggestedWording": "Clean balanced contract wording referencing ${clauseReference}...",
  "emailSnippet": "Hi [Name], regarding ${clauseReference}, could we please update this provision to specify..."
} `;

  const userPrompt = `Contract Type: ${contractType}
Finding Title: ${findingTitle}
Clause Reference: ${clauseReference}
Original Clause Text:
"${clauseText}"

What it says: ${whatItSays}
What it means: ${whatItMeans}
Consideration: ${whatToConsider}`;

  try {
    const rawResult = await callLLM({
      systemPrompt,
      userPrompt,
      responseFormat: "json",
      temperature: 0.2,
    });

    const parsed = negotiationSchema.parse(JSON.parse(rawResult));
    return {
      findingTitle: stripMarkdown(findingTitle),
      options: parsed.options.map((opt) => ({
        option: stripMarkdown(opt.option),
        rationale: stripMarkdown(opt.rationale),
      })),
      suggestedWording: stripMarkdown(parsed.suggestedWording),
      emailSnippet: stripMarkdown(parsed.emailSnippet),
    };
  } catch (error: unknown) {
    console.error(`Failed to generate negotiation for ${findingTitle}:`, error);

    let proposal = stripMarkdown(whatToConsider);
    proposal = proposal
      .replace(/^Negotiate (to include|for) /i, "include ")
      .replace(/^Negotiate /i, "adjust this to ")
      .replace(/^Introduce /i, "specify ")
      .replace(/^Request /i, "ask for ")
      .replace(/^Ensure /i, "ensure that ")
      .replace(/^Add /i, "add ");

    return {
      findingTitle: stripMarkdown(findingTitle),
      options: [
        {
          option: "Request mutual terms or reasonable limits",
          rationale: "Aligns risk symmetrically between both parties.",
        },
        {
          option: "Add specific written exceptions",
          rationale: "Clarifies boundaries before work commences.",
        },
      ],
      suggestedWording: `[Suggested Revision for ${clauseReference}]: ${stripMarkdown(whatToConsider)}`,
      emailSnippet: `Hi [Name], regarding ${clauseReference}, could we please update this provision so we can ${proposal.charAt(0).toLowerCase() + proposal.slice(1)}? Thanks!`,
    };
  }
}
