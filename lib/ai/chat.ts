import { callLLM, ChatMessage } from "./provider";
import { stripMarkdown } from "./generate-negotiation";

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
  versionNumber?: number;
  totalVersions?: number;
  comparisonSummary?: string;
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

export async function askPactIQChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  contractContext: ChatContractContext,
  focusContext?: ChatFocusContext
): Promise<ChatResponsePayload> {
  const {
    filename,
    contractType,
    userRole,
    userPriorities,
    versionNumber,
    totalVersions,
    comparisonSummary,
    dealSnapshot,
    findings,
    clauses,
  } = contractContext;

  // Robust resolution for focused finding, clause, or deal term
  let focusSectionPrompt = "";
  let focusContextHeading = "";

  if (focusContext?.type === "finding") {
    const focusedFinding = findings.find(
      (f) =>
        (focusContext.findingId && f.id === focusContext.findingId) ||
        (focusContext.label && (f.title.toLowerCase() === focusContext.label.toLowerCase() || f.title.toLowerCase().includes(focusContext.label.toLowerCase()) || focusContext.label.toLowerCase().includes(f.title.toLowerCase())))
    );

    if (focusedFinding) {
      focusContextHeading = `Finding: "${focusedFinding.title}"`;
      focusSectionPrompt = `
==================================================
🎯 ACTIVE FOCUS: SPECIFIC REVIEW FINDING
==================================================
The user is currently examining this specific finding:
- Finding Title: ${focusedFinding.title}
- Category: ${focusedFinding.category} (Severity: ${focusedFinding.severity.toUpperCase()})
- What the Contract Says: ${focusedFinding.whatItSays}
- Practical Meaning for You: ${focusedFinding.whatItMeans}
- Recommended Consideration / Strategy: ${focusedFinding.whatToConsider}
- Proposed Replacement Contract Language: ${focusedFinding.suggestedRewrite || "Standard balanced terms"}
- Ready-to-Send Negotiation Snippet: ${focusedFinding.emailSnippet || "N/A"}
- Authoritative Clause Reference: ${focusedFinding.clause?.section || focusedFinding.clause?.title || "Contract Clause"} (Page ${focusedFinding.clause?.pageNumber || "N/A"})
- Verbatim Clause Text from Document:
"""
${focusedFinding.clause?.text || "Text unavailable"}
"""

DIRECTIVE FOR THIS FOCUS:
The user's question directly relates to this specific finding and clause. You MUST tailor your explanation, practical impact, and negotiation draft specifically to this topic and its verbatim clause text above.
`;
    } else if (focusContext.label) {
      focusContextHeading = `Topic: "${focusContext.label}"`;
      focusSectionPrompt = `
==================================================
🎯 ACTIVE FOCUS: ${focusContext.label.toUpperCase()}
==================================================
The user is currently asking specifically about: "${focusContext.label}".
DIRECTIVE: Center your answer directly around this topic, its contractual consequences, and practical steps to address it.
`;
    }
  } else if (focusContext?.type === "clause") {
    const focusedClause = clauses.find(
      (c) =>
        (focusContext.clauseId && c.id === focusContext.clauseId) ||
        (focusContext.label && (c.section?.toLowerCase().includes(focusContext.label.toLowerCase()) || c.title?.toLowerCase().includes(focusContext.label.toLowerCase())))
    );

    if (focusedClause) {
      focusContextHeading = `Clause: "${focusedClause.section || focusedClause.title || "Selected Clause"}"`;
      focusSectionPrompt = `
==================================================
🎯 ACTIVE FOCUS: SPECIFIC CONTRACT CLAUSE
==================================================
The user is currently examining this specific clause:
- Clause Reference / Title: ${focusedClause.section || focusedClause.title || `Paragraph (Page ${focusedClause.pageNumber || "N/A"})`}
- Page Number: ${focusedClause.pageNumber || "N/A"}
- Full Verbatim Clause Text:
"""
${focusedClause.text}
"""

DIRECTIVE FOR THIS FOCUS:
The user is asking specifically about this clause. Explain what this exact clause requires or permits, its practical risks or advantages for you, and how to reword or negotiate it if necessary.
`;
    }
  } else if (focusContext?.type === "deal" && focusContext.label) {
    const matchedDealTerm = dealSnapshot?.find((s) => s.label.toLowerCase().includes(focusContext.label!.toLowerCase()));
    focusContextHeading = `Deal Parameter: "${focusContext.label}"`;
    focusSectionPrompt = `
==================================================
🎯 ACTIVE FOCUS: DEAL PARAMETER "${focusContext.label.toUpperCase()}"
==================================================
The user is currently asking specifically about the ${focusContext.label} parameter of the deal.
${matchedDealTerm ? `- Current Extracted Summary: "${matchedDealTerm.value}"` : ""}

DIRECTIVE FOR THIS FOCUS:
Focus your explanation directly on this deal parameter, how it affects your position, and key negotiation points for this area.
`;
  }

  // Versioning context
  const versionInfoPrompt =
    totalVersions && totalVersions > 1
      ? `=== DEAL VERSION CONTEXT ===
- Active Document Version: Version ${versionNumber || 1} of ${totalVersions}
${comparisonSummary ? `- Version Comparison & Change Analysis against Previous Version:\n${comparisonSummary}` : "- No comparison summary recorded."}
`
      : "";

  // Findings summary
  const findingsSummary = findings
    .map(
      (f, idx) =>
        `Finding ${idx + 1} [${f.severity.toUpperCase()}] "${f.title}" (${f.category}): Says: "${f.whatItSays}" | Means: "${f.whatItMeans}" | Consider: "${f.whatToConsider}" | Clause: ${f.clause.section || f.clause.title || f.title}`
    )
    .join("\n");

  // Key clauses index (truncate if massive, but include all clauses)
  const clausesIndex = clauses
    .map(
      (c) =>
        `[ID: ${c.id}] ${c.section || c.title || `Paragraph (Page ${c.pageNumber || "N/A"})`} (Page ${c.pageNumber || "N/A"}): ${c.text.length > 250 ? c.text.slice(0, 250) + "..." : c.text}`
    )
    .join("\n");

  // Deal snapshot
  const snapshotText = dealSnapshot
    ? dealSnapshot.map((s) => `- ${s.label}: ${s.value}`).join("\n")
    : "N/A";

  const systemPrompt = `You are "Ask PactIQ", the intelligent, context-aware contract assistant for PactIQ.
Your role is to help the user understand their contract, assess risks, clarify legal terms in plain English, compare contract revisions, and prepare actionable negotiation strategies.

${focusSectionPrompt}

=== CONTRACT REVIEW METADATA ===
- File: ${filename}
- Confirmed Contract Type: ${contractType || "General Commercial Agreement"}
- User Role: ${userRole || "Independent Professional"}
- User Priorities: ${userPriorities.length > 0 ? userPriorities.join(", ") : "All key terms"}

${versionInfoPrompt}
=== DEAL SNAPSHOT ===
${snapshotText}

=== PACTIQ FINDINGS (${findings.length} total) ===
${findingsSummary}

=== CONTRACT CLAUSES SUMMARY ===
${clausesIndex}

=== CORE INSTRUCTIONS ===
1. DIRECT SECOND-PERSON PERSPECTIVE ("YOU" / "YOUR"): Always speak directly to the user in the second person ("you", "your", "you as the ${userRole || "Contract Party"}").
   - ❌ NEVER refer to the user in the third person (e.g. do NOT say "The creator is liable", "The influencer must deliver", "The contractor should ask for").
   - ✅ ALWAYS speak directly to the user: "You could be held liable for...", "Your payment schedule is...", "This requires you to submit...", "You (as the ${userRole || "Contract Party"}) should ask for...".
2. PRIORITIZE THE ACTIVE FOCUS: If an Active Focus is defined above, directly answer the user's question in relation to that focused finding, clause, or term.
3. PLAIN-ENGLISH & NO INTIMIDATING LEGAL JARGON: The user is a creator / business professional, not a lawyer. Translate legal jargon into everyday, conversational explanations (e.g., explain "indemnification" as "covering legal costs for the other party", "perpetual license" as "the brand using your content forever", "uncapped revisions" as "unlimited edits with no extra pay").
4. GROUNDED FACTUALITY: Only state factual terms that are present in the provided contract text and PactIQ findings. NEVER fabricate, guess, or hallucinate terms, amounts, dates, or obligations.
5. CURRENCY-NEUTRAL POLICY: Treat NGN, USD, GBP, EUR, and all currencies completely neutrally. The mere use of NGN or any currency is NOT a risk.
6. MISSING / UNCLEAR PROVISIONS: When the user asks about missing terms or what is omitted, identify only omissions that create a real and meaningful consequence for you in this deal.
7. CLEAN PLAIN TEXT (NO MARKDOWN ASTERISKS OR HASHTAGS): Do NOT use markdown formatting characters such as asterisks (**bold**, *italic*), hashtags (#, ##, ###), or backticks. Write in clean, plain professional text with natural spacing, clean numbers (1., 2., 3.) or hyphens (-).
8. REFER TO CLAUSES: Always explicitly reference the relevant clause number or title (e.g. "Clause 4.1 (Usage Rights)", "Clause 7 (Payment)") when discussing terms or preparing negotiations.
9. MOVE FROM EXPLANATION TO ACTION: When addressing a concern or negotiation question, guide the user through:
   - What the contract currently says and means for you (citing the clause)
   - Why it matters / the practical trade-off for your position in everyday terms
   - What reasonable counter-position or alternative you could ask for
10. NEGOTIATION ACTIONS: If the user is asking how to negotiate, push back, or change a clause, include a structured "negotiationAction" with a professional, balanced, polite email draft written in the FIRST PERSON ("I", "we") addressed directly to the other party (e.g. "Hi [Name], regarding Clause X, could we please adjust...") and optional replacement clause wording referencing the clause number without markdown formatting. Never write advisory instructions inside draftEmail.
11. SOURCE CITATIONS: Whenever citing a specific term, include the exact clause name/title and a short verbatim quote in "sources".
12. FOLLOW-UP QUESTIONS: Provide 2 to 4 contextual, high-value suggested follow-up questions in "suggestedFollowUps" tailored to the exact conversation context.

=== RESPONSE FORMAT ===
You MUST return ONLY a valid JSON object matching this schema:
{
  "answer": "Clean plain-text response explaining the answer to the user without asterisks or hashtags.",
  "sources": [
    {
      "sectionOrTitle": "Clause title or heading",
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
    "draftEmail": "Polite, professional email draft ready to send directly to the counterparty in first person",
    "replacementClause": "Optional proposed replacement contract wording"
  } // or null if no specific negotiation draft is relevant
}`;

  const conversationMessages: ChatMessage[] = messages.map((m, idx) => {
    // For the latest user message, if we have an active focus context, clarify the focus in the prompt
    if (idx === messages.length - 1 && m.role === "user" && focusContextHeading) {
      return {
        role: m.role,
        content: `[Context Focus: ${focusContextHeading}]\n${m.content}`,
      };
    }
    return {
      role: m.role,
      content: m.content,
    };
  });

  try {
    const rawResult = await callLLM({
      systemPrompt,
      messages: conversationMessages,
      responseFormat: "json",
      temperature: 0.2,
    });

    const parsed = JSON.parse(rawResult) as ChatResponsePayload;
    return {
      answer: stripMarkdown(parsed.answer || "I have reviewed your contract regarding this question."),
      sources: Array.isArray(parsed.sources)
        ? parsed.sources.map((s) => ({
            sectionOrTitle: stripMarkdown(s.sectionOrTitle),
            quoteSnippet: stripMarkdown(s.quoteSnippet),
          }))
        : [],
      suggestedFollowUps: Array.isArray(parsed.suggestedFollowUps)
        ? parsed.suggestedFollowUps.map((q) => stripMarkdown(q))
        : [
            "What are the biggest risks here?",
            "What should I negotiate?",
            "What am I giving the other party?",
          ],
      negotiationAction: parsed.negotiationAction
        ? {
            title: stripMarkdown(parsed.negotiationAction.title),
            draftEmail: stripMarkdown(parsed.negotiationAction.draftEmail),
            replacementClause: parsed.negotiationAction.replacementClause
              ? stripMarkdown(parsed.negotiationAction.replacementClause)
              : undefined,
          }
        : null,
    };
  } catch (error) {
    console.error("Ask PactIQ chat error:", error);
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

export const askDealIQChat = askPactIQChat;
