/**
 * Creator / Brand Deal Checklist
 *
 * Closed checklist per build spec Section 4 and Section 5.
 * Each item defines a specific thing to look for in a brand deal / creator contract.
 *
 * This is NOT an open-ended "find issues" instruction.
 * Each item maps to a discrete, deterministic check in analyze-clause.ts.
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
    title: "Payment Amount & Currency",
    description:
      "What is the total fee? Is the currency specified? Is VAT/tax mentioned?",
    clauseKeywords: ["payment", "fee", "compensation", "remuneration", "rate", "amount", "currency"],
    riskSignals: ["no currency specified", "amount unclear", "subject to approval", "TBD", "to be determined"],
    defaultSeverity: "understand",
  },
  {
    id: "payment-schedule",
    category: "payment",
    title: "Payment Schedule & Timing",
    description:
      "When is payment due? Net-30? Net-60? On delivery? On publication? On approval?",
    clauseKeywords: ["payment", "due", "net", "invoice", "within", "days", "upon", "delivery", "publication"],
    riskSignals: ["net 60", "net 90", "upon approval", "at sole discretion", "no payment schedule"],
    defaultSeverity: "understand",
  },
  {
    id: "payment-kill-fee",
    category: "payment",
    title: "Kill Fee / Cancellation Payment",
    description:
      "If the brand cancels the deal after work has started, is there a kill fee or partial payment?",
    clauseKeywords: ["kill fee", "cancellation", "termination", "partial payment", "kill"],
    riskSignals: ["no kill fee", "no payment on cancellation", "silent on cancellation payment"],
    defaultSeverity: "high",
  },
  {
    id: "deliverables-scope",
    category: "deliverables",
    title: "Deliverables & Scope",
    description:
      "Exactly what is the creator required to deliver? Videos, posts, stories, appearances?",
    clauseKeywords: ["deliverable", "content", "post", "video", "story", "reel", "appear", "create", "produce"],
    riskSignals: ["as reasonably requested", "additional content", "at brand's discretion", "unlimited revisions"],
    defaultSeverity: "understand",
  },
  {
    id: "deliverables-revisions",
    category: "deliverables",
    title: "Revision Rights",
    description:
      "How many revisions is the creator required to make? Are revision rounds limited?",
    clauseKeywords: ["revision", "amend", "change", "edit", "modify", "approval", "feedback", "rounds"],
    riskSignals: ["unlimited revisions", "until approved", "at brand's sole discretion", "no limit"],
    defaultSeverity: "worth_reviewing",
  },
  {
    id: "deliverables-approval",
    category: "deliverables",
    title: "Approval Process",
    description:
      "Does the brand have approval rights before posting? What happens if approval is withheld?",
    clauseKeywords: ["approval", "approve", "review", "sign off", "sign-off", "prior to", "before posting"],
    riskSignals: ["sole approval", "absolute discretion", "no deemed approval", "no approval timeline"],
    defaultSeverity: "worth_reviewing",
  },
  {
    id: "content-rights-grant",
    category: "content_rights",
    title: "Content & IP Rights Grant",
    description:
      "What rights does the brand receive to the creator's content? How broad? For how long?",
    clauseKeywords: ["license", "rights", "intellectual property", "IP", "copyright", "ownership", "assign", "grant", "perpetual", "irrevocable"],
    riskSignals: ["perpetual", "irrevocable", "worldwide", "unlimited", "in perpetuity", "all media", "all channels", "sublicense"],
    defaultSeverity: "high",
  },
  {
    id: "content-rights-ownership",
    category: "content_rights",
    title: "Content Ownership / Work for Hire",
    description:
      "Does the creator retain copyright, or is the content a 'work for hire' owned by the brand?",
    clauseKeywords: ["work for hire", "work-for-hire", "owns", "ownership", "copyright", "created under", "commissioned"],
    riskSignals: ["work for hire", "brand owns", "company owns", "assigned to", "waives moral rights"],
    defaultSeverity: "high",
  },
  {
    id: "exclusivity",
    category: "exclusivity",
    title: "Exclusivity Restrictions",
    description:
      "Is the creator restricted from working with competing brands? For how long? How is 'competitor' defined?",
    clauseKeywords: ["exclusive", "exclusivity", "competitor", "competing", "not work with", "prohibited", "restrict"],
    riskSignals: ["broad exclusivity", "competitor undefined", "long exclusivity period", "category exclusivity", "vague competitor definition"],
    defaultSeverity: "high",
  },
  {
    id: "termination-rights",
    category: "termination",
    title: "Termination Rights & Conditions",
    description:
      "Under what conditions can either party terminate? What notice is required? What happens to payment?",
    clauseKeywords: ["terminat", "cancel", "end", "notice", "breach", "cure", "immediately"],
    riskSignals: ["terminate for convenience", "terminate immediately", "no notice required", "sole discretion", "without cause"],
    defaultSeverity: "worth_reviewing",
  },
  {
    id: "termination-effect",
    category: "termination",
    title: "Effect of Termination on Payment",
    description:
      "If the contract is terminated, what happens to payment for work already completed or in progress?",
    clauseKeywords: ["terminat", "payment", "fee", "complet", "progress", "kill fee", "upon termination"],
    riskSignals: ["no payment on termination", "forfeits payment", "payment subject to", "brand's discretion"],
    defaultSeverity: "high",
  },
  {
    id: "liability-cap",
    category: "liability",
    title: "Liability Cap",
    description:
      "Is the creator's liability capped? At what amount? Unlimited liability is a significant risk.",
    clauseKeywords: ["liability", "liable", "limit", "cap", "indemnif", "damages"],
    riskSignals: ["unlimited liability", "no cap", "including indirect damages", "consequential damages", "lost profits"],
    defaultSeverity: "high",
  },
  {
    id: "indemnification",
    category: "liability",
    title: "Indemnification Obligations",
    description:
      "What is the creator required to indemnify the brand for? Is indemnification mutual?",
    clauseKeywords: ["indemnif", "hold harmless", "defend", "claims", "losses", "damages"],
    riskSignals: ["broad indemnification", "one-sided indemnification", "third party claims", "not mutual"],
    defaultSeverity: "worth_reviewing",
  },
  {
    id: "image-likeness",
    category: "image_likeness",
    title: "Image, Likeness & Name Rights",
    description:
      "Does the brand get rights to use the creator's name, image, likeness, or voice? For how long and where?",
    clauseKeywords: ["name", "image", "likeness", "voice", "persona", "appearance", "endorse"],
    riskSignals: ["perpetual name/image use", "in all media", "without approval", "unlimited use", "sublicense likeness"],
    defaultSeverity: "high",
  },
  {
    id: "disclosure-ftc",
    category: "general",
    title: "FTC / Disclosure Compliance",
    description:
      "Is the creator required to comply with disclosure rules (e.g., #ad, #sponsored)?",
    clauseKeywords: ["FTC", "disclosure", "hashtag", "ad", "sponsored", "paid partnership", "compliance"],
    riskSignals: ["creator responsible for FTC compliance", "no brand indemnification for disclosure issues"],
    defaultSeverity: "understand",
  },
  {
    id: "governing-law",
    category: "general",
    title: "Governing Law & Jurisdiction",
    description:
      "Which country/state's law governs? Where must disputes be resolved?",
    clauseKeywords: ["governing law", "jurisdiction", "courts", "arbitration", "dispute", "venue"],
    riskSignals: ["foreign jurisdiction", "mandatory arbitration", "class action waiver", "far from creator's location"],
    defaultSeverity: "understand",
  },
];

export function getChecklistForContractType(contractType: string): ChecklistItem[] {
  // Phase 1: only Brand Deal checklist is implemented
  // Later: add per-type checklists and select by contractType
  const brandDealTypes = [
    "brand deal",
    "sponsorship",
    "influencer agreement",
    "content agreement",
    "talent agreement",
    "licensing agreement",
  ];

  if (brandDealTypes.some((t) => contractType.toLowerCase().includes(t.toLowerCase().split(" ")[0]))) {
    return BRAND_DEAL_CHECKLIST;
  }

  // Fallback: use brand deal checklist for any creator/influencer-adjacent type
  return BRAND_DEAL_CHECKLIST;
}
