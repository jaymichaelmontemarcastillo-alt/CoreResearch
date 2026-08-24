// scratch/test_import_pipeline.mjs
import fs from 'fs';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  UnderlineType,
  ShadingType,
  PageBreak,
} from '../client/node_modules/docx/dist/index.mjs';
import { DocxParser } from '../server/src/services/import/docx/DocxParser.js';
import { DocumentIRToTiptap } from '../server/src/services/import/tiptap/documentIRToTiptap.js';

async function runTest() {
  console.log('--- 1. Generating High-Fidelity Test DOCX ---');

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: [
          new Paragraph({
            text: 'Deep Learning for Autonomous Vehicles',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Abstract: ',
                bold: true,
                font: 'Calibri',
                size: 24, // 12pt
              }),
              new TextRun({
                text: 'This paper investigates real-time sensor fusion algorithms in edge computing environments.',
                italic: true,
                font: 'Calibri',
                size: 24,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Key Performance Metrics',
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                color: '1F497D',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Model', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Inference (ms)', bold: true })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Accuracy (%)', bold: true })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'YOLOv8-Nano' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: '12.4' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: '94.2%' })],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            children: [new PageBreak()],
          }),
          new Paragraph({
            text: 'Chapter 2: Methodology & System Architecture',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The architecture utilizes hardware-accelerated tensor pipelines.',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('c:/CoreResearch-Official/CoreResearch/scratch/test_doc.docx', buffer);
  console.log('✓ Created test_doc.docx');

  console.log('--- 2. Parsing with Server DocxParser ---');
  const parser = new DocxParser();
  const ir = await parser.parse(buffer, 'test_doc.docx');

  console.log('✓ DocumentIR Title:', ir.metadata.title);
  console.log('✓ DocumentIR Page Settings:', JSON.stringify(ir.pageSettings));
  console.log('✓ DocumentIR Node Count:', ir.nodes.length);

  console.log('--- 3. Converting to Tiptap JSON ---');
  const converter = new DocumentIRToTiptap();
  const { tiptapJson, contentHtml, plainText } = converter.convert(ir);

  console.log('✓ Tiptap Doc Type:', tiptapJson.type);
  console.log('✓ Tiptap Root Nodes Count:', tiptapJson.content.length);
  console.log('✓ Extracted Plain Text:\n', plainText);

  // Validate structures
  const hasHeading = tiptapJson.content.some((n) => n.type === 'heading' && n.attrs.level === 1);
  const hasTable = tiptapJson.content.some((n) => n.type === 'table');
  const hasPageBreak = tiptapJson.content.some((n) => n.type === 'horizontalRule');

  console.log('\n--- Validation Summary ---');
  console.log('Heading 1 preserved:', hasHeading ? 'PASS ✓' : 'FAIL ✗');
  console.log('Table preserved:', hasTable ? 'PASS ✓' : 'FAIL ✗');
  console.log('Page break preserved:', hasPageBreak ? 'PASS ✓' : 'FAIL ✗');
  console.log('Page settings preserved:', ir.pageSettings.marginTop === '1.00in' || ir.pageSettings.marginTop === '1in' ? 'PASS ✓' : 'FAIL ✗');

  if (hasHeading && hasTable && hasPageBreak) {
    console.log('\n🎉 ALL PIPELINE TESTS PASSED SUCCESSFULLY!');
  } else {
    throw new Error('Pipeline test assertions failed.');
  }
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
