import { extractText as extractPdfText } from "unpdf";
import mammoth from "mammoth";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedDocument {
  text: string;
  pages: ExtractedPage[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function extractText(
  fileBuffer: Buffer,
  filename: string
): Promise<ExtractedDocument> {
  const extension = filename.split(".").pop()?.toLowerCase();

  if (extension === "pdf") {
    try {
      const pdfData = new Uint8Array(fileBuffer);
      const { text: pageTexts } = await extractPdfText(pdfData, { mergePages: false });

      const rawPages = Array.isArray(pageTexts) ? pageTexts : [pageTexts];
      const pages: ExtractedPage[] = rawPages
        .map((pageStr, idx) => ({
          pageNumber: idx + 1,
          text: (typeof pageStr === "string" ? pageStr : "").trim(),
        }))
        .filter((page) => page.text.length > 0);

      const fullText = pages.map((p) => p.text).join("\n\n").trim();

      if (!fullText || pages.length === 0) {
        throw new Error(
          "No selectable text was found. This appears to be a scanned or image-only PDF; please upload a text-based PDF or DOCX."
        );
      }

      return { text: fullText, pages };
    } catch (error: unknown) {
      throw new Error(`Failed to parse PDF: ${errorMessage(error)}`);
    }
  } else if (extension === "docx") {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      if (!result.value || !result.value.trim()) {
        throw new Error("Extracted text is empty.");
      }
      const text = result.value.trim();
      return { text, pages: [{ pageNumber: 1, text }] };
    } catch (error: unknown) {
      throw new Error(`Failed to parse DOCX: ${errorMessage(error)}`);
    }
  }

  throw new Error(`Unsupported file type: ${extension}. Only PDF and DOCX are allowed.`);
}
