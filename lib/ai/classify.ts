import { callLLM } from "./provider";
import { z } from "zod";

export interface ClassificationResult {
  confirmedContractType: string;
  confidence: number;
  explanation: string;
}

const classificationSchema = z.object({
  confirmedContractType: z.string().min(1),
  confidence: z.number().min(0).max(1),
  explanation: z.string().min(1),
});

export async function classifyContract(
  text: string,
  userRole: string,
  userContractType: string
): Promise<ClassificationResult> {
  const systemPrompt = `You are an expert contract legal analyst and classifier. 
Your job is to analyze the text of an uploaded document and confirm or refine the contract type.
The user claims their role is: "${userRole}" and the contract type is: "${userContractType}".

Analyze the document context and output a JSON object with:
1. "confirmedContractType": The validated contract type. Use standard taxonomy from below.
2. "confidence": A decimal number between 0.0 and 1.0 representing your confidence.
3. "explanation": A 1-2 sentence explanation of why this classification is correct.

Supported Taxonomy Categories:
- Brand Deal
- Sponsorship
- Influencer Agreement
- Content Agreement
- Talent Agreement
- Licensing Agreement
- Freelance Agreement
- Service Agreement
- Consulting Agreement
- Vendor Agreement
- Partnership Agreement
- NDA
- Employment Agreement
- General Contract Review (Use as fallback if none match)

Return ONLY a valid JSON object. No other text.`;

  const userPrompt = `Document Sample (first 4000 characters):
${text.slice(0, 4000)}

Please classify this contract.`;

  try {
    const rawResult = await callLLM({
      systemPrompt,
      userPrompt,
      responseFormat: "json",
      temperature: 0.1,
    });

    return classificationSchema.parse(JSON.parse(rawResult));
  } catch (error: unknown) {
    console.error("Classification error, falling back:", error);
    return {
      confirmedContractType: userContractType || "General Contract Review",
      confidence: 0.5,
      explanation: "Fallback classification due to system error.",
    };
  }
}
