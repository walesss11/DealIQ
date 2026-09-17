import type { ExtractedPage } from "./extract";

export interface SegmentedClause {
  title?: string;
  section?: string;
  text: string;
  pageNumber?: number;
  position: number;
}

export function extractClauseMetadata(trimmed: string): { section?: string; title?: string } {
  let section: string | undefined;
  let title: string | undefined;

  const firstLine = trimmed.split("\n")[0].trim();

  // Pattern 1: Explicit keyword prefix e.g. "Clause 2.1", "Clause 3", "Article IV", "Schedule A", "Exhibit 1"
  const explicitMatch = firstLine.match(
    /^(?:clause|section|article|para(?:graph)?\.?|schedule|exhibit|addendum)\s*([0-9IVXLCDM]+(?:\.[0-9a-z]+)*|[A-Z])(?:\s*[\.\:\-\–\—]\s*(.*))?$/i
  );
  if (explicitMatch) {
    const rawPrefix = firstLine.match(/^(?:clause|section|article|para(?:graph)?\.?|schedule|exhibit|addendum)\s*([0-9IVXLCDM]+(?:\.[0-9a-z]+)*|[A-Z])/i)?.[0];
    section = rawPrefix ? rawPrefix.trim().replace(/^section\b/i, "Clause") : `Clause ${explicitMatch[1]}`;
    if (firstLine.length < 100) {
      title = firstLine.replace(/^section\b/i, "Clause");
    } else if (explicitMatch[2]) {
      title = `${section}: ${explicitMatch[2].trim().slice(0, 80)}`;
    } else {
      title = section;
    }
  }

  // Pattern 2: Numbered headings e.g. "1. Compensation", "2.1 Deliverables", "3) Usage Rights", "4.0 Term"
  if (!section) {
    const numberMatch = firstLine.match(
      /^([0-9]+(?:\.[0-9]+)*[a-z]?|\([0-9a-z]+\))\s*[\.\:\-\–\—\)]\s*(.*)$/i
    );
    if (numberMatch) {
      const num = numberMatch[1];
      const rest = numberMatch[2]?.trim();
      section = `Clause ${num}`;
      if (firstLine.length < 100) {
        title = firstLine;
      } else if (rest) {
        title = `${num}. ${rest.slice(0, 80)}`;
      } else {
        title = section;
      }
    }
  }

  // Pattern 3: Roman numeral headings e.g. "I. Scope", "IV. Termination"
  if (!section) {
    const romanMatch = firstLine.match(
      /^([IVXLCDM]+)\s*[\.\:\-\–\—\)]\s*(.*)$/
    );
    if (romanMatch) {
      const num = romanMatch[1];
      const rest = romanMatch[2]?.trim();
      section = `Clause ${num}`;
      if (firstLine.length < 100) {
        title = firstLine;
      } else if (rest) {
        title = `${num}. ${rest.slice(0, 80)}`;
      } else {
        title = section;
      }
    }
  }

  // Pattern 4: Standalone short heading line (e.g. "COMPENSATION AND FEES", "Deliverables:")
  if (!title && firstLine.length > 0 && firstLine.length < 80) {
    const lower = firstLine.toLowerCase();
    const isDocTitle = lower.includes("agreement") || lower.includes("contract") || lower.includes("effective date") || lower.includes("by and between");
    const isUppercase = /^[A-Z0-9\s.,:;()'"\-\/&]+$/.test(firstLine) && firstLine.length > 3 && !firstLine.includes(". ") && !isDocTitle;
    const endsWithColon = firstLine.endsWith(":") && firstLine.length < 60 && !isDocTitle;
    if (isUppercase || endsWithColon) {
      title = firstLine.replace(/:$/, "").trim();
      if (!section) {
        section = title;
      }
    }
  }

  return { section, title };
}

export function segmentText(pages: ExtractedPage[]): SegmentedClause[] {
  const clauses: SegmentedClause[] = [];
  let position = 0;
  let activeSection: string | undefined;
  let activeTitle: string | undefined;

  for (const page of pages) {
    const paragraphs = page.text.replace(/\r\n?/g, "\n").split(/\n{2,}/);

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      const meta = extractClauseMetadata(trimmed);
      // Only set active section if it's an explicit numbered/titled section, not a generic line
      if (meta.section) {
        activeSection = meta.section;
        activeTitle = meta.title || meta.section;
      }

      clauses.push({
        title: meta.title || activeTitle || undefined,
        section: meta.section || activeSection || undefined,
        text: trimmed,
        pageNumber: page.pageNumber,
        position: position++,
      });
    }
  }

  return clauses;
}
