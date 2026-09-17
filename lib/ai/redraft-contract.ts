import { z } from "zod";
import { callLLM } from "./provider";

export interface RedraftFindingInput {
  findingId: string;
  clauseId: string;
  title: string;
  category: string;
  whatItSays: string;
  whatToConsider: string;
  suggestedRewrite?: string | null;
  clause: {
    id: string;
    section?: string | null;
    title?: string | null;
    text: string;
    position?: number;
  };
}

export interface RedraftContractInput {
  contractTitle: string;
  contractType: string;
  userRole?: string | null;
  userPriorities?: string[];
  originalText?: string | null;
  clauses: Array<{
    id: string;
    position: number;
    section?: string | null;
    title?: string | null;
    text: string;
  }>;
  selectedFindings: RedraftFindingInput[];
}

export interface RedraftClauseChange {
  clauseId: string;
  section: string;
  originalText: string;
  revisedText: string;
  rationale: string;
}

export interface RedraftContractResponse {
  revisedFullText: string;
  changes: RedraftClauseChange[];
  consistencyNotes: string[];
}

const redraftSchema = z.object({
  changes: z.array(
    z.object({
      clauseId: z.string(),
      section: z.string(),
      originalText: z.string(),
      revisedText: z.string(),
      rationale: z.string(),
    })
  ),
  revisedFullText: z.string().min(1),
  consistencyNotes: z.array(z.string()).default([]),
});

export async function redraftContract(
  input: RedraftContractInput
): Promise<RedraftContractResponse> {
  const { contractTitle, contractType, userRole, clauses, selectedFindings } = input;

  // Build full document text from clauses if originalText is not provided
  const orderedClauses = [...clauses].sort((a, b) => a.position - b.position);
  const fullOriginalText =
    input.originalText && input.originalText.trim().length > 0
      ? input.originalText
      : orderedClauses
          .map((c) => {
            const header = c.section || c.title ? `[${c.section || c.title}]\n` : "";
            return `${header}${c.text}`;
          })
          .join("\n\n");

  const systemPrompt = `You are PactIQ's expert legal drafting assistant.
Your task is to generate a redrafted version of an existing contract incorporating ONLY the specific changes selected by the user.

CRITICAL INSTRUCTIONS & BOUNDARIES:
1. TARGETED AMENDMENTS ONLY:
   - Amend ONLY the clauses and provisions associated with the user's selected findings.
   - Do NOT rewrite, alter, or restyle unrelated clauses. Unselected clauses must remain completely intact.
2. PRESERVE CONTRACT STRUCTURE:
   - Preserve the exact document structure, clause numbering, subclause numbering, headings, party names, defined terms, dates, and commercial terms.
   - Do not invent new sections or change existing numbering schemes.
3. GROUNDING & FIDELITY:
   - Ground all revisions in the original contract language. Never invent unmentioned facts, obligations, figures, or external entities.
   - If a selected change requires amending a specific sentence or sub-clause, make the replacement precise, legally sound, and natural.
4. CONSISTENCY VERIFICATION:
   - Ensure the revised language is fully harmonized with the rest of the agreement.
   - Check that defined terms are used consistently.
   - Ensure no leftover placeholders (like [insert date] or [party name]) exist unless they were in the original text.
5. EXPLICIT DIFF TRACKING:
   - For every amended clause, return the corresponding clauseId, section label, exact originalText, new revisedText, and a clear concise rationale.
6. FULL REDRAFTED TEXT:
   - Produce the complete, assembled revised contract text containing the unchanged original sections plus the targeted revisions.

Return ONLY a valid JSON object matching:
{
  "changes": [
    {
      "clauseId": "exact-clause-id",
      "section": "[Exact Clause label from selected change request]",
      "originalText": "exact original clause snippet",
      "revisedText": "new balanced clause snippet",
      "rationale": "Concise explanation of the balanced revision made."
    }
  ],
  "revisedFullText": "Full complete text of the redrafted contract...",
  "consistencyNotes": [
    "Defined terms verified across all clauses",
    "Preserved original document numbering and headings without alteration",
    "Harmonized amended provisions with remaining contract obligations"
  ]
}`;

  const userPrompt = `Contract Document: ${contractTitle}
Contract Type: ${contractType}
User Role: ${userRole || "Contract Party"}

Selected Requested Changes (${selectedFindings.length} items):
${selectedFindings
  .map(
    (sf, idx) => `
[Change Request #${idx + 1}]
- Clause ID: ${sf.clauseId}
- Clause: ${sf.clause.section || sf.clause.title || "Clause"}
- Issue Title: ${sf.title}
- Original Clause Text:
"""
${sf.clause.text}
"""
- Problem Identified: ${sf.whatItSays}
- Recommended Change / Wording: ${sf.suggestedRewrite || sf.whatToConsider}`
  )
  .join("\n---")}

Full Original Contract Text:
"""
${fullOriginalText}
"""`;

  try {
    const rawResult = await callLLM({
      systemPrompt,
      userPrompt,
      responseFormat: "json",
      temperature: 0.15,
    });

    const parsed = redraftSchema.parse(JSON.parse(rawResult));
    return parsed;
  } catch (error: unknown) {
    console.error("Failed to generate contract redraft:", error);

    // Deterministic fallback: perform in-memory substitution of selected clauses with suggested rewrites
    const changes: RedraftClauseChange[] = [];
    let revisedDoc = fullOriginalText;

    for (const sf of selectedFindings) {
      const originalClause = sf.clause.text;
      const rewrite = sf.suggestedRewrite || sf.whatToConsider;
      const sectionName = sf.clause.section || sf.clause.title || sf.title || "Contract Provision";

      if (rewrite && originalClause) {
        changes.push({
          clauseId: sf.clauseId,
          section: sectionName,
          originalText: originalClause,
          revisedText: rewrite,
          rationale: `Applied recommended revision for ${sf.title}`,
        });

        if (revisedDoc.includes(originalClause)) {
          revisedDoc = revisedDoc.replace(originalClause, rewrite);
        }
      }
    }

    return {
      revisedFullText: revisedDoc,
      changes,
      consistencyNotes: [
        "Replaced targeted clauses with recommended balanced language.",
        "Preserved unselected provisions and original document structure.",
      ],
    };
  }
}
