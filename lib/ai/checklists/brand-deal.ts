/**
 * Creator / Brand Deal Checklist
 *
 * Closed checklist per PactIQ build specifications.
 * Each item defines a specific standard to look for in a brand deal / creator contract.
 *
 * POLICY PRINCIPLES:
 * 1. Currency Neutrality: NGN, USD, GBP, EUR and all other currencies are treated neutrally.
 *    The mere use of any currency is NOT a risk. Never flag a local currency or suggest switching to USD
 *    unless there is a genuine contract ambiguity, missing conversion rate, or explicit currency mismatch.
 * 2. Missing / Unclear Provisions: Only surface missing protections when their absence creates a real,
 *    meaningful financial, legal, operational, rights-related, or commercial consequence for the user in this deal.
 */

export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  clauseKeywords: string[];
  riskSignals: string[];
  defaultSeverity: "high" | "worth_reviewing" | "understand" | "no_issue";
}

export const BRAND_DEAL_CHECKLIST: ChecklistItem[] = [
  {
    id: "payment-amount",
    category: "payment",
    title: "Payment Amount & Currency Clarity",
    description:
      "What is the total fee and currency? All currencies (NGN, USD, GBP, EUR, etc.) are treated completely neutrally. Do NOT flag NGN or any currency as risky simply because it is a local currency or the counterparty is international. Only flag if the currency is ambiguous, unspecified, or requires conversion without specifying the exchange rate or conversion mechanism.",
    clauseKeywords: ["payment", "fee", "compensation", "remuneration", "rate", "amount", "currency", "₦", "$", "£", "€"],
    riskSignals: ["no currency specified", "amount unclear", "unspecified exchange rate", "missing conversion mechanism", "currency mismatch with stated costs", "subject to discretionary deduction"],
    defaultSeverity: "understand",
  },
  {
    id: "payment-schedule",
    category: "payment",
    title: "Payment Schedule & Timing",
    description:
      "When is payment due (e.g., within 7/14/30 days, net-30, net-60)? Flag extended payment windows (net-60+) or MISSING payment deadlines where payment timing is left undefined or tied to indefinite counterparty discretion.",
    clauseKeywords: ["payment", "due", "net", "invoice", "within", "days", "upon", "delivery", "publication", "schedule"],
    riskSignals: ["net 60", "net 90", "no payment deadline specified", "at company's sole convenience", "payment timing undefined"],
    defaultSeverity: "understand",
  },
  {
    id: "payment-kill-fee",
    category: "payment",
    title: "Kill Fee / Cancellation Payment",
    description:
      "If the brand or client cancels the engagement after work has started, is there a kill fee or partial payment for completed work? Flag when the contract allows unilateral cancellation without compensating for accrued work or non-refundable costs.",
    clauseKeywords: ["kill fee", "cancellation", "termination", "partial payment", "kill", "cancel"],
    riskSignals: ["no payment on cancellation", "cancellation without compensation for work completed", "silent on cancellation compensation where cancellation is permitted"],
    defaultSeverity: "high",
  },
  {
    id: "deliverables-scope",
    category: "deliverables",
    title: "Deliverables & Scope Definition",
    description:
      "Are deliverables and specifications clearly defined? Flag open-ended scope language or missing mechanisms for additional compensation if the client requests work beyond agreed deliverables.",
    clauseKeywords: ["deliverable", "content", "post", "video", "story", "reel", "appear", "create", "produce", "scope"],
    riskSignals: ["as requested from time to time without additional fee", "unlimited additional content", "undefined extra deliverables", "no additional compensation for out-of-scope work"],
    defaultSeverity: "understand",
  },
  {
    id: "deliverables-revisions",
    category: "deliverables",
    title: "Revision Limits & Approval",
    description:
      "How many rounds of revisions are included? Flag when the contract imposes open-ended revisions (e.g. 'until satisfied', 'at brand's discretion') WITHOUT specifying a clear revision round limit or fee for extra revisions.",
    clauseKeywords: ["revision", "amend", "change", "edit", "modify", "approval", "feedback", "rounds", "satisfied"],
    riskSignals: ["unlimited revisions", "until brand is satisfied without round limit", "no maximum revision cap", "revisions at brand's sole discretion"],
    defaultSeverity: "worth_reviewing",
  },
  {
    id: "deliverables-approval",
    category: "deliverables",
    title: "Approval Process & Timeline",
    description:
      "Does the brand have approval rights prior to publishing? Flag when approval has no deemed approval timeline, allowing indefinite delays that stall publication and payment.",
    clauseKeywords: ["approval", "approve", "review", "sign off", "sign-off", "prior to", "before posting", "timeline"],
    riskSignals: ["sole approval with no timeline", "no deemed approval clause", "payment conditioned on indefinite approval"],
    defaultSeverity: "worth_reviewing",
  },
  {
    id: "content-rights-grant",
    category: "content_rights",
    title: "Content & IP Rights Grant",
    description:
      "What usage rights does the brand receive? Flag disproportionate grants such as perpetual, irrevocable, worldwide, all-media licensing for a standard engagement.",
    clauseKeywords: ["license", "rights", "intellectual property", "IP", "copyright", "ownership", "assign", "grant", "perpetual", "irrevocable", "media"],
    riskSignals: ["perpetual license", "in perpetuity", "all media known or hereafter devised", "unrestricted sublicensing", "broad commercial exploitation without time cap"],
    defaultSeverity: "high",
  },
  {
    id: "content-rights-ownership",
    category: "content_rights",
    title: "Content Ownership / Work for Hire",
    description:
      "Does the creator retain copyright with a license, or is it a 'work for hire' / full assignment of underlying IP and moral rights?",
    clauseKeywords: ["work for hire", "work-for-hire", "owns", "ownership", "copyright", "assigned to", "assignment", "moral rights"],
    riskSignals: ["work for hire", "full assignment of copyright", "brand owns all raw and finished footage", "waiver of moral rights"],
    defaultSeverity: "high",
  },
  {
    id: "exclusivity",
    category: "exclusivity",
    title: "Exclusivity Restrictions & Competitor Scope",
    description:
      "Is the user restricted from working with other brands? Flag when exclusivity lacks a clear duration, has a vague/open-ended competitor definition, or extends far beyond the campaign term.",
    clauseKeywords: ["exclusive", "exclusivity", "competitor", "competing", "not work with", "prohibited", "restrict"],
    riskSignals: ["undefined exclusivity period", "vague competitor definition", "industry-wide category ban", "post-term exclusivity without additional compensation"],
    defaultSeverity: "high",
  },
  {
    id: "termination-rights",
    category: "termination",
    title: "Termination Rights & Notice",
    description:
      "Under what conditions can either party terminate? Flag one-sided immediate termination for convenience without reasonable notice.",
    clauseKeywords: ["terminat", "cancel", "end", "notice", "breach", "cure", "immediately", "convenience"],
    riskSignals: ["brand may terminate immediately without cause", "no cure period for minor breach", "one-sided termination for convenience"],
    defaultSeverity: "worth_reviewing",
  },
  {
    id: "termination-effect",
    category: "termination",
    title: "Effect of Termination on Completed Work",
    description:
      "What happens to payment upon early termination? Flag when the agreement fails to protect payment for work already completed, delivered, or approved prior to termination.",
    clauseKeywords: ["terminat", "payment", "fee", "complet", "progress", "kill fee", "upon termination", "accrued"],
    riskSignals: ["forfeiture of accrued payments upon termination", "no payment for completed milestones upon cancellation", "silent on payment for work performed prior to termination"],
    defaultSeverity: "high",
  },
  {
    id: "liability-cap",
    category: "liability",
    title: "Liability Limitation & Damages",
    description:
      "Is the user's liability capped (e.g. capped at the total fee received)? Flag unlimited liability, consequential damages exposure, or absence of any liability limit.",
    clauseKeywords: ["liability", "liable", "limit", "cap", "damages", "consequential", "indirect"],
    riskSignals: ["unlimited liability", "no liability cap", "liability includes indirect/consequential damages", "disproportionate exposure compared to deal value"],
    defaultSeverity: "high",
  },
  {
    id: "indemnification",
    category: "liability",
    title: "Indemnification Obligations & Scope",
    description:
      "What must the user indemnify the client for? Flag one-sided, unbounded indemnification that lacks gross negligence/willful misconduct qualifiers or mutual protection.",
    clauseKeywords: ["indemnif", "hold harmless", "defend", "claims", "losses", "damages"],
    riskSignals: ["broad one-sided indemnity", "indemnification for client-provided materials", "no limit or fault qualifier on indemnity"],
    defaultSeverity: "worth_reviewing",
  },
  {
    id: "image-likeness",
    category: "image_likeness",
    title: "Name, Image & Likeness (NIL) Rights",
    description:
      "Does the brand obtain rights to the creator's name, persona, voice, or likeness? Flag perpetual or unapproved commercial likeness exploitation.",
    clauseKeywords: ["name", "image", "likeness", "voice", "persona", "appearance", "endorse", "NIL"],
    riskSignals: ["perpetual likeness rights", "use of likeness for unrelated brand marketing", "sublicensing likeness to third parties without approval"],
    defaultSeverity: "high",
  },
  {
    id: "governing-law",
    category: "general",
    title: "Governing Law & Dispute Resolution",
    description:
      "Which jurisdiction and forum governs disputes? Flag burdensome or remote dispute resolution venues that make enforcement disproportionately costly.",
    clauseKeywords: ["governing law", "jurisdiction", "courts", "arbitration", "dispute", "venue"],
    riskSignals: ["foreign jurisdiction with mandatory in-person arbitration", "loser pays all legal fees without qualification"],
    defaultSeverity: "understand",
  },
];

export function getChecklistForContractType(contractType: string): ChecklistItem[] {
  return BRAND_DEAL_CHECKLIST;
}
