import mammoth from 'mammoth';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

export class DocxParser {
  /**
   * Parse DOCX buffer into HTML and extracted assets
   * @param {Buffer} docxBuffer
   * @param {string} fileName
   * @returns {Promise<{ html: string, assets: Array, metadata: Object }>}
   */
  async parse(docxBuffer, fileName = 'Document.docx') {
    const assets = [];
    const title = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

    let pageSettings = null;
    try {
      // Extract exact geometry from docx XML
      const zip = new AdmZip(docxBuffer);
      const documentXml = zip.readAsText('word/document.xml');
      if (documentXml) {
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
        const parsed = parser.parse(documentXml);
        const body = parsed['w:document']?.['w:body'];
        if (body && body['w:sectPr']) {
          const sectPr = body['w:sectPr'];
          const pgSz = sectPr['w:pgSz'];
          const pgMar = sectPr['w:pgMar'];
          
          if (pgSz && pgMar) {
            // Convert twips to inches (1440 twips = 1 inch)
            const twipsToInches = (twips) => twips ? `${(parseInt(twips, 10) / 1440).toFixed(2)}in` : '1in';
            
            // Determine size string
            const wInches = parseInt(pgSz['@_w'] || 12240) / 1440;
            const hInches = parseInt(pgSz['@_h'] || 15840) / 1440;
            
            let size = 'letter';
            if (Math.abs(wInches - 8.27) < 0.2 && Math.abs(hInches - 11.69) < 0.2) size = 'a4';
            else if (Math.abs(wInches - 8.5) < 0.2 && Math.abs(hInches - 14) < 0.2) size = 'legal';
            
            pageSettings = {
              size,
              orientation: pgSz['@_orient'] === 'landscape' ? 'landscape' : 'portrait',
              marginTop: twipsToInches(pgMar['@_top']),
              marginBottom: twipsToInches(pgMar['@_bottom']),
              marginLeft: twipsToInches(pgMar['@_left']),
              marginRight: twipsToInches(pgMar['@_right'])
            };
          }
        }
      }
    } catch (err) {
      console.warn('[DocxParser] Failed to extract page geometry:', err.message);
    }

    const options = {
      transformDocument: mammoth.transforms.paragraph((element) => {
        if (element.alignment && element.alignment !== "left") {
          const baseName = element.styleName || "p";
          return {
            ...element,
            styleName: `${baseName}-align-${element.alignment}`,
            styleId: `${baseName}-align-${element.alignment}`
          };
        }
        return element;
      }),
      convertImage: mammoth.images.inline((element) => {
        return element.read("base64").then((imageBuffer) => {
          const mimeType = element.contentType;
          const ext = mimeType.split('/')[1] || 'png';
          const assetId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
          
          assets.push({
            id: assetId,
            fileName: assetId,
            mimeType,
            buffer: Buffer.from(imageBuffer, 'base64'),
          });

          // We return an image with a custom data-asset-id. Downstream, once the image
          // is uploaded to GridFS, we can replace the src with the GridFS URL.
          return {
            src: `data:${mimeType};base64,${imageBuffer}`,
            "data-asset-id": assetId
          };
        });
      }),
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 1-align-center'] => h1.align-center:fresh",
        "p[style-name='Heading 1-align-right'] => h1.align-right:fresh",
        "p[style-name='Heading 1-align-justify'] => h1.align-justify:fresh",
        
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 2-align-center'] => h2.align-center:fresh",
        "p[style-name='Heading 2-align-right'] => h2.align-right:fresh",
        "p[style-name='Heading 2-align-justify'] => h2.align-justify:fresh",
        
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 3-align-center'] => h3.align-center:fresh",
        "p[style-name='Heading 3-align-right'] => h3.align-right:fresh",
        "p[style-name='Heading 3-align-justify'] => h3.align-justify:fresh",
        
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        
        "p[style-name='Title'] => h1.title",
        "p[style-name='Subtitle'] => h2.subtitle",
        "p[style-name='Caption'] => p.caption",
        "p[style-name='caption'] => p.caption",
        
        "p[style-name='p-align-center'] => p.align-center:fresh",
        "p[style-name='p-align-right'] => p.align-right:fresh",
        "p[style-name='p-align-justify'] => p.align-justify:fresh",
        
        "br[type='page'] => hr.page-break",
        "b => strong",
        "i => em",
        "u => u",
        "strike => s",
      ]
    };

    const result = await mammoth.convertToHtml({ buffer: docxBuffer }, options);
    
    return {
      html: result.value || '<p></p>',
      assets,
      metadata: {
        title,
        sourceFormat: 'docx',
        warnings: result.messages,
        pageSettings
      }
    };
  }
}

export default DocxParser;
