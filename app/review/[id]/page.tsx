import { notFound, redirect } from "next/navigation";
import type { Finding } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ReviewDashboardClient } from "./ReviewDashboardClient";
import ReviewPaywall from "./ReviewPaywall";
import { FindingData } from "./FindingCard";
import type { VersionComparisonResult } from "@/lib/ai/compare-versions";
import { compareContractVersions, normalizeComparisonResult } from "@/lib/ai/compare-versions";
import { evaluateMissingProvisionsRules, type MissingProvision } from "@/lib/ai/missing-provisions";
import { canAccessReview, markReviewAsPaid } from "@/lib/payments/billing";
import { verifyPaystackTransaction } from "@/lib/payments/paystack";

function parseClassification(value: string | null): {
  confirmedContractType?: string;
  explanation?: string;
  missingProvisions?: MissingProvision[];
} {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function parseComparisonResult(value: string | null | undefined): VersionComparisonResult | null {
  if (!value) return null;
  try {
    const raw = JSON.parse(value);
    return normalizeComparisonResult(raw);
  } catch {
    return null;
  }
}

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ v?: string; reference?: string; trxref?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const requestedVersion = sp.v ? parseInt(sp.v, 10) : undefined;

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { versionNumber: "asc" },
        include: {
          clauses: { orderBy: { position: "asc" } },
          reviews: {
            where: { status: "complete" },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              findings: {
                where: { sourceValidated: true },
                orderBy: [{ isCrossClause: "desc" }, { severity: "asc" }, { createdAt: "asc" }],
                include: { clause: true },
              },
            },
          },
        },
      },
    },
  });

  if (!contract || (contract.userId && contract.userId !== user.id) || contract.versions.length === 0) {
    notFound();
  }

  // Selected version (either specified by `?v=X` or default to latest)
  let activeVersion = contract.versions[contract.versions.length - 1];
  if (requestedVersion) {
    const matched = contract.versions.find((v) => v.versionNumber === requestedVersion);
    if (matched && matched.reviews[0]) {
      activeVersion = matched;
    }
  }

  const review = activeVersion.reviews[0];
  if (!review) notFound();

  // If returning from a Paystack redirect with reference, verify and unlock
  const paystackRef = sp.reference || sp.trxref;
  if (paystackRef) {
    try {
      const verification = await verifyPaystackTransaction(paystackRef);
      if (verification.status === "success") {
        await markReviewAsPaid(review.id, {
          amount: verification.amount / 100,
          reference: verification.reference,
          customerEmail: verification.customerEmail,
          paidAt: verification.paidAt ? new Date(verification.paidAt) : new Date(),
          metadata: verification.metadata,
        });
      }
    } catch (err) {
      console.warn("Could not auto-verify Paystack reference on page load:", err);
    }
  }

  // Check access permissions (trial, paid, admin)
  const access = await canAccessReview(user.id, review.id);
  if (!access.canAccess) {
    const highCount = review.findings.filter((f) => f.severity === "high").length;
    const worthCount = review.findings.filter((f) => f.severity === "worth_reviewing").length;
    const understandCount = review.findings.filter((f) => f.severity === "understand").length;

    return (
      <ReviewPaywall
        reviewId={review.id}
        contractId={contract.id}
        filename={activeVersion.filename || contract.filename}
        contractType={contract.contractType || "General Agreement"}
        userRole={review.userRole || undefined}
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          userRole: user.userRole,
        }}
        highCount={highCount}
        worthCount={worthCount}
        understandCount={understandCount}
        priceNGN={access.priceNGN}
        freeTrialUsed={true}
      />
    );
  }

  const classification = parseClassification(review.classificationResult);
  let comparison: VersionComparisonResult | null = parseComparisonResult(
    review.comparisonResult || (review as unknown as { comparison_result?: string })?.comparison_result || null
  );

  // If activeVersion > 1 and comparison is not in review object, query database directly
  if (!comparison && activeVersion.versionNumber > 1) {
    try {
      const rawRows = await prisma.$queryRawUnsafe<Array<{ comparison_result: string | null }>>(
        `SELECT comparison_result FROM reviews WHERE id = $1 LIMIT 1`,
        review.id
      );
      if (rawRows && rawRows[0]?.comparison_result) {
        comparison = parseComparisonResult(rawRows[0].comparison_result);
      }
    } catch (e) {
      console.warn("Could not query raw comparison_result:", e);
    }
  }

  // Check if comparison is incomplete (missing concerns, missing whatChanged, or missing deal snapshot)
  const isComparisonIncomplete =
    !comparison ||
    !comparison.previousConcerns ||
    comparison.previousConcerns.length === 0 ||
    !comparison.whatChanged ||
    comparison.whatChanged.length === 0 ||
    !comparison.dealAsItStands ||
    !comparison.dealAsItStands.compensation ||
    comparison.dealAsItStands.compensation === "Agreed fee specified in revision.";

  // If activeVersion > 1 and comparison is missing or incomplete, synthesize full comparison against previous version
  if (isComparisonIncomplete && activeVersion.versionNumber > 1) {
    const prevVersion = contract.versions.find((v) => v.versionNumber === activeVersion.versionNumber - 1);
    const prevReview = prevVersion?.reviews[0];
    if (prevVersion && prevReview) {
      try {
        const priorities = review.userPriorities ? JSON.parse(review.userPriorities) : [];
        comparison = await compareContractVersions({
          previousVersionNumber: prevVersion.versionNumber,
          currentVersionNumber: activeVersion.versionNumber,
          contractType: classification.confirmedContractType || contract.contractType || "General Agreement",
          userRole: review.userRole,
          userPriorities: priorities,
          previousClauses: prevVersion.clauses.map((c) => ({
            id: c.id,
            section: c.section,
            title: c.title,
            text: c.text,
            position: c.position,
          })),
          previousFindings: prevReview.findings.map((f) => ({
            id: f.id,
            category: f.category,
            severity: f.severity,
            title: f.title,
            whatItSays: f.whatItSays,
            whatItMeans: f.whatItMeans,
            whatToConsider: f.whatToConsider,
            suggestedRewrite: f.suggestedRewrite,
            emailSnippet: f.emailSnippet,
            clause: f.clause
              ? {
                  section: f.clause.section,
                  title: f.clause.title,
                  position: f.clause.position,
                }
              : null,
          })),
          revisedClauses: activeVersion.clauses.map((c) => ({
            id: c.id,
            section: c.section,
            title: c.title,
            text: c.text,
            position: c.position,
          })),
          revisedExtractedText: activeVersion.extractedText || "",
        });

        if (comparison) {
          const serialized = JSON.stringify(comparison);
          try {
            await prisma.$executeRawUnsafe(
              `UPDATE reviews SET comparison_result = $1 WHERE id = $2`,
              serialized,
              review.id
            );
          } catch {}
        }
      } catch (err) {
        console.warn("Could not dynamically compare contract versions:", err);
      }
    }
  }

  const counts = review.findings.reduce(
    (result: Record<string, number>, finding: Finding) => ({ ...result, [finding.severity]: (result[finding.severity] ?? 0) + 1 }),
    {} as Record<string, number>
  );

  const highCount = counts["high"] ?? 0;
  const worthCount = counts["worth_reviewing"] ?? 0;
  const understandCount = counts["understand"] ?? 0;
  const crossClauseCount = review.findings.filter((f: Finding) => f.isCrossClause).length;

  const firstFor = (category: string) =>
    review.findings.find((finding: Finding) => finding.category === category && !finding.isCrossClause);

  function cleanLegaleseBoilerplate(text: string): string {
    if (!text) return "";
    return text
      .replace(/for the services and content described in this Agreement/gi, "")
      .replace(/under this Agreement/gi, "")
      .replace(/pursuant to (?:the terms of )?this Agreement/gi, "")
      .replace(/as set forth herein/gi, "")
      .replace(/subject to the terms and conditions hereof/gi, "")
      .replace(/in accordance with the provisions of this Agreement/gi, "")
      .replace(/\b(?:hereunder|thereunder|herein|hereto|thereof|hereof)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatPlainEnglishSummary(text: string, category: string, userRole?: string | null): string {
    if (!text) return "";
    let cleaned = cleanLegaleseBoilerplate(text);

    // Normalize Section references to Clause
    cleaned = cleaned
      .replace(/\bsection\s+(\d+|[IVXLCDM]+(?:\.[0-9a-z]+)*)/gi, "Clause $1")
      .replace(/\bsections\s+(\d+|[IVXLCDM]+(?:\.[0-9a-z]+)*)/gi, "Clauses $1");

    // Normalize parenthetical numbers like "seven (7) days" -> "7 days", "sixty (60) days" -> "60 days"
    cleaned = cleaned.replace(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|fourteen|fifteen|thirty|sixty|ninety)\s*\(([0-9]+)\)\s*(days?|months?|weeks?|years?|hours?)\b/gi, "$1 $2");

    // Convert brand payment statements to direct second person
    cleaned = cleaned
      .replace(/\b(?:The\s+)?(?:Brand|Company|Client)\s+shall\s+pay\s+(?:the\s+)?(?:Creator|Influencer|Contractor|Consultant|Freelancer|Employee|Talent|Vendor|Designer|Developer|you)\s+a\s+total\s+fee\s+of\b/gi, "You receive a total fee of")
      .replace(/\b(?:The\s+)?(?:Brand|Company|Client)\s+shall\s+pay\s+(?:the\s+)?(?:Creator|Influencer|Contractor|Consultant|Freelancer|Employee|Talent|Vendor|Designer|Developer|you)\b/gi, "You are paid")
      .replace(/\b(?:The\s+)?(?:Brand|Company|Client)\s+will\s+pay\s+(?:the\s+)?(?:Creator|Influencer|Contractor|Consultant|Freelancer|Employee|Talent|Vendor|Designer|Developer|you)\b/gi, "You receive")
      .replace(/\b(?:The\s+)?(?:Brand|Company|Client)\s+shall\s+pay\b/gi, "Paid as")
      .replace(/\b(?:The\s+)?(?:Brand|Company|Client)\s+will\s+pay\b/gi, "Paid as")
      .replace(/\bThe\s+remaining\s+([₦$€£][\d,]+|\d+[\d,]*\s*(?:NGN|USD|EUR|GBP|Naira))\s+shall\s+be\s+paid\b/gi, "and the remaining $1 is paid")
      .replace(/\b(?:the\s+)?(creator|influencer|contractor|consultant|freelancer|employee|talent|vendor|designer|developer)'s\b/gi, "your")
      .replace(/\b(to|from|by|with|against|upon|for|entitled)\s+(?:the\s+)?(creator|influencer|contractor|consultant|freelancer|employee|talent|vendor|designer|developer)\b/gi, (match) => {
        const prep = match.split(/\s+/)[0];
        return `${prep} you`;
      })
      .replace(/\b(?:The\s+)?(Creator|Influencer|Contractor|Consultant|Freelancer|Employee|Talent|Vendor|Designer|Developer)\s+(agrees|agreed)\s+to\b/gi, "You agree to")
      .replace(/\b(?:The\s+)?(Creator|Influencer|Contractor|Consultant|Freelancer|Employee|Talent|Vendor|Designer|Developer)\s+grants\b/gi, "You grant")
      .replace(/\b(?:The\s+)?(Creator|Influencer|Contractor|Consultant|Freelancer|Employee|Talent|Vendor|Designer|Developer)\s+represents\b/gi, "You represent")
      .replace(/\b(?:The\s+)?(Creator|Influencer|Contractor|Consultant|Freelancer|Employee|Talent|Vendor|Designer|Developer)\s+retains\b/gi, "You retain")
      .replace(/\b(?:The\s+)?(Creator|Influencer|Contractor|Consultant|Freelancer|Employee|Talent|Vendor|Designer|Developer)\s+acknowledges\b/gi, "You acknowledge")
      .replace(/\b(?:The\s+)?(Creator|Influencer|Contractor|Consultant|Freelancer|Employee|Talent|Vendor|Designer|Developer)\s+warrants\b/gi, "You guarantee")
      .replace(/\b(?:The\s+)?(Creator|Influencer|Contractor|Consultant|Freelancer|Employee|Talent|Vendor|Designer|Developer)\s+shall\b/gi, "You will")
      .replace(/\b(?:The\s+)?(Creator|Influencer|Contractor|Consultant|Freelancer|Employee|Talent|Vendor|Designer|Developer)\s+will\b/gi, "You will")
      .replace(/\b(?:The\s+)?(Creator|Influencer|Contractor|Consultant|Freelancer|Employee|Talent|Vendor|Designer|Developer)\s+must\b/gi, "You must")
      .replace(/\b(?:The\s+)?(Creator|Influencer|Contractor|Consultant|Freelancer|Employee|Talent|Vendor|Designer|Developer)\s+is\b/gi, "You are")
      .replace(/\b(?:The\s+)?(Creator|Influencer|Contractor|Consultant|Freelancer|Employee|Talent|Vendor|Designer|Developer)\b/gi, "you");

    // Clean up phrasing combinations like "You receive a total fee of ₦X. Paid as ₦Y within Z days... and the remaining ₦W is paid within V days"
    cleaned = cleaned
      .replace(/You receive a total fee of\s+([₦$€£][\d,]+|\d+[\d,]*\s*(?:NGN|USD|EUR|GBP|Naira))\.?\s*Paid as\s+([₦$€£][\d,]+|\d+[\d,]*\s*(?:NGN|USD|EUR|GBP|Naira))\s+within\s+/gi, "You receive a total fee of $1: $2 payable within ")
      .replace(/after signing this Agreement/gi, "after signing")
      .replace(/after the final piece of content is published/gi, "after your final content is published")
      .replace(/after the content is published/gi, "after your content is published");

    // Clean up casing if "you" begins a sentence
    cleaned = cleaned.replace(/(^\s*|[.!?]\s+)you\b/g, (match) => {
      return match.replace("you", "You");
    });

    // Clean sentence boundaries - avoid cutting words mid-sentence or ending on "The..."
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    const maxLen = category === "deliverables" ? 420 : 320;
    if (cleaned.length > maxLen) {
      // Find the last period, semi-colon, or closing parenthesis within 200 - maxLen chars
      const sub = cleaned.slice(0, maxLen);
      const lastPunctuation = Math.max(sub.lastIndexOf(". "), sub.lastIndexOf(".\n"), sub.lastIndexOf("; "), sub.lastIndexOf(": "), sub.lastIndexOf("."));
      if (lastPunctuation > 160) {
        cleaned = sub.slice(0, lastPunctuation + 1).trim();
      } else {
        const lastSpace = sub.lastIndexOf(" ");
        if (lastSpace > 160) {
          cleaned = sub.slice(0, lastSpace).replace(/[,;:\s]+$/, "").trim() + ".";
        }
      }
    }

    return cleaned;
  }

  function isPreambleText(text: string): boolean {
    if (!text) return true;
    const lower = text.toLowerCase().trim();
    if (
      lower.includes('("company")') ||
      lower.includes('(the "company")') ||
      lower.includes('(the “company”)') ||
      lower.includes('("designer")') ||
      lower.includes('(the "designer")') ||
      lower.includes('(the “designer”)') ||
      lower.includes('("client")') ||
      lower.includes('(the "client")') ||
      lower.includes('(the “client”)') ||
      lower.includes('("creator")') ||
      lower.includes('(the "creator")') ||
      lower.includes('(the “creator”)') ||
      lower.includes('("contractor")') ||
      lower.includes('(the "contractor")') ||
      lower.includes('(the “contractor”)') ||
      lower.includes("effective date:") ||
      lower.includes("effective date") ||
      lower.includes("by and between") ||
      lower.includes("whereas,") ||
      lower.includes("now, therefore") ||
      lower.includes("witnesseth that") ||
      /^(?:this\s+)?(?:freelance|influencer|consulting|independent\s+contractor|commercial|service)\s+(?:[a-z\s]+)?agreement/i.test(lower)
    ) {
      return true;
    }
    return false;
  }

  function getTermValue(
    category: string,
    headingKeywords: string[],
    contentKeywords: string[],
    fallback: string
  ): { value: string; status: string } {
    const clauses = activeVersion.clauses || [];

    // 1. Primary priority: Extract the actual contractual clause directly from the document
    if (clauses.length > 0) {
      // If category is deliverables, first check if there is a specific quantified deliverables clause
      let matchIdx = -1;
      if (category === "deliverables") {
        matchIdx = clauses.findIndex((c) => {
          const text = c.text || "";
          if (isPreambleText(text)) return false;
          const textLower = text.toLowerCase();
          return (
            /(?:initial\s+project\s+includes|project\s+includes|deliverables\s+include|deliverables:|\(a\)\s*approximately|\(a\)\s*\d+|\d+\s*core\s*screens|\d+\s*(?:screens|posts|reels|videos))/i.test(
              textLower
            )
          );
        });
      }

      // If no specific deliverables match or for other categories, find standard matching clause
      if (matchIdx === -1) {
        matchIdx = clauses.findIndex((c) => {
          const text = c.text || "";
          if (isPreambleText(text)) return false;

          const textLower = text.toLowerCase();
          const titleLower = (c.title || "").toLowerCase();
          const sectionLower = (c.section || "").toLowerCase();

          // 1. Heading match
          const hasHeadingMatch = headingKeywords.some(
            (kw) =>
              titleLower.includes(kw) ||
              sectionLower.includes(kw) ||
              new RegExp(`^\\d+\\.\\s*${kw}`, "i").test(textLower) ||
              new RegExp(`^section\\s*\\d*.*${kw}`, "i").test(textLower)
          );
          if (hasHeadingMatch) return true;

          // 2. Content keywords match
          return contentKeywords.some((kw) => textLower.includes(kw));
        });
      }

      if (matchIdx !== -1) {
        const parts: string[] = [];
        const startClause = clauses[matchIdx];
        const startText = (startClause.text || "").trim();

        if (!isPreambleText(startText)) {
          const isPureHeading = /^(?:section\s*\d*[\.\:\-\s]*|\d+\.[\.\:\-\s]*)[A-Za-z\s]+$/i.test(startText) || startText.length < 35;
          if (!isPureHeading) {
            parts.push(startText);
          }
        }

        // Collect all sub-paragraphs/items under this section until the next numbered section
        for (let i = matchIdx + 1; i < Math.min(matchIdx + 6, clauses.length); i++) {
          const nextText = (clauses[i].text || "").trim();
          if (/^(?:section\s*\d+|\d+\.)\s+[A-Za-z]/i.test(nextText)) break;
          if (!isPreambleText(nextText) && nextText.length > 0) {
            parts.push(nextText);
          }
          if (parts.join(" ").length >= 450) break;
        }

        if (parts.length > 0) {
          const combined = parts.join(" ").replace(/\s+/g, " ").trim();
          const formatted = formatPlainEnglishSummary(combined, category, review.userRole);
          if (formatted && formatted.length > 15) {
            return {
              value: formatted,
              status: "Identified",
            };
          }
        }
      }
    }

    // 2. Secondary fallback: Use the AI's categorized findings if no direct clause was found
    const categoryFindings = review.findings.filter(
      (f: Finding) => f.category === category && !f.isCrossClause && f.whatItSays && f.whatItSays.trim().length > 15
    );

    if (categoryFindings.length > 0) {
      const bestFinding = categoryFindings.reduce((prev, curr) =>
        (curr.whatItSays?.length || 0) > (prev.whatItSays?.length || 0) ? curr : prev
      );
      return {
        value: formatPlainEnglishSummary(bestFinding.whatItSays, category, review.userRole),
        status: "Identified",
      };
    }

    return {
      value: fallback,
      status: "Standard",
    };
  }

  const paymentTerm = getTermValue(
    "payment",
    ["compensation", "payment", "fees", "fee", "remuneration", "consideration"],
    ["shall pay", "total fee", "total compensation", "fee of", "installment", "net 30", "net-30", "milestones"],
    "Standard commercial payment terms."
  );

  const deliverablesTerm = getTermValue(
    "deliverables",
    ["services", "scope of work", "deliverables", "deliverable", "scope of services", "scope", "engagement", "duties", "campaign", "project scope"],
    ["initial project includes", "project includes", "deliverables include", "services include", "screens", "wireframes", "designs", "reels", "posts", "provide product design", "provide design services"],
    "Standard deliverables and scope of services."
  );

  const rightsTerm = getTermValue(
    "content_rights",
    ["intellectual property", "ownership", "work product", "usage rights", "license", "licensing", "grant of rights", "copyright"],
    ["work product", "retains ownership", "owned exclusively", "pre-existing", "license to use", "perpetual", "worldwide"],
    "Standard license and content usage terms."
  );

  const exclusivityTerm = getTermValue(
    "exclusivity",
    ["exclusivity", "non-compete", "competitive", "competitor", "restrictions"],
    ["non-exclusive", "exclusive", "competes directly", "competitor includes", "shall not provide promotional"],
    "Non-exclusive engagement."
  );

  const terminationTerm = getTermValue(
    "termination",
    ["term and termination", "termination", "terminate", "cancellation", "term"],
    ["terminate for convenience", "terminate this agreement", "written notice", "material breach", "payment for deliverables completed"],
    "Standard mutual termination on notice."
  );

  const dealTerms = [
    {
      label: "Contract Type",
      value: classification.confirmedContractType || contract.contractType || "Commercial Agreement",
      category: "Classification",
      status: "Verified",
      icon: "📑",
    },
    {
      label: "Compensation & Payment",
      value: paymentTerm.value,
      category: "Commercial",
      status: paymentTerm.status,
      icon: "💳",
    },
    {
      label: "Deliverables & Scope",
      value: deliverablesTerm.value,
      category: "Obligations",
      status: deliverablesTerm.status,
      icon: "📦",
    },
    {
      label: "IP & Licensing Rights",
      value: rightsTerm.value,
      category: "Rights",
      status: rightsTerm.status,
      icon: "🛡️",
    },
    {
      label: "Exclusivity & Non-Compete",
      value: exclusivityTerm.value,
      category: "Restrictions",
      status: exclusivityTerm.status,
      icon: "🔒",
    },
    {
      label: "Termination & Notice",
      value: terminationTerm.value,
      category: "Governance",
      status: terminationTerm.status,
      icon: "🚪",
    },
  ];

  const allVersionsMeta = contract.versions.map((v) => {
    const r = v.reviews[0];
    const vFindings = r?.findings || [];
    const vCounts = {
      high: vFindings.filter((f: Finding) => f.severity === "high").length,
      worth_reviewing: vFindings.filter((f: Finding) => f.severity === "worth_reviewing").length,
      understand: vFindings.filter((f: Finding) => f.severity === "understand").length,
    };

    let compSummary = null;
    const rawComp = r?.comparisonResult || (r as unknown as { comparison_result?: string })?.comparison_result;
    if (rawComp) {
      try {
        const parsedComp = JSON.parse(rawComp) as VersionComparisonResult;
        compSummary = parsedComp.summaryCounts;
      } catch {
        compSummary = null;
      }
    }

    return {
      id: v.id,
      versionNumber: v.versionNumber,
      filename: v.filename || contract.filename,
      createdAt: v.createdAt.toISOString(),
      counts: vCounts,
      comparisonSummary: compSummary,
      hasReview: !!r,
    };
  });

  const missingProvisions: MissingProvision[] =
    classification.missingProvisions && classification.missingProvisions.length > 0
      ? classification.missingProvisions
      : evaluateMissingProvisionsRules(
          activeVersion.extractedText || "",
          classification.confirmedContractType || contract.contractType || "Commercial Agreement",
          review.userRole || "Contractor"
        );

  return (
    <ReviewDashboardClient
      contractId={contract.id}
      filename={activeVersion.filename || contract.filename}
      contractCreatedAt={activeVersion.createdAt.toISOString()}
      contractType={contract.contractType || "General Agreement"}
      confirmedContractType={classification.confirmedContractType}
      findings={review.findings as unknown as FindingData[]}
      missingProvisions={missingProvisions}
      dealTerms={dealTerms}
      counts={{
        high: highCount,
        worth_reviewing: worthCount,
        understand: understandCount,
      }}
      crossClauseCount={crossClauseCount}
      userRole={review.userRole || undefined}
      currentVersionNumber={activeVersion.versionNumber}
      allVersions={allVersionsMeta}
      comparison={comparison || undefined}
    />
  );
}
