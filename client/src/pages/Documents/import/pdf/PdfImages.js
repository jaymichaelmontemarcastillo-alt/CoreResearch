// src/pages/Documents/import/pdf/PdfImages.js
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../../firebase/firebase';
import { createImageNode } from '../ir/DocumentIR';

/**
 * Extracts embedded raster images (XObjects) from PDF pages and uploads them to Firebase Storage
 */
export class PdfImages {
  /**
   * Extract image nodes from a PDF page
   * @param {Object} page - pdfjs page object
   * @param {number} pageNum - 1-based page index
   * @param {string} documentId - Target document ID
   * @param {string} userId - Current user ID
   * @returns {Promise<Array<Object>>} List of IR Image nodes
   */
  static async extractPageImages(page, pageNum, documentId, userId = 'general') {
    const images = [];
    if (!page || typeof page.getOperatorList !== 'function') return images;

    try {
      const ops = await page.getOperatorList();
      if (!ops || !ops.fnArray || !ops.argsArray) return images;

      // pdfjs-dist OPS constants: paintImageXObject (85), paintInlineImageXObject (86), paintImageMaskXObject (87)
      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        const args = ops.argsArray[i];

        if (fn === 85 || fn === 86 || fn === 87) {
          const imgName = args[0];
          if (!imgName) continue;

          try {
            // Check if page object has image data
            const imgObj = await new Promise((resolve) => {
              if (page.objs && typeof page.objs.get === 'function') {
                page.objs.get(imgName, (obj) => resolve(obj));
              } else {
                resolve(null);
              }
            });

            if (imgObj && imgObj.data && imgObj.width > 50 && imgObj.height > 50) {
              const canvas = document.createElement('canvas');
              canvas.width = imgObj.width;
              canvas.height = imgObj.height;
              const ctx = canvas.getContext('2d');

              if (ctx) {
                const imgData = ctx.createImageData(imgObj.width, imgObj.height);
                const srcData = imgObj.data;

                if (srcData.length === imgObj.width * imgObj.height * 4) {
                  imgData.data.set(srcData);
                } else if (srcData.length === imgObj.width * imgObj.height * 3) {
                  // RGB to RGBA
                  let srcIdx = 0;
                  let dstIdx = 0;
                  while (srcIdx < srcData.length) {
                    imgData.data[dstIdx] = srcData[srcIdx];
                    imgData.data[dstIdx + 1] = srcData[srcIdx + 1];
                    imgData.data[dstIdx + 2] = srcData[srcIdx + 2];
                    imgData.data[dstIdx + 3] = 255;
                    srcIdx += 3;
                    dstIdx += 4;
                  }
                }

                ctx.putImageData(imgData, 0, 0);

                const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
                if (blob) {
                  const assetId = `pdf_img_p${pageNum}_${i}_${Date.now()}`;
                  const storagePath = `documents/${documentId}/assets/${assetId}.png`;

                  let downloadUrl = null;
                  try {
                    if (storage) {
                      const storageRef = ref(storage, storagePath);
                      const metadata = {
                        contentType: 'image/png',
                        customMetadata: {
                          documentId,
                          assetId,
                          uploadedBy: userId,
                          page: String(pageNum),
                        },
                      };
                      const uploadTask = await uploadBytesResumable(storageRef, blob, metadata);
                      downloadUrl = await getDownloadURL(uploadTask.ref);
                    }
                  } catch (storageErr) {
                    console.warn('[PdfImages] Storage upload fallback notice:', storageErr.message);
                  }

                  if (!downloadUrl) {
                    downloadUrl = canvas.toDataURL('image/png');
                  }

                  images.push(
                    createImageNode({
                      assetId,
                      src: downloadUrl,
                      alt: `Page ${pageNum} Image`,
                      width: Math.min(imgObj.width, 650),
                      height: imgObj.height,
                      alignment: 'center',
                    })
                  );
                }
              }
            }
          } catch (objErr) {
            // Ignore single image extraction error
          }
        }
      }
    } catch (err) {
      console.warn('[PdfImages] Operator list scan notice:', err.message);
    }

    return images;
  }
}

export default PdfImages;
