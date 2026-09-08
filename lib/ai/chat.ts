import { callLLM, ChatMessage } from "./provider";

export interface ChatFocusContext {
  type: "deal" | "finding" | "clause";
  findingId?: string;
  clauseId?: string;
  label?: string;
}

export interface ChatContractContext {
  filename: string;
  contractType: string;
  userRole: string;
  userPriorities: string[];
  dealSnapshot?: Array<{ label: string; value: string }>;
  findings: Array<{
    id: string;
    title: string;
    category: string;
    severity: string;
    whatItSays: string;
    whatItMeans: string;
    whatToConsider: string;
    suggestedRewrite?: string | null;
    emailSnippet?: string | null;
    isCrossClause?: boolean;
    clause: {
      id: string;
      section: string | null;
      title: string | null;
      text: string;
      pageNumber: number | null;
      position: number;
    };
  }>;
  clauses: Array<{
    id: string;
    section: string | null;
    title: string | null;
    text: string;
    pageNumber: number | null;
    position: number;
  }>;
}

export interface ChatSourceCitation {
  sectionOrTitle: string;
  quoteSnippet: string;
}

export interface ChatNegotiationAction {
  title: string;
  draftEmail: string;
  replacementClause?: string;
}

export interface ChatResponsePayload {
  answer: string;
  sources: ChatSourceCitation[];
  suggestedFollowUps: string[];
  negotiationAction?: ChatNegotiationAction | null;
}

