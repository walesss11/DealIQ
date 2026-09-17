import { prisma } from "./lib/db/prisma";

async function checkReviews() {
  const contracts = await prisma.contract.findMany({
    include: {
      versions: {
        orderBy: { versionNumber: "asc" },
        include: {
          reviews: {
            orderBy: { createdAt: "desc" },
            take: 2,
          },
        },
      },
    },
  });

  for (const c of contracts) {
    console.log(`\n=== CONTRACT: ${c.id} | ${c.filename} | Status: ${c.status} ===`);
    for (const v of c.versions) {
      console.log(`  Version ${v.versionNumber} (id: ${v.id}, filename: ${v.filename}):`);
      for (const r of v.reviews) {
        console.log(`    Review id: ${r.id}, status: ${r.status}, comparisonResult length: ${r.comparisonResult ? r.comparisonResult.length : 'NULL'}`);
        if (r.comparisonResult) {
          try {
            const parsed = JSON.parse(r.comparisonResult);
            console.log(`    Comparison Summary:`, parsed.overviewSummary);
            console.log(`    Changes count:`, parsed.changes?.length);
            console.log(`    First change:`, parsed.changes?.[0]?.title, parsed.changes?.[0]?.status);
          } catch (e) {
            console.log(`    Error parsing comparisonResult:`, e);
          }
        }
      }
    }
  }
}

checkReviews().catch(console.error).finally(() => prisma.$disconnect());
