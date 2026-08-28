// src/pages/Documents/constants/documentConstants.js

export const SORT_OPTIONS = [
  { id: 'last_opened', label: 'Last opened by me' },
  { id: 'last_modified', label: 'Last modified' },
  { id: 'created_at', label: 'Date created' },
  { id: 'title_asc', label: 'Title (A → Z)' },
  { id: 'title_desc', label: 'Title (Z → A)' },
];

export const FILTER_OPTIONS = [
  { id: 'all', label: 'Owned by anyone' },
  { id: 'owned_by_me', label: 'Owned by me' },
  { id: 'not_owned_by_me', label: 'Not owned by me' },
  { id: 'group', label: 'Research Group' },
];

export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
};

export const SOURCE_TYPES = {
  NATIVE: 'native',
  DOCX: 'docx',
  PDF: 'pdf',
  PROPOSAL_ATTACHMENT: 'proposal_attachment',
};

export const UPLOAD_STAGES = {
  IDLE: 'idle',
  VALIDATING: 'validating',
  UPLOADING: 'uploading',
  CONVERTING: 'converting',
  PREPARING: 'preparing',
  SAVING: 'saving',
  LOADING: 'loading',
  COMPLETED: 'completed',
  ERROR: 'error',
};

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
