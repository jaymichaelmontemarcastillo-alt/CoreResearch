// src/pages/Documents/utils/documentHelpers.js

/**
 * Format timestamp into Google Docs style "Opened 9:21 AM" or "Aug 18, 2026"
 */
export const formatGoogleDocsDate = (isoOrTimestamp, prefix = 'Opened') => {
  if (!isoOrTimestamp) return `${prefix} recently`;

  const date = typeof isoOrTimestamp === 'object' && isoOrTimestamp?.seconds 
    ? new Date(isoOrTimestamp.seconds * 1000)
    : new Date(isoOrTimestamp);

  if (isNaN(date.getTime())) return `${prefix} recently`;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Today
  const isToday = now.toDateString() === date.toDateString();
  if (isToday) {
    if (diffMinutes < 1) return `${prefix} just now`;
    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${prefix} ${timeStr}`;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Yesterday, ${timeStr}`;
  }

  // Same year
  const isSameYear = now.getFullYear() === date.getFullYear();
  if (isSameYear) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Different year
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Human-readable file size format
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Returns clean document title without file extension
 */
export const sanitizeDocumentTitle = (fileName) => {
  if (!fileName) return 'Untitled Document';
  return fileName.replace(/\.(docx|pdf|doc|txt|html)$/i, '');
};

/**
 * Get badge colors and icons based on document source type
 */
export const getDocumentTypeInfo = (sourceType, contentType = '') => {
  const type = (sourceType || contentType || '').toLowerCase();
  
  if (type.includes('pdf')) {
    return {
      type: 'pdf',
      label: 'PDF Document',
      color: 'bg-red-500 text-white',
      badgeColor: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60',
      iconColor: 'text-red-500',
    };
  }
  
  if (type.includes('docx') || type.includes('word') || type.includes('doc')) {
    return {
      type: 'docx',
      label: 'Word Document',
      color: 'bg-blue-600 text-white',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
      iconColor: 'text-blue-600',
    };
  }

  if (type.includes('proposal_attachment')) {
    return {
      type: 'proposal_attachment',
      label: 'Proposal Attachment',
      color: 'bg-amber-600 text-white',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
      iconColor: 'text-amber-600',
    };
  }

  return {
    type: 'native',
    label: 'CoreResearch Doc',
    color: 'bg-blue-600 text-white',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
    iconColor: 'text-blue-600',
  };
};
