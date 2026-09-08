import { Finding } from "@/lib/ai/analyze-clause";

export interface Report {
    contractId: string;
    contractVersionId: string;
    reviewId: string;
    findings: Finding[];
}

export function generateReport(reportData: Report) {
    const { contractId, contractVersionId, reviewId, findings } = reportData;

    // Generate a structured report
    const report = {
        contractId,
        contractVersionId,
        reviewId,
        findings: findings.map(finding => ({
            clauseIndex: finding.clauseIndex,
            category: finding.category,
            severity: finding.severity,
            title: finding.title,
            whatItSays: finding.whatItSays,
            whatItMeans: finding.whatItMeans,
            whatToConsider: finding.whatToConsider,
            confidence: finding.confidence,
        })),
    };

    return report;
}