// server/src/services/import/docx/LibreOfficeParser.js
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import * as cheerio from 'cheerio';
import { convertToHtml } from '../../../utils/execLibreOffice.js';

export class LibreOfficeParser {
  /**
   * Parse DOCX file into HTML and extracted assets using LibreOffice
   * @param {string} filePath
   * @param {string} fileName
   * @returns {Promise<{ html: string, assets: Array, metadata: Object }>}
   */
  async parse(filePath, fileName = 'Document.docx') {
    const assets = [];
    const title = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    
    // 1. Create a unique temporary directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cr-import-'));
    
    // Create a safe, unique filename for the DOCX
    const safeName = `doc_${Date.now()}`;
    const inputFilePath = path.join(tempDir, `${safeName}.docx`);
    
    try {
      // 2. Copy the file to the temporary directory
      await fs.copyFile(filePath, inputFilePath);
      
      // 3. Convert DOCX to HTML
      const htmlFilePath = await convertToHtml(inputFilePath, tempDir);
      
      // 4. Read the generated HTML
      const htmlContent = await fs.readFile(htmlFilePath, 'utf-8');
      
      // 5. Parse HTML and extract images
      const $ = cheerio.load(htmlContent);
      
      // LibreOffice extracts images to the same directory or subdirectories
      const imgPromises = [];
      
      $('img').each((i, el) => {
        const src = $(el).attr('src');
        if (src) {
          // Decode URL in case LibreOffice percent-encoded the local file path
          const decodedSrc = decodeURIComponent(src);
          // Resolve image path relative to the HTML file
          const imagePath = path.resolve(tempDir, decodedSrc);
          
          imgPromises.push((async () => {
            try {
              // Ensure the path is actually within the tempDir for security
              if (!imagePath.startsWith(path.resolve(tempDir))) {
                throw new Error('Image path escapes temporary directory');
              }

              const imageBuffer = await fs.readFile(imagePath);
              const ext = path.extname(imagePath).replace('.', '').toLowerCase() || 'png';
              
              const mimeTypes = {
                'png': 'image/png',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'gif': 'image/gif',
                'svg': 'image/svg+xml',
                'webp': 'image/webp'
              };
              const mimeType = mimeTypes[ext] || `image/${ext}`;
              
              const assetId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
              
              assets.push({
                id: assetId,
                fileName: assetId,
                mimeType,
                buffer: imageBuffer,
              });
              
              // Replace src with data URI and add data-asset-id to match Mammoth behavior
              const base64Data = imageBuffer.toString('base64');
              $(el).attr('src', `data:${mimeType};base64,${base64Data}`);
              $(el).attr('data-asset-id', assetId);
              
            } catch (imgErr) {
              console.warn(`[LibreOfficeParser] Failed to read extracted image ${imagePath}:`, imgErr.message);
            }
          })());
        }
      });
      
      await Promise.all(imgPromises);
      
      // Note: LibreOffice sometimes applies styles inside a <style> tag in <head>, 
      // but cheerio handles the DOM structure and we output the <body> content.
      // We will grab the body HTML.
      const bodyHtml = $('body').html() || $.html();
      
      return {
        html: bodyHtml || '<p></p>',
        assets,
        metadata: {
          title,
          sourceFormat: 'docx',
          warnings: [] // LibreOffice headless doesn't typically output warnings to parse
        }
      };
      
    } finally {
      // 6. Clean up temporary directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn(`[LibreOfficeParser] Failed to clean up temp dir ${tempDir}:`, cleanupErr.message);
      }
    }
  }
}

export default LibreOfficeParser;
