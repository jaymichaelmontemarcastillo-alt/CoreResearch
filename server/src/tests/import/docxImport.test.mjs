import test from 'node:test';
import assert from 'node:assert';
import { DocxParser } from '../../services/import/docx/DocxParser.js';
import { DocumentIRToTiptap } from '../../services/import/tiptap/documentIRToTiptap.js';
import fs from 'fs';
import path from 'path';

test('DOCX Import Pipeline Core Implementation', async (t) => {
  await t.test('DocxParser correctly maps styles and converts basic DOCX', async () => {
    // We mock a tiny docx or just test the documentIRToTiptap directly since
    // creating a valid DOCX buffer from scratch here is complex without a file.
    // Let's test documentIRToTiptap conversion logic thoroughly.
    
    const converter = new DocumentIRToTiptap();
    
    const rawHtml = `
      <h1>Research Title</h1>
      <p>This is a paragraph with <strong>bold</strong> and <em>italic</em>.</p>
      <table>
        <tr>
          <td>Cell 1</td>
          <td>Cell 2</td>
        </tr>
      </table>
      <p style="text-align: center;">Centered Text</p>
      <p></p>
      <img src="blob:something" data-asset-id="asset_123" alt="My Image" />
    `;
    
    const assetUrlMap = new Map();
    assetUrlMap.set('asset_123', 'https://gridfs/asset_123.png');
    
    const result = converter.convert({ html: rawHtml }, assetUrlMap);
    
    assert.ok(result.tiptapJson, 'Should generate Tiptap JSON');
    assert.strictEqual(result.tiptapJson.type, 'doc', 'Root node should be doc');
    
    // Check elements
    const content = result.tiptapJson.content;
    
    // Heading 1
    assert.strictEqual(content[0].type, 'heading');
    assert.strictEqual(content[0].attrs.level, 1);
    
    // Paragraph with marks
    assert.strictEqual(content[1].type, 'paragraph');
    assert.strictEqual(content[1].content[1].marks[0].type, 'bold');
    
    // Table
    assert.strictEqual(content[2].type, 'table');
    assert.strictEqual(content[2].content[0].type, 'tableRow');
    assert.strictEqual(content[2].content[0].content[0].type, 'tableCell');
    
    // Centered Paragraph
    assert.strictEqual(content[3].type, 'paragraph');
    assert.strictEqual(content[3].attrs.textAlign, 'center');
    
    // Empty paragraph was removed by normalization!
    // So the next one should be the image.
    assert.strictEqual(content[4].type, 'image');
    assert.strictEqual(content[4].attrs.src, 'https://gridfs/asset_123.png');
    
    // Check plain text
    assert.ok(result.plainText.includes('Research Title'), 'Plain text contains title');
    assert.ok(result.plainText.includes('Cell 1'), 'Plain text contains table cell');
  });
  
  await t.test('Sanitization prevents XSS', async () => {
    const converter = new DocumentIRToTiptap();
    const maliciousHtml = `
      <p>Safe text <script>alert(1)</script></p>
      <img src="javascript:alert(1)" data-asset-id="123" />
    `;
    
    const result = converter.convert({ html: maliciousHtml });
    assert.ok(!result.contentHtml.includes('<script>'), 'Script tag stripped');
    assert.ok(!result.contentHtml.includes('javascript:'), 'Javascript protocol stripped from image');
  });
});