export async function askDealIQChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  contractContext: ChatContractContext,
  focusContext?: ChatFocusContext
): Promise<ChatResponsePayload> {
  const { filename, contractType, userRole, userPriorities, dealSnapshot, findings, clauses } =
    contractContext;

  // Build focused context depending on level
  let focusSectionPrompt = "";
  if (focusContext?.type === "finding" && focusContext.findingId) {
    const focusedFinding = findings.find((f) => f.id === focusContext.findingId);
    if (focusedFinding) {
      focusSectionPrompt = `
=== CURRENT FOCUS: SPECIFIC FINDING ===
Title: ${focusedFinding.title}
Category: ${focusedFinding.category}
Severity: ${focusedFinding.severity}
What it says: ${focusedFinding.whatItSays}
What it means: ${focusedFinding.whatItMeans}
What to consider: ${focusedFinding.whatToConsider}
Existing Suggested Replacement: ${focusedFinding.suggestedRewrite || "None"}
Existing Email Snippet: ${focusedFinding.emailSnippet || "None"}
Source Clause: ${focusedFinding.clause.section || focusedFinding.clause.title || `Clause #${focusedFinding.clause.position + 1}`} (Page ${focusedFinding.clause.pageNumber || "N/A"})
Source Text: """${focusedFinding.clause.text}"""
`;
    }
  } else if (focusContext?.type === "clause" && focusContext.clauseId) {
    const focusedClause = clauses.find((c) => c.id === focusContext.clauseId);
    if (focusedClause) {
      focusSectionPrompt = `
=== CURRENT FOCUS: SPECIFIC CLAUSE ===
Section / Title: ${focusedClause.section || focusedClause.title || `Clause #${focusedClause.position + 1}`}
Page Number: ${focusedClause.pageNumber || "N/A"}
Full Clause Text:
"""${focusedClause.text}"""
`;
    }
  }

  // Findings summary
  const findingsSummary = findings
    .map(
      (f, idx) =>
        `Finding ${idx + 1} [${f.severity.toUpperCase()}] "${f.title}" (${f.category}): Says: "${f.whatItSays}" | Means: "${f.whatItMeans}" | Consider: "${f.whatToConsider}" | Clause: ${f.clause.section || f.clause.title || `Clause #${f.clause.position + 1}`}`
    )
    .join("\n");

  // Key clauses index (truncate if massive, but include all sections)
  const clausesIndex = clauses
    .map(
      (c) =>
        `[ID: ${c.id}] ${c.section || c.title || `Clause #${c.position + 1}`} (Page ${c.pageNumber || "N/A"}): ${c.text.length > 250 ? c.text.slice(0, 250) + "..." : c.text}`
    )
    .join("\n");

  // Deal snapshot
  const snapshotText = dealSnapshot
    ? dealSnapshot.map((s) => `- ${s.label}: ${s.value}`).join("\n")
    : "N/A";

  const systemPrompt = `You are "Ask DealIQ", the intelligent, context-aware contract assistant for DealIQ.
Your role is to help the user understand their contract, assess risks, clarify legal terms in plain English, and prepare actionable negotiation strategies.

=== CONTRACT REVIEW METADATA ===
- File: ${filename}
- Confirmed Contract Type: ${contractType || "General Commercial Agreement"}
- User Role: ${userRole || "Independent Professional"}
- User Priorities: ${userPriorities.length > 0 ? userPriorities.join(", ") : "All key terms"}

=== DEAL SNAPSHOT ===
${snapshotText}

=== DEALIQ FINDINGS (${findings.length} total) ===
${findingsSummary}

=== CONTRACT CLAUSES SUMMARY ===
${clausesIndex}

${focusSectionPrompt}

=== CORE INSTRUCTIONS ===
1. GROUNDED FACTUALITY: Only state factual terms that are present in the provided contract text and DealIQ findings. NEVER fabricate, guess, or hallucinate terms, amounts, dates, or obligations.
2. MISSING TERMS: If the user asks about a term (e.g. "Is there a kill fee?", "Does it mention AI rights?") and the contract does NOT have it, state clearly that no such term is found in the agreement.
3. SCANNABLE FORMATTING: Use clean markdown with short paragraphs, bullet points, bold key concepts, and structured headers where helpful. Avoid walls of unbroken text.
4. MOVE FROM EXPLANATION TO ACTION: When addressing a concern or negotiation question, guide the user through:
   - What the contract currently says and means
   - Why it matters / the practical trade-off
   - What reasonable counter-position or alternative they could ask for
5. NEGOTIATION ACTIONS: If the user is asking how to negotiate, push back, or change a clause, include a structured "negotiationAction" with a professional, balanced, polite email draft and optional replacement clause wording.
6. SOURCE CITATIONS: Whenever citing a specific term, include the exact section name/title and a short verbatim quote in "sources".
7. FOLLOW-UP QUESTIONS: Provide 2 to 4 contextual, high-value suggested follow-up questions in "suggestedFollowUps" tailored to the exact conversation context.

=== RESPONSE FORMAT ===
You MUST return ONLY a valid JSON object matching this schema:
{
  "answer": "Clear, formatted markdown response explaining the answer to the user.",
  "sources": [
    {
      "sectionOrTitle": "Section name or Clause title",
      "quoteSnippet": "Exact verbatim quote from the contract"
    }
  ],
  "suggestedFollowUps": [
    "Contextual follow-up question 1",
    "Contextual follow-up question 2",
    "Contextual follow-up question 3"
  ],
  "negotiationAction": {
    "title": "Short title of the proposed change",
    "draftEmail": "Polite, professional email draft ready to send",
    "replacementClause": "Optional proposed replacement contract wording"
  } // or null if no specific negotiation draft is relevant
}`;

  const conversationMessages: ChatMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const rawResult = await callLLM({
      systemPrompt,
      messages: conversationMessages,
      responseFormat: "json",
      temperature: 0.2,
    });

    const parsed = JSON.parse(rawResult) as ChatResponsePayload;
    return {
      answer: parsed.answer || "I have reviewed your contract regarding this question.",
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      suggestedFollowUps: Array.isArray(parsed.suggestedFollowUps)
        ? parsed.suggestedFollowUps
        : [
            "What are the biggest risks here?",
            "What should I negotiate?",
            "What am I giving the other party?",
          ],
      negotiationAction: parsed.negotiationAction || null,
    };
  } catch (error) {
    console.error("Ask DealIQ chat error:", error);
    // Fallback response if parsing fails
    return {
      answer:
        "I reviewed your contract and findings. Could you clarify your question or specify which clause you would like to discuss?",
      sources: [],
      suggestedFollowUps: [
        "What are the 3 biggest risks in this contract?",
        "What am I getting vs giving?",
        "What is missing from this contract?",
      ],
      negotiationAction: null,
    };
  }
}
