import { z } from "zod";

import { callLLM } from "./provider";

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

const validationSchema = z.object({
  isValid: z.boolean(),
  reason: z.string().optional(),
});

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function validateSource(
  extractedDocument: string,
  clauseText: string,
  findingWhatItSays: string,
  findingTitle: string
): Promise<ValidationResult> {
  const normalizedClause = normalize(clauseText);
  const normalizedDocument = normalize(extractedDocument);

  if (!normalizedClause) {
    return { isValid: false, reason: "The cited clause is empty." };
  }
  if (!normalizedDocument.includes(normalizedClause)) {
    return {
      isValid: false,
      reason: "The cited clause could not be matched to the extracted document.",
    };
  }

  const systemPrompt = `You are DealIQ's fail-closed source validator. Decide whether the cited contract clause fully supports the factual claim. Reject changed amounts, dates, durations, parties, rights, obligations, or unsupported implications. Return only JSON: {"isValid": boolean, "reason": string}.`;
  const userPrompt = `Cited clause:\n${clauseText}\n\nFinding title: ${findingTitle}\nFactual claim:\n${findingWhatItSays}`;

  try {
    const rawResult = await callLLM({
      systemPrompt,
      userPrompt,
      responseFormat: "json",
      temperature: 0,
    });
    const parsed = validationSchema.parse(JSON.parse(rawResult));
    return {
      isValid: parsed.isValid,
      reason: parsed.isValid ? undefined : parsed.reason || "The clause does not support the claim.",
    };
  } catch (error: unknown) {
    console.error("Source validation failed closed:", error);
    return { isValid: false, reason: "The source validation service could not verify this finding." };
  }
}
