import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { jsPDF } from "jspdf";

export async function downloadRevisedAsDocx(
  contractTitle: string,
  contractText: string,
  filename: string
) {
  const baseName = filename.replace(/\.[^/.]+$/, "");
  const paragraphs: Paragraph[] = [];

  // Title heading
  paragraphs.push(
    new Paragraph({
      text: contractTitle || "Revised Agreement",
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 },
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Revised & Generated via PactIQ on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
          italics: true,
          size: 18,
          color: "666666",
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Split text by lines / sections
  const lines = contractText.split("\n");
  let currentParaText: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentParaText.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: currentParaText.join(" "), size: 22 })],
            spacing: { after: 200 },
          })
        );
        currentParaText = [];
      }
      continue;
    }

    // Check if line looks like a heading or section header (e.g., [Section 1] or Section 1:)
    if (
      /^(\[.+\]|SECTION\s+\d+|CLAUSE\s+\d+|\d+\.\s+[A-Z\s]+|RECITALS|DEFINITIONS|GOVERNING LAW)/i.test(
        trimmed
      ) &&
      trimmed.length < 80
    ) {
      if (currentParaText.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: currentParaText.join(" "), size: 22 })],
            spacing: { after: 200 },
          })
        );
        currentParaText = [];
      }

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed.replace(/^\[|\]$/g, ""),
              bold: true,
              size: 24,
            }),
          ],
          spacing: { before: 300, after: 150 },
        })
      );
    } else {
      currentParaText.push(trimmed);
    }
  }

  if (currentParaText.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: currentParaText.join(" "), size: 22 })],
        spacing: { after: 200 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${baseName}_PactIQ_Revised.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadRevisedAsPdf(
  contractTitle: string,
  contractText: string,
  filename: string
) {
  const baseName = filename.replace(/\.[^/.]+$/, "");
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 45;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(contractTitle || "Revised Agreement", margin, y);
  y += 20;

  // Subtitle
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(
    `Revised via PactIQ on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · Original contract preserved`,
    margin,
    y
  );
  y += 22;

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85); // slate-700

  const lines = contractText.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      y += 10;
      continue;
    }

    const isHeader =
      /^(\[.+\]|SECTION\s+\d+|CLAUSE\s+\d+|\d+\.\s+[A-Z\s]+|RECITALS|DEFINITIONS|GOVERNING LAW)/i.test(
        line
      ) && line.length < 80;

    if (isHeader) {
      y += 8;
      if (y > pageHeight - margin - 30) {
        doc.addPage();
        y = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate-900
      const headerText = line.replace(/^\[|\]$/g, "");
      doc.text(headerText, margin, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      continue;
    }

    const wrappedLines = doc.splitTextToSize(line, contentWidth);
    for (const textLine of wrappedLines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(textLine, margin, y);
      y += 14;
    }
  }

  // Add Page Numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${totalPages} · PactIQ Revised Document`,
      pageWidth / 2,
      pageHeight - 20,
      { align: "center" }
    );
  }

  doc.save(`${baseName}_PactIQ_Revised.pdf`);
}
