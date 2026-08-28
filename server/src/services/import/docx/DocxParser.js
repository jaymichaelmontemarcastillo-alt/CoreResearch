// server/src/services/import/docx/DocxParser.js
import mammoth from 'mammoth';

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

    const options = {
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
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        "p[style-name='Title'] => h1.title",
        "p[style-name='Subtitle'] => h2.subtitle",
        "p[style-name='Caption'] => p.caption",
        "p[style-name='caption'] => p.caption",
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
        warnings: result.messages
      }
    };
  }
}

export default DocxParser;
