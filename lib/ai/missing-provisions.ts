import { z } from "zod";
import { callLLM } from "./provider";

export interface MissingProvision {
  id: string;
  title: string;
  category: "payment" | "liability" | "scope" | "ip_rights" | "termination" | "governance";
  importance: "critical" | "recommended" | "good_to_have";
  icon: string;
  whatIsMissing: string;
  whyItMatters: string;
  suggestedClause: string;
  negotiationSnippet: string;
}

export interface DetectMissingProvisionsInput {
  extractedText: string;
  contractType?: string;
  userRole?: string | null;
  existingClauseTitles?: string[];
}

const missingProvisionSchema = z.object({
  missingProvisions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      category: z.enum(["payment", "liability", "scope", "ip_rights", "termination", "governance"]),
      importance: z.enum(["critical", "recommended", "good_to_have"]),
      icon: z.string(),
      whatIsMissing: z.string(),
      whyItMatters: z.string(),
      suggestedClause: z.string(),
      negotiationSnippet: z.string(),
    })
  ),
});

/**
 * Intelligent rule-based evaluator for missing protective provisions.
 * Checks the extracted contract text and identified terms to detect omitted safeguards.
 */
export function evaluateMissingProvisionsRules(
  extractedText: string,
  contractType: string = "Commercial Agreement",
  userRole: string = "Contractor"
): MissingProvision[] {
  const text = (extractedText || "").toLowerCase();
  const results: MissingProvision[] = [];
  const resolvedRole = userRole || "Contractor / Service Provider";

  // 1. Check: Deemed Acceptance / Acceptance Window
  const hasAcceptanceDeadline =
    /(?:within\s+\d+\s+(?:business\s+)?days\s+(?:of\s+receipt|after\s+receipt)?.*(?:accept|deemed\s+accepted|approve)|deemed\s+accepted|deemed\s+to\s+have\s+accepted|automatic\s+acceptance)/i.test(
      text
    );
  const mentionsAcceptanceOrApproval =
    /(?:upon\s+acceptance|after\s+acceptance|client\s+accepts|company\s+accepts|written\s+approval|subject\s+to\s+acceptance)/i.test(
      text
    );

  if (mentionsAcceptanceOrApproval && !hasAcceptanceDeadline) {
    results.push({
      id: "missing-acceptance-window",
      title: "Acceptance Deadline & Deemed Acceptance Clause",
      category: "payment",
      importance: "critical",
      icon: "⏱️",
      whatIsMissing:
        "The contract conditions final payment or completion upon client acceptance, but provides no specific deadline (e.g. 5–7 business days) or automatic acceptance mechanism.",
      whyItMatters:
        "Without an explicit acceptance deadline, the client can delay reviewing your deliverables or withhold final sign-off indefinitely without being in breach of contract, leaving your payment frozen.",
      suggestedClause:
        "Client shall review and either approve or provide consolidated written feedback on Deliverables within five (5) business days of receipt. Deliverables shall be deemed fully accepted if Client does not provide written objections within this 5-day window.",
      negotiationSnippet:
        "Could we please add a standard 5-business-day acceptance review window with deemed acceptance to ensure a clear timeline for final sign-off and payment?",
    });
  }

  // 2. Check: Kill Fee / Early Cancellation Protection
  const hasKillFeeOrPartialPayment =
    /(?:kill\s+fee|cancellation\s+fee|pro-rata|pro\s+rata|payment\s+for\s+all\s+work\s+completed|compensated\s+for\s+all\s+hours|compensated\s+for\s+all\s+work)/i.test(
      text
    );
  const hasConvenienceTermination =
    /(?:terminate\s+(?:this\s+agreement\s+)?(?:at\s+any\s+time|for\s+convenience|without\s+cause|upon\s+\d+\s+days)|cancellation\s+by\s+company|client\s+may\s+terminate)/i.test(
      text
    );

  if (hasConvenienceTermination && !hasKillFeeOrPartialPayment) {
    results.push({
      id: "missing-kill-fee",
      title: "Cancellation Fee & Work-in-Progress Payment Protection",
      category: "termination",
      importance: "critical",
      icon: "🛑",
      whatIsMissing:
        "The agreement allows the client to terminate the contract early, but does not explicitly guarantee full payment for all work completed up to the date of cancellation, plus reimbursement of incurred expenses.",
      whyItMatters:
        "If the client cancels the project midway for internal reasons, you could be left uncompensated for hours of completed design, code, or production already delivered.",
      suggestedClause:
        "In the event of termination without cause by Client, Client shall immediately pay Service Provider for all completed Deliverables and prorated work-in-progress up to the effective termination date, plus any non-cancellable expenses.",
      negotiationSnippet:
        "To ensure fair balance, we should clarify that if the project is cancelled early without breach, work completed up to the termination date will be compensated.",
    });
  }

  // 3. Check: IP Ownership Transfer Conditioned on Full Payment
  const assignsAllIP =
    /(?:work\s+made\s+for\s+hire|hereby\s+assigns|exclusive\s+property\s+of\s+company|exclusive\s+property\s+of\s+client|all\s+right,\s+title\s+and\s+interest)/i.test(
      text
    );
  const ipTiedToPayment =
    /(?:upon\s+(?:full\s+payment|receipt\s+of\s+all\s+fees|payment\s+in\s+full)|conditioned\s+upon\s+full\s+payment|effective\s+only\s+upon\s+payment)/i.test(
      text
    );

  if (assignsAllIP && !ipTiedToPayment) {
    results.push({
      id: "missing-ip-payment-condition",
      title: "IP Transfer Conditioned Exclusively Upon Full Payment",
      category: "ip_rights",
      importance: "critical",
      icon: "🔒",
      whatIsMissing:
        "The agreement transfers all copyright and intellectual property rights immediately upon creation or delivery, rather than conditioning the transfer upon full and final payment.",
      whyItMatters:
        "If the client takes your designs, software, or campaign content and later refuses to pay the outstanding balance, they still legally own the work and you lose your primary leverage for collecting payment.",
      suggestedClause:
        "All assignment of intellectual property rights, licenses, and ownership in the Deliverables shall become effective only upon Service Provider's receipt of full and final payment of all agreed fees.",
      negotiationSnippet:
        "I’d like to add a standard clause clarifying that the transfer of intellectual property and ownership takes effect upon receipt of full payment.",
    });
  }

  // 4. Check: Limitation of Liability for Contractor
  const hasLiabilityCap =
    /(?:limitation\s+of\s+liability|aggregate\s+liability\s+shall\s+not\s+exceed|capped\s+at\s+the\s+total\s+fees|liability\s+is\s+limited\s+to)/i.test(
      text
    );
  const mentionsUncappedIndemnity =
    /(?:indemnify,\s+defend\s+and\s+hold\s+harmless|shall\s+indemnify\s+the\s+company|hold\s+harmless\s+from\s+any\s+and\s+all\s+claims)/i.test(
      text
    );

  if (!hasLiabilityCap) {
    results.push({
      id: "missing-liability-cap",
      title: "Mutual Limitation of Liability Cap",
      category: "liability",
      importance: mentionsUncappedIndemnity ? "critical" : "recommended",
      icon: "🛡️",
      whatIsMissing:
        "There is no limitation of liability clause protecting you. Your potential legal exposure under this agreement is technically uncapped.",
      whyItMatters:
        "Without an express liability cap, you could theoretically be sued for indirect damages, lost profits, or business interruption exceeding the total value of your contract.",
      suggestedClause:
        "To the maximum extent permitted by applicable law, Service Provider's total aggregate liability arising out of or related to this Agreement shall be limited to the total fees actually paid to Service Provider under this Agreement in the preceding twelve (12) months.",
      negotiationSnippet:
        "Could we include a standard mutual limitation of liability capping each party's aggregate liability to the total fees paid under this agreement?",
    });
  }

  // 5. Check: Revision Round Limit & Out-of-Scope Billing Rate
  const mentionsRevisions =
    /(?:revision|revisions|changes|modifications|adjustments|satisfaction\s+of\s+the\s+company|until\s+satisfied)/i.test(
      text
    );
  const hasRevisionCap =
    /(?:up\s+to\s+\d+\s+(?:rounds?\s+of\s+)?revisions?|\d+\s+rounds?\s+of\s+revisions?|maximum\s+of\s+\d+\s+revisions?|two\s+\(2\)\s+rounds|additional\s+revisions\s+at\s+an\s+hourly\s+rate)/i.test(
      text
    );

  if (mentionsRevisions && !hasRevisionCap) {
    results.push({
      id: "missing-revision-cap",
      title: "Defined Revision Cap & Out-of-Scope Rate",
      category: "scope",
      importance: "recommended",
      icon: "🔄",
      whatIsMissing:
        "The contract requires revisions or changes until the client is satisfied, but does not state a numerical cap on revision rounds or a billing rate for additional scope.",
      whyItMatters:
        "This leaves you vulnerable to endless revision cycles ('scope creep') without extra compensation, diluting your effective hourly rate.",
      suggestedClause:
        "The project fee includes up to two (2) consolidated rounds of revisions. Any revisions requested beyond this scope, or changes that contradict previously approved specifications, will be billed at Service Provider's standard hourly rate upon prior written authorization.",
      negotiationSnippet:
        "Let's specify that the fee includes two rounds of revisions, with any further changes billed at an agreed hourly rate.",
    });
  }

  // 6. Check: Late Payment Fee / Interest on Overdue Invoices
  const hasLatePaymentFee =
    /(?:late\s+fee|interest\s+at\s+the\s+rate\s+of|\d+%\s+per\s+month|penalty\s+of\s+\d+%|interest\s+on\s+overdue|costs\s+of\s+collection)/i.test(
      text
    );

  if (!hasLatePaymentFee) {
    results.push({
      id: "missing-late-payment-interest",
      title: "Late Payment Interest & Invoicing Grace Period",
      category: "payment",
      importance: "recommended",
      icon: "💳",
      whatIsMissing:
        "The contract sets payment terms but specifies no late interest penalty or remedy if the client delays paying invoices past the agreed deadline.",
      whyItMatters:
        "Without late payment consequences, companies may prioritize other vendor bills first, leaving your payment delayed for months without repercussion.",
      suggestedClause:
        "Invoices not paid within the agreed payment period shall accrue interest at the rate of 1.5% per month (or the maximum allowed by law) on the outstanding balance, plus reasonable costs of collection.",
      negotiationSnippet:
        "Could we add a standard late payment clause providing 1.5% monthly interest on invoices overdue by more than 15 days?",
    });
  }

  // 7. Check: Portfolio & Case Study Rights (especially for freelancers/designers/creators)
  const hasPortfolioRights =
    /(?:portfolio|case\s+study|showcase|marketing\s+materials|display\s+the\s+deliverables|credit\s+and\s+attribution)/i.test(
      text
    );

  if (!hasPortfolioRights && (contractType.toLowerCase().includes("design") || contractType.toLowerCase().includes("freelance") || contractType.toLowerCase().includes("creator") || (resolvedRole && (resolvedRole.toLowerCase().includes("designer") || resolvedRole.toLowerCase().includes("developer") || resolvedRole.toLowerCase().includes("creator"))))) {
    results.push({
      id: "missing-portfolio-rights",
      title: "Portfolio & Self-Promotion Rights",
      category: "governance",
      importance: "good_to_have",
      icon: "🎨",
      whatIsMissing:
        "The contract does not explicitly permit you to showcase the completed work or list the project in your professional portfolio or case studies.",
      whyItMatters:
        "Broad confidentiality or IP assignment clauses could be interpreted as prohibiting you from featuring your work in your portfolio or client pitches.",
      suggestedClause:
        "Service Provider retains the non-exclusive right to display the Deliverables and describe the project in Service Provider's professional portfolio, website, and promotional materials once publicly released by Client.",
      negotiationSnippet:
        "I'd like to ensure I have standard portfolio rights to display the completed work on my website once it's launched.",
    });
  }

  return results;
}

