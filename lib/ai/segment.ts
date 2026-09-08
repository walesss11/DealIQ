import type { ExtractedPage } from "./extract";

export interface SegmentedClause {
  title?: string;
  section?: string;
  text: string;
  pageNumber?: number;
  position: number;
}

export function segmentText(pages: ExtractedPage[]): SegmentedClause[] {
  const clauses: SegmentedClause[] = [];
  let position = 0;

  for (const page of pages) {
    const paragraphs = page.text.replace(/\r\n?/g, "\n").split(/\n{2,}/);

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      let title: string | undefined;
      let section: string | undefined;

    // Pattern 1: Section X.Y or Article X
      const sectionMatch = trimmed.match(
        /^(?:section|article|clause|para\.?)\s*(\d+(?:\.\d+)*[a-z]?)/i
      );
      if (sectionMatch) section = sectionMatch[0];

    // Pattern 2: First line is short and uppercase or bold-like title (less than 60 chars)
      const firstLine = trimmed.split("\n")[0].trim();
      if (firstLine.length > 0 && firstLine.length < 80) {
        if (
          /^[A-Z0-9\s.,:;()'"\-\/&]+$/.test(firstLine) ||
          firstLine.endsWith(":") ||
          section
        ) {
          title = firstLine;
        }
      }

      clauses.push({
        title: title || undefined,
        section: section || undefined,
        text: trimmed,
        pageNumber: page.pageNumber,
        position: position++,
      });
    }
  }

  return clauses;
}
