import { notFound } from "next/navigation";
import type { Finding } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ReviewDashboardClient } from "./ReviewDashboardClient";
import { FindingData } from "./FindingCard";

function parseClassification(value: string | null): { confirmedContractType?: string; explanation?: string } {
  if (!value) return {};
  try {
    return JSON.parse(value) as { confirmedContractType?: string; explanation?: string };
  } catch {
    return {};
  }
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
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

  if (!contract) notFound();
  const review = contract.versions[0]?.reviews[0];
  if (!review) notFound();

  const classification = parseClassification(review.classificationResult);
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
      value: firstFor("payment")?.whatItSays || "No explicit payment mechanism flagged in extracted terms.",
      category: "Commercial",
      status: firstFor("payment") ? "Identified" : "Not Specified",
      icon: "💳",
    },
    {
      label: "Deliverables & Scope",
      value: firstFor("deliverables")?.whatItSays || "Standard scope definition or milestone structure.",
      category: "Obligations",
      status: firstFor("deliverables") ? "Identified" : "Standard",
      icon: "📦",
    },
    {
      label: "IP & Licensing Rights",
      value: firstFor("content_rights")?.whatItSays || "No specific IP assignment or license terms flagged.",
      category: "Rights",
      status: firstFor("content_rights") ? "Requires Review" : "Standard",
      icon: "🛡️",
    },
    {
      label: "Exclusivity & Non-Compete",
      value: firstFor("exclusivity")?.whatItSays || "No restrictive exclusivity clauses identified in the text.",
      category: "Restrictions",
      status: firstFor("exclusivity") ? "Restricted" : "Non-Exclusive",
      icon: "🔒",
    },
    {
      label: "Termination & Notice",
      value: firstFor("termination")?.whatItSays || "Standard termination on mutual written notice.",
      category: "Governance",
      status: firstFor("termination") ? "Identified" : "Standard",
      icon: "🚪",
    },
  ];

  return (
    <ReviewDashboardClient
      contractId={contract.id}
      filename={contract.filename}
      contractCreatedAt={contract.createdAt.toISOString()}
      contractType={contract.contractType || "General Agreement"}
      confirmedContractType={classification.confirmedContractType}
      findings={review.findings as unknown as FindingData[]}
      dealTerms={dealTerms}
      counts={{
        high: highCount,
        worth_reviewing: worthCount,
        understand: understandCount,
      }}
      crossClauseCount={crossClauseCount}
    />
  );
}
