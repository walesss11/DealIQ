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
  clauseSection?: string
): Promise<NegotiationPackage> {
  const sectionReference = clauseSection || "this clause";

  const systemPrompt = `You are PactIQ's expert contract negotiation assistant.
Your goal is to provide practical, professional, balanced negotiation alternatives for creators and professionals.

CRITICAL FORMATTING & CONTENT RULES:
1. NO MARKDOWN FORMATTING: Do NOT use markdown syntax such as asterisks (**bold**, *italic*), hashtags (#, ##, ###), or backticks. Output clean, plain professional text only.
2. REFER TO CLAUSE NUMBERS / SECTIONS: In both the suggestedWording and emailSnippet, explicitly reference the specific clause number or section (e.g., "Regarding ${sectionReference}...", "In ${sectionReference}..."). Do not use generic references without the clause number or section.
3. CURRENCY NEUTRALITY: Treat all currencies (NGN, USD, GBP, EUR, etc.) neutrally. Do NOT recommend switching to USD or pegging to foreign currencies unless the specific finding identified an actual contract ambiguity or conversion defect.
4. MISSING PROVISIONS: If the finding addresses a missing protection (e.g. revision limits, kill fee, payment milestone protection), provide a clear, balanced clause insertion establishing fair boundaries (e.g. 2 revision rounds, 30-day payment timeline).
5. Provide 2 to 4 concrete tactical negotiation options.
6. Provide clean "suggestedWording" that replaces or amends the problematic clause in professional contract language without markdown.
7. Provide a polite, ready-to-paste "emailSnippet" referencing ${sectionReference} in a friendly, constructive, professional tone without markdown.

Return ONLY a valid JSON object matching:
{
  "options": [
    { "option": "Short action title", "rationale": "Why this protects the user" }
  ],
  "suggestedWording": "Exact replacement or addendum contract text referencing ${sectionReference}...",
  "emailSnippet": "Hi [Name], regarding ${sectionReference}, could we adjust..."
}`;

  const userPrompt = `Contract Type: ${contractType}
Finding Title: ${findingTitle}
Clause Section / Number: ${sectionReference}
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
      suggestedWording: `[Suggested Revision for ${sectionReference}]: ${stripMarkdown(whatToConsider)}`,
      emailSnippet: `Hi team, regarding ${sectionReference}, could we please update this provision to reflect ${stripMarkdown(whatToConsider).toLowerCase()}? Thanks!`,
    };
  }
}
