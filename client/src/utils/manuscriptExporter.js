// src/utils/manuscriptExporter.js
/**
 * Utility functions for exporting and importing manuscript documents
 * Supports DOCX export, PDF export, and File text extraction.
 */

// Helper to sanitize HTML for exports
const getStyledHtmlDocument = (contentHtml, title = "Manuscript") => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: letter;
            margin: 1in;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.8;
            color: #111827;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
          }
          h1 { font-size: 18pt; text-align: center; margin-bottom: 12pt; text-transform: uppercase; font-weight: bold; }
          h2 { font-size: 14pt; margin-top: 18pt; margin-bottom: 8pt; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
          h3 { font-size: 12pt; margin-top: 14pt; margin-bottom: 6pt; font-weight: bold; }
          p { margin-bottom: 12pt; text-align: justify; text-indent: 0.5in; }
          ul, ol { margin-left: 0.5in; margin-bottom: 12pt; }
          li { margin-bottom: 4pt; }
          blockquote { margin-left: 0.5in; margin-right: 0.5in; font-style: italic; border-left: 3px solid #64748b; padding-left: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16pt; }
          th, td { border: 1px solid #94a3b8; padding: 8px; font-size: 11pt; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          hr { border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0; }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
    </html>
  `;
};

/**
 * Export manuscript HTML to a downloadable DOCX file
 */
export const exportToDocx = async (contentHtml, fileName = "Manuscript.docx", title = "Manuscript") => {
  try {
    // Try dynamic import of docx package if installed
    let docxModule = null;
    try {
      docxModule = await import("docx");
    } catch (e) {
      console.warn("docx package dynamic import unavailable, using HTML-Blob DOCX fallback.", e);
    }

    if (docxModule && docxModule.Document && docxModule.Packer) {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docxModule;

      // Parse basic HTML DOM elements
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${contentHtml}</div>`, "text/html");
      const children = Array.from(doc.body.firstChild.children || []);

      const docxChildren = [];

      children.forEach((child) => {
        const text = child.textContent || "";
        const tag = child.tagName.toLowerCase();

        if (tag === "h1") {
          docxChildren.push(
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200, before: 200 },
            })
          );
        } else if (tag === "h2") {
          docxChildren.push(
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 150, before: 300 },
            })
          );
        } else if (tag === "h3") {
          docxChildren.push(
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 100, before: 200 },
            })
          );
        } else if (tag === "ul" || tag === "ol") {
          Array.from(child.children).forEach((li) => {
            docxChildren.push(
              new Paragraph({
                text: li.textContent || "",
                bullet: { level: 0 },
                spacing: { after: 80 },
              })
            );
          });
        } else {
          docxChildren.push(
            new Paragraph({
              children: [new TextRun({ text, font: "Times New Roman", size: 24 })],
              spacing: { after: 160, line: 360 },
            })
          );
        }
      });

      const docxDocument = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch
              },
            },
            children: docxChildren.length > 0 ? docxChildren : [
              new Paragraph({ children: [new TextRun({ text: doc.body.textContent || "" })] })
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(docxDocument);
      saveBlob(blob, fileName.endsWith(".docx") ? fileName : `${fileName}.docx`);
      return true;
    }

    // HTML-Blob Fallback for DOCX download
    const fullHtml = getStyledHtmlDocument(contentHtml, title);
    const blob = new Blob(["\ufeff", fullHtml], {
      type: "application/msword",
    });
    saveBlob(blob, fileName.endsWith(".docx") ? fileName : `${fileName}.docx`);
    return true;
  } catch (err) {
    console.error("[ExportDocx] Error exporting manuscript to DOCX:", err);
    // Ultimate fallback to HTML Blob
    const blob = new Blob([getStyledHtmlDocument(contentHtml, title)], { type: "application/msword" });
    saveBlob(blob, fileName.endsWith(".docx") ? fileName : `${fileName}.docx`);
    return true;
  }
};

/**
 * Export manuscript HTML to a downloadable PDF file
 */
export const exportToPdf = async (contentHtml, fileName = "Manuscript.pdf", title = "Manuscript") => {
  try {
    let html2pdfModule = null;
    try {
      html2pdfModule = (await import("html2pdf.js")).default;
    } catch (e) {
      console.warn("html2pdf.js dynamic import unavailable, using print-PDF fallback.", e);
    }

    if (html2pdfModule) {
      const container = document.createElement("div");
      container.innerHTML = contentHtml;
      container.style.padding = "20px";
      container.style.fontFamily = "Times New Roman, serif";
      container.style.fontSize = "12pt";
      container.style.lineHeight = "1.8";
      container.style.color = "#000000";

      const opt = {
        margin: [0.75, 0.75, 0.75, 0.75],
        filename: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };

      await html2pdfModule().from(container).set(opt).save();
      return true;
    }

    // Print window fallback for PDF saving
    const printWindow = window.open("", "_blank");
    printWindow.document.write(getStyledHtmlDocument(contentHtml, title));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
    return true;
  } catch (err) {
    console.error("[ExportPdf] Error exporting manuscript to PDF:", err);
    const printWindow = window.open("", "_blank");
    printWindow.document.write(getStyledHtmlDocument(contentHtml, title));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
    return true;
  }
};

/**
 * Helper to trigger browser file download for a blob
 */
const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Extract rich HTML from an uploaded text/HTML/DOCX/PDF file with formatting preservation
 */
export const extractTextFromFile = async (file) => {
  if (!file) return '';

  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  try {
    if (ext === 'docx') {
      const { clientDocxParser } = await import('../pages/Documents/import/docx/ClientDocxParser');
      const { clientDocumentIRToTiptap } = await import('../pages/Documents/import/tiptap/documentIRToTiptap');
      const ir = await clientDocxParser.parse(file, file.name);
      const { contentHtml } = clientDocumentIRToTiptap.convert(ir);
      return contentHtml;
    } else if (ext === 'pdf') {
      const { clientPdfParser } = await import('../pages/Documents/import/pdf/ClientPdfParser');
      const { clientDocumentIRToTiptap } = await import('../pages/Documents/import/tiptap/documentIRToTiptap');
      const ir = await clientPdfParser.parse(file, file.name);
      const { contentHtml } = clientDocumentIRToTiptap.convert(ir);
      return contentHtml;
    } else if (file.type === 'text/plain' || file.type === 'text/html' || ext === 'txt' || ext === 'html') {
      return await file.text();
    }
  } catch (err) {
    console.warn('[manuscriptExporter] High-fidelity extract fallback:', err.message);
  }

  // Fallback text reader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const cleanText = typeof text === 'string' ? text.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s+/g, ' ') : '';
      resolve(`<h2>Imported File: ${file.name}</h2><p>${cleanText.slice(0, 4000)}...</p>`);
    };
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

