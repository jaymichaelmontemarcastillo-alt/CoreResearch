// src/pages/Documents/import/DocumentImportTypes.js

export const SupportedFormats = {
  DOCX: 'docx',
  PDF: 'pdf',
};

export const PageSizes = {
  LETTER: 'letter',
  A4: 'a4',
  LEGAL: 'legal',
};

export const PageOrientations = {
  PORTRAIT: 'portrait',
  LANDSCAPE: 'landscape',
};

export const DefaultPageSettings = {
  size: PageSizes.LETTER,
  orientation: PageOrientations.PORTRAIT,
  marginTop: '1in',
  marginBottom: '1in',
  marginLeft: '1in',
  marginRight: '1in',
};

export const DefaultTypography = {
  fontFamily: 'Times New Roman',
  fontSize: '12pt',
  lineHeight: '1.5',
  color: null,
};
