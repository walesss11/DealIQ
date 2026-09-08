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
  contractType: string
): Promise<NegotiationPackage> {
  const systemPrompt = `You are DealIQ's expert contract negotiation assistant.
Your goal is to provide practical, professional, balanced negotiation alternatives for creators and professionals.
Given a contract issue/finding:
1. Provide 2 to 4 concrete negotiation options (e.g., "Cap revisions at 2 rounds", "Add 50% kill fee on cancellation", "Limit exclusivity to direct competitors and 60 days").
2. Provide clean, copyable "suggestedWording" that replaces or amends the problematic clause in professional contract language.
3. Provide a polite, ready-to-paste "emailSnippet" that the creator can send in a response email to the counterparty explaining the requested change in a friendly, constructive tone.

Return ONLY a valid JSON object matching:
{
  "options": [
    { "option": "Short action title", "rationale": "Why this protects the creator" }
  ],
  "suggestedWording": "Exact replacement or addendum contract text...",
  "emailSnippet": "Hi [Name], regarding section X, could we adjust..."
}`;

  const userPrompt = `Contract Type: ${contractType}
Finding Title: ${findingTitle}
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
      findingTitle,
      options: parsed.options,
      suggestedWording: parsed.suggestedWording,
      emailSnippet: parsed.emailSnippet,
    };
  } catch (error: unknown) {
    console.error(`Failed to generate negotiation for ${findingTitle}:`, error);
    return {
      findingTitle,
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
      suggestedWording: `[Suggested Revision]: ${whatToConsider}`,
      emailSnippet: `Hi team, regarding this provision, could we please update it to reflect ${whatToConsider.toLowerCase()}? Thanks!`,
    };
  }
}
