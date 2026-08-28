// server/src/scripts/generate_fidelity_test.js
import fs from 'fs';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

// Ensure docx is installed: npm install docx

async function generateTestDocument() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // 210mm in twips (A4)
              height: 16838, // 297mm in twips (A4)
            },
            margin: {
              top: 1440,    // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            }
          }
        },
        children: [
          new Paragraph({
            text: "CoreResearch Fidelity Test Document",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "Typography Test",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "This is normal text. ", font: "Times New Roman" }),
              new TextRun({ text: "This is bold. ", bold: true }),
              new TextRun({ text: "This is italic. ", italics: true }),
              new TextRun({ text: "This is underline. ", underline: {} }),
              new TextRun({ text: "This is superscript", superScript: true }),
              new TextRun(" and "),
              new TextRun({ text: "subscript", subScript: true }),
              new TextRun(". "),
              new TextRun({ text: "This is a large font. ", size: 36 }), // 18pt
              new TextRun({ text: "This is red text.", color: "FF0000" }),
            ],
          }),
          new Paragraph({
            text: "Paragraph Formatting Test",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: "This paragraph is left aligned.",
            alignment: AlignmentType.LEFT,
          }),
          new Paragraph({
            text: "This paragraph is center aligned.",
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "This paragraph is right aligned.",
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            text: "This paragraph is justified. ".repeat(10),
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            text: "This paragraph has a first-line indentation and double line spacing.",
            indent: { firstLine: 720 }, // 0.5 inch
            spacing: { line: 480 }, // double spacing
          }),
          new Paragraph({
            text: "Page Break Test",
            heading: HeadingLevel.HEADING_2,
            pageBreakBefore: true,
          }),
          new Paragraph({
            text: "This text should appear on the second page.",
          })
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('CoreResearch-DOCX-Fidelity-Test.docx', buffer);
  console.log('Successfully created CoreResearch-DOCX-Fidelity-Test.docx');
}

generateTestDocument().catch(console.error);
