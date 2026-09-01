// server/src/services/import/docx/DocxDrawingExtractor.js

/**
 * Extracts embedded image references and calculates display dimensions from OpenXML drawings
 */
export class DocxDrawingExtractor {
  /**
   * Extract image nodes from a paragraph XML chunk
   * @param {string} pXml
   * @param {Map<string, Object>} rIdMap - Map of rId -> asset object
   * @returns {Array<Object>} List of IR Image nodes
   */
  static extractImages(pXml, rIdMap) {
    const images = [];
    if (!pXml || !pXml.includes('<w:drawing')) return images;

    const drawingRegex = /<w:drawing[\s\S]*?<\/w:drawing>/g;
    let match;

    while ((match = drawingRegex.exec(pXml)) !== null) {
      const drawingXml = match[0];

      // 1. Extract relationship ID (<a:blip r:embed="rIdX"/>)
      const blipMatch = drawingXml.match(/<a:blip[^>]+r:embed="([^"]+)"/i);
      if (!blipMatch) continue;

      const rId = blipMatch[1];
      const asset = rIdMap.get(rId);
      if (!asset) continue;

      // 2. Extract dimensions in EMUs (<wp:extent cx="5486400" cy="3657600"/>)
      // 1 inch = 914400 EMUs = 96 pixels => 1 px = 9525 EMUs
      let width = null;
      let height = null;
      const extentMatch = drawingXml.match(/<wp:extent[^>]+cx="(\d+)"[^>]+cy="(\d+)"/i);
      if (extentMatch) {
        const cxEmus = parseInt(extentMatch[1], 10);
        const cyEmus = parseInt(extentMatch[2], 10);
        if (!isNaN(cxEmus) && !isNaN(cyEmus)) {
          width = Math.round(cxEmus / 9525);
          height = Math.round(cyEmus / 9525);
        }
      }

      // 3. Extract alignment or description
      const descMatch = drawingXml.match(/<wp:docPr[^>]+descr="([^"]*)"/i) || drawingXml.match(/<wp:docPr[^>]+name="([^"]*)"/i);
      const altText = descMatch ? descMatch[1] : asset.fileName;

      images.push({
        type: 'image',
        assetId: asset.id,
        src: asset.id,
        alt: altText || 'Document Image',
        width: width || null,
        height: height || null,
        alignment: 'center',
        caption: '',
      });
    }

    return images;
  }
}

export default DocxDrawingExtractor;
