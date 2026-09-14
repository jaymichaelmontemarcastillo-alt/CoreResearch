// src/components/research/PublicationDetailModal.jsx
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  HiBookOpen,
  HiUser,
  HiSparkles,
  HiDocumentText,
  HiArrowDownTray,
  HiDocumentDuplicate,
  HiCheck,
  HiEye,
  HiCalendar,
  HiAcademicCap,
  HiArrowTopRightOnSquare,
} from 'react-icons/hi2';

export const PublicationDetailModal = ({
  isOpen,
  onClose,
  publication,
}) => {
  const [activeTab, setActiveTab] = useState('highlights'); // 'highlights' | 'fullContent'
  const [copied, setCopied] = useState(false);

  if (!publication) return null;

  const authorsList = Array.isArray(publication.authors)
    ? publication.authors.join(', ')
    : publication.authors || 'Unknown Authors';

  // Structured Abstract Highlights (if stored directly or generated from abstract)
  const getHighlights = () => {
    if (publication.abstractHighlights && Array.isArray(publication.abstractHighlights) && publication.abstractHighlights.length > 0) {
      return publication.abstractHighlights;
    }

    // Default intelligent breakdown from abstract sentences if explicit bullets not saved
    const sentences = (publication.abstract || '')
      .split(/(?<=[.?!])\s+/)
      .filter((s) => s.trim().length > 10);

    if (sentences.length >= 3) {
      return [
        { label: 'Problem & Objective', text: sentences[0] },
        { label: 'Methodology & Framework', text: sentences.slice(1, -1).join(' ') || sentences[1] },
        { label: 'Key Findings & Impact', text: sentences[sentences.length - 1] },
      ];
    } else if (sentences.length > 0) {
      return sentences.map((s, idx) => ({
        label: `Key Highlight ${idx + 1}`,
        text: s,
      }));
    }

    return [
      { label: 'Research Objective', text: 'Evaluation of domain methodology and system performance metrics.' },
      { label: 'Key Takeaway', text: publication.abstract || 'Abstract summary available in the full manuscript.' }
    ];
  };

  const highlights = getHighlights();

  const handleCopyCitation = () => {
    const citation =
      publication.citation ||
      `${authorsList} (${publication.publicationYear || new Date().getFullYear()}). ${publication.title}. CoreResearch Institutional Repository.`;
    navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const documentUrl = publication.pdfUrl || publication.fileUrl;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={publication.title}
      icon={HiBookOpen}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 text-left">
        {/* Header Metadata */}
        <div className="space-y-3 border-b border-gray-100 dark:border-[#222433] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="blue">
              {publication.department || 'Computer Studies'}
            </Badge>
            {publication.publicationYear && (
              <Badge variant="gray">
                <HiCalendar className="w-3.5 h-3.5 mr-1 inline" />
                {publication.publicationYear}
              </Badge>
            )}
            {publication.adviserName && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Adviser: <strong className="text-gray-800 dark:text-gray-200">{publication.adviserName}</strong>
              </span>
            )}
          </div>

          {/* Authors */}
          <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            <HiUser className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="text-gray-400 dark:text-gray-500">Authors: </span>
              <strong className="text-gray-900 dark:text-white font-semibold">
                {authorsList}
              </strong>
            </div>
          </div>

          {/* Keywords */}
          {publication.keywords && publication.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(Array.isArray(publication.keywords)
                ? publication.keywords
                : String(publication.keywords).split(',')
              ).map((kw, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[11px] text-gray-600 dark:text-gray-300"
                >
                  #{kw.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-[#222433]">
          <button
            onClick={() => setActiveTab('highlights')}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'highlights'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <HiSparkles className="w-4 h-4" />
            Abstract &amp; Highlights
          </button>

          <button
            onClick={() => setActiveTab('fullContent')}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'fullContent'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <HiDocumentText className="w-4 h-4" />
            View Full Content
          </button>
        </div>

        {/* Tab 1: Abstract & Highlights */}
        {activeTab === 'highlights' && (
          <div className="space-y-5 animate-fade-in">
            {/* Abstract Highlights Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <HiSparkles className="w-4 h-4" />
                </span>
                <h4 className="text-xs uppercase font-bold text-gray-700 dark:text-gray-300 tracking-wider">
                  Abstract Highlights
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {highlights.map((h, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                    <div className="space-y-0.5">
                      {h.label && (
                        <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                          {h.label}
                        </div>
                      )}
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {h.text || h}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complete Abstract */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">
                Full Abstract
              </h4>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#222433] text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
                {publication.abstract || 'No abstract text provided.'}
              </div>
            </div>

            {/* Citation Box */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                  APA Academic Citation
                </h4>
                <button
                  onClick={handleCopyCitation}
                  className="text-xs text-primary dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  {copied ? (
                    <HiCheck className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <HiDocumentDuplicate className="w-3.5 h-3.5" />
                  )}
                  {copied ? 'Copied to Clipboard!' : 'Copy Citation'}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-gray-100 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 font-mono text-xs text-gray-800 dark:text-gray-200 select-all">
                {publication.citation ||
                  `${authorsList} (${publication.publicationYear || new Date().getFullYear()}). ${publication.title}. CoreResearch Institutional Repository.`}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: View Full Content */}
        {activeTab === 'fullContent' && (
          <div className="space-y-4 animate-fade-in">
            {publication.content ? (
              <div className="p-5 rounded-xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#222433] max-h-[50vh] overflow-y-auto space-y-4 text-sm leading-relaxed text-gray-800 dark:text-gray-200 font-serif">
                {publication.content.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            ) : documentUrl ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300">
                  <span>Interactive Document Reader for <strong>{publication.title}</strong></span>
                  <a
                    href={documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Open in New Window <HiArrowTopRightOnSquare className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="w-full h-[55vh] rounded-xl overflow-hidden border border-gray-200 dark:border-[#222433] bg-gray-100 dark:bg-[#0e0f15]">
                  <iframe
                    src={documentUrl}
                    title={publication.title}
                    className="w-full h-full"
                  />
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-200 dark:border-[#222433] space-y-2">
                <HiDocumentText className="w-10 h-10 mx-auto text-gray-400" />
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Full Document Content Not Yet Digitalized
                </h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  The complete manuscript content for this entry is archived in the university physical repository.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 dark:border-[#222433] pt-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab(activeTab === 'highlights' ? 'fullContent' : 'highlights')}
            >
              {activeTab === 'highlights' ? (
                <>
                  <HiEye className="w-4 h-4 mr-1.5" /> View Full Content
                </>
              ) : (
                <>
                  <HiSparkles className="w-4 h-4 mr-1.5" /> View Highlights
                </>
              )}
            </Button>

            {documentUrl && (
              <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" size="sm">
                  <HiArrowDownTray className="w-4 h-4 mr-1.5" /> Download PDF
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PublicationDetailModal;
