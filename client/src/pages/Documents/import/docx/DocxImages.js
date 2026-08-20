// src/pages/Documents/import/docx/DocxImages.js
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../../firebase/firebase';

/**
 * Extracts embedded images from word/media/, maps relationship IDs,
 * uploads binaries to Firebase Storage, and calculates display dimensions.
 */
export class DocxImages {
  /**
   * Extract all images and upload them to persistent Firebase Storage
   * @param {Object} zip - JSZip instance
   * @param {string} documentId - Unique document ID
   * @param {string} userId - Current user ID
   * @returns {Promise<Map<string, Object>>} Map of rId -> { src, width, height, alt, assetId }
   */
  static async extractAndUploadImages(zip, documentId, userId = 'general') {
    const imageMap = new Map(); // rId -> { src, width, height, alt, assetId }
    if (!zip) return imageMap;

    // 1. Parse word/_rels/document.xml.rels
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (!relsFile) return imageMap;

    const relsXmlText = await relsFile.async('text');
    const parser = new DOMParser();
    const relsDoc = parser.parseFromString(relsXmlText, 'text/xml');
    const relElements = relsDoc.getElementsByTagName('Relationship');

    const pendingUploads = [];

    for (let i = 0; i < relElements.length; i++) {
      const rel = relElements[i];
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target') || '';
      const type = rel.getAttribute('Type') || '';

      const isImage = type.includes('image') || target.includes('media/') || /\.(png|jpe?g|gif|svg|webp|bmp|tiff)$/i.test(target);
      if (!isImage || !id) continue;

      let mediaPath = target.replace(/^..\//, '');
      if (!mediaPath.startsWith('word/')) {
        mediaPath = `word/${mediaPath.replace(/^\//, '')}`;
      }

      const imgFile = zip.file(mediaPath);
      if (!imgFile) continue;

      const rawFileName = target.split('/').pop() || `image_${id}.png`;
      const cleanFileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const ext = cleanFileName.split('.').pop()?.toLowerCase() || 'png';
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/png';

      pendingUploads.push((async () => {
        try {
          const blob = await imgFile.async('blob');
          const assetId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const storagePath = `documents/${documentId}/assets/${assetId}_${cleanFileName}`;

          let downloadUrl = null;
          try {
            if (storage) {
              const storageRef = ref(storage, storagePath);
              const metadata = {
                contentType: mimeType,
                customMetadata: {
                  documentId,
                  assetId,
                  uploadedBy: userId,
                  originalName: rawFileName,
                },
              };
              const uploadTask = await uploadBytesResumable(storageRef, blob, metadata);
              downloadUrl = await getDownloadURL(uploadTask.ref);
            }
          } catch (storageErr) {
            console.warn('[DocxImages] Firebase Storage upload notice (using blob URL fallback):', storageErr.message);
          }

          if (!downloadUrl) {
            // Fallback for offline/dev environments
            const base64 = await imgFile.async('base64');
            downloadUrl = `data:${mimeType};base64,${base64}`;
          }

          imageMap.set(id, {
            src: downloadUrl,
            assetId,
            fileName: cleanFileName,
            mimeType,
          });
        } catch (imgErr) {
          console.warn(`[DocxImages] Failed processing image for rId ${id}:`, imgErr.message);
        }
      })());
    }

    await Promise.all(pendingUploads);
    return imageMap;
  }

  /**
   * Parse drawing XML element to extract embedded image nodes with dimensions and alignment
   * @param {Element} pElem - Paragraph XML DOM Element
   * @param {Map<string, Object>} imageMap - Map of rId -> image info
   * @returns {Array<Object>} List of IR Image nodes
   */
  static extractImagesFromParagraph(pElem, imageMap) {
    const images = [];
    if (!pElem || !imageMap || imageMap.size === 0) return images;

    const drawings = pElem.getElementsByTagName('w:drawing');
    for (let d = 0; d < drawings.length; d++) {
      const drawing = drawings[d];
      const blip = drawing.getElementsByTagName('a:blip')[0];
      if (!blip) continue;

      const embedId = blip.getAttribute('r:embed');
      if (!embedId || !imageMap.has(embedId)) continue;

      const imgInfo = imageMap.get(embedId);

      // Extract explicit dimensions from EMUs
      // 1 inch = 914400 EMUs = 96 px => 1 px = 9525 EMUs
      let width = null;
      let height = null;
      const extent = drawing.getElementsByTagName('wp:extent')[0];
      if (extent) {
        const cx = parseInt(extent.getAttribute('cx') || '0', 10);
        const cy = parseInt(extent.getAttribute('cy') || '0', 10);
        if (cx > 0) width = Math.round(cx / 9525);
        if (cy > 0) height = Math.round(cy / 9525);
      }

      const docPr = drawing.getElementsByTagName('wp:docPr')[0];
      const alt = docPr ? (docPr.getAttribute('descr') || docPr.getAttribute('name') || 'Document Image') : 'Document Image';

      images.push({
        type: 'image',
        assetId: imgInfo.assetId || '',
        src: imgInfo.src,
        alt,
        width: width || null,
        height: height || null,
        alignment: 'center',
        caption: '',
      });
    }

    return images;
  }
}

export default DocxImages;