/**
 * Full AI detector combining LLM analysis with fallback rule engine.
 */
export async function detectMissingProvisions(
  input: DetectMissingProvisionsInput
): Promise<MissingProvision[]> {
  const fallbackResults = evaluateMissingProvisionsRules(
    input.extractedText,
    input.contractType || "Commercial Agreement",
    input.userRole || "Contractor"
  );

  if (!input.extractedText || input.extractedText.trim().length < 50) {
    return fallbackResults;
  }

  try {
    const systemPrompt = `You are PactIQ, an expert legal contract intelligence engine advising the user ("you").
The user's role is: "${input.userRole || "Contractor / Service Provider"}".
The contract type is: "${input.contractType || "Commercial Agreement"}".

Analyze the uploaded contract text and determine what IMPORTANT PROTECTIVE PROVISIONS ARE MISSING that should be added to protect the user.

Evaluate standard protective terms:
1. Deemed acceptance deadline (5-7 days window so payment is not withheld indefinitely).
2. Kill fee / Work-in-progress compensation upon early cancellation.
3. IP ownership transfer conditioned upon receipt of full payment.
4. Mutual limitation of liability cap for the contractor/service provider.
5. Defined revision round limit (e.g. 2 rounds) & out-of-scope billing rate.
6. Late payment fee/interest on overdue invoices.
7. Portfolio & showcase rights (for creators, designers, developers).

Return ONLY a valid JSON object matching:
{
  "missingProvisions": [
    {
      "id": "unique-slug",
      "title": "Title of Missing Safeguard",
      "category": "payment" | "liability" | "scope" | "ip_rights" | "termination" | "governance",
      "importance": "critical" | "recommended" | "good_to_have",
      "icon": "emoji",
      "whatIsMissing": "Plain English description of what is omitted",
      "whyItMatters": "Why having no clause on this hurts the user",
      "suggestedClause": "Proposed ready-to-copy clause text",
      "negotiationSnippet": "Quick note to request this from client"
    }
  ]
}`;

    const userPrompt = `Uploaded Contract Text:\n"""\n${input.extractedText.slice(0, 10000)}\n"""`;

    const rawResponse = await callLLM({
      systemPrompt,
      userPrompt,
      responseFormat: "json",
      temperature: 0.1,
    });

    const parsed = missingProvisionSchema.parse(JSON.parse(rawResponse));
    if (parsed.missingProvisions && parsed.missingProvisions.length > 0) {
      return parsed.missingProvisions;
    }
  } catch (err) {
    console.warn("AI missing provisions detection failed, using rule engine:", err);
  }

  return fallbackResults;
}
