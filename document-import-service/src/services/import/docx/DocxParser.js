import mammoth from 'mammoth';

export class DocxParser {
  /**
   * Parse DOCX file into HTML and extracted assets
   * @param {string} filePath
   * @param {string} fileName
   * @returns {Promise<{ html: string, assets: Array, metadata: Object }>}
   */
  async parse(filePath, fileName = 'Document.docx') {
    const assets = [];
    const title = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

    try {
      console.log(`[DocxParser] Starting mammoth conversion for ${fileName}...`);
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
            
            // Push binary to assets array for later upload
            assets.push({
              id: assetId,
              fileName: assetId,
              mimeType,
              buffer: Buffer.from(imageBuffer, 'base64'),
            });

            // CRITICAL MEMORY FIX: Do NOT put the massive Base64 string into the src attribute.
            // We return an empty src and pass the assetId. The DocumentImportService will replace
            // the src with the final Cloud Storage URL later.
            return {
              src: "",
              "data-asset-id": assetId
            };
          });
        }),
      styleMap: [
        "p[style-name='Heading 1'] => p:fresh",
        "p[style-name='Heading 1-align-center'] => p.align-center:fresh",
        "p[style-name='Heading 1-align-right'] => p.align-right:fresh",
        "p[style-name='Heading 1-align-justify'] => p.align-justify:fresh",
        
        "p[style-name='Heading 2'] => p:fresh",
        "p[style-name='Heading 2-align-center'] => p.align-center:fresh",
        "p[style-name='Heading 2-align-right'] => p.align-right:fresh",
        "p[style-name='Heading 2-align-justify'] => p.align-justify:fresh",
        
        "p[style-name='Heading 3'] => p:fresh",
        "p[style-name='Heading 3-align-center'] => p.align-center:fresh",
        "p[style-name='Heading 3-align-right'] => p.align-right:fresh",
        "p[style-name='Heading 3-align-justify'] => p.align-justify:fresh",
        
        "p[style-name='Heading 4'] => p:fresh",
        "p[style-name='Heading 5'] => p:fresh",
        "p[style-name='Heading 6'] => p:fresh",
        
        "p[style-name='Title'] => p:fresh",
        "p[style-name='Subtitle'] => p:fresh",
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

      const result = await mammoth.convertToHtml({ path: filePath }, options);
      
      const finalHtml = result.value || '<p></p>';

      return {
        html: finalHtml,
        assets,
        metadata: {
          title,
          sourceFormat: 'docx',
          warnings: result.messages,
          // Since we removed fast-xml-parser, we don't extract strict pageSettings anymore,
          // which is correct for our "Normalize on Input" strategy.
          pageSettings: null 
        }
      };
    } catch (err) {
      console.error(`[DocxParser] Fatal error during parse:`, err);
      throw err;
    }
  }
}

export default DocxParser;

