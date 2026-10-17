// src/pages/AdvisersList.jsx
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { PublicationDetailModal } from '../components/research/PublicationDetailModal';
import userService from '../services/user.service';
import { researchWorkspaceService } from '../services/researchWorkspace.service';
import { FacultyDirectoryCard } from '../components/adviser/FacultyDirectoryCard';
import api from '../services/api';
import {
  HiAcademicCap,
  HiMagnifyingGlass,
  HiEnvelope,
  HiBuildingOffice2,
  HiBookOpen,
  HiUser,
  HiCheckCircle,
  HiEye,
  HiTag,
  HiSparkles,
  HiArrowTopRightOnSquare,
  HiFunnel,
  HiChevronDown,
} from 'react-icons/hi2';

export const AdvisersList = () => {
  const [advisers, setAdvisers] = useState([]);
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Selected Adviser for Profile Modal
  const [selectedAdviser, setSelectedAdviser] = useState(null);

  // Selected Publication for Publication Detail Modal
  const [selectedPublication, setSelectedPublication] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch advisers from user service and workspaces for workload
        const [adviserUsers, allWorkspaces] = await Promise.all([
          userService.getUsersByRole('adviser'),
          researchWorkspaceService.getAllWorkspaces().catch(() => []),
        ]);

        // 2. Fetch publications from repository
        let repoPubs = [];
        try {
          const res = await api.get('/repository');
          if (res.data?.data) {
            repoPubs = res.data.data;
          }
        } catch (e) {
          console.warn('[AdvisersList] Could not fetch repo publications:', e);
        }

        setPublications(repoPubs);

        // 3. Fetch uploaded & indexed adviser research documents
        let adviserDocs = [];
        try {
          const advRes = await api.get('/adviser-research/all');
          if (advRes.data?.data) {
            adviserDocs = advRes.data.data;
          }
        } catch (e) {
          console.warn('[AdvisersList] Could not fetch adviser research docs:', e);
        }

        // Map publications to advisers if they match adviserName or adviserId or user.publishedWorks
        const enriched = adviserUsers.map((adv) => {
          const nameMatch = adv.fullName || `${adv.first_name} ${adv.last_name}`.trim();

          // Map documents uploaded by this adviser in /research-documents
          const advUploadedDocs = adviserDocs
            .filter((doc) => {
              const matchesId = doc.adviserId && (doc.adviserId === adv.uid || doc.adviserId === adv.id);
              const matchesEmail = doc.adviserEmail && adv.email && doc.adviserEmail.toLowerCase() === adv.email.toLowerCase();
              const matchesName = doc.adviserName && nameMatch && doc.adviserName.toLowerCase().includes(nameMatch.toLowerCase());
              return matchesId || matchesEmail || matchesName;
            })
            .map((doc) => {
              const docTitle = doc.title || doc.originalFilename?.replace(/\.[^/.]+$/, '') || 'Research Publication';
              const highlights = [];
              if (doc.researchProblem) {
                highlights.push({ label: 'Research Problem', text: doc.researchProblem });
              }
              if (doc.methodologies && doc.methodologies.length > 0) {
                highlights.push({ 
                  label: 'Methodology & Framework', 
                  text: Array.isArray(doc.methodologies) ? doc.methodologies.join(', ') : String(doc.methodologies) 
                });
              }
              if (doc.researchConcepts && doc.researchConcepts.length > 0) {
                highlights.push({ 
                  label: 'Core Concepts', 
                  text: Array.isArray(doc.researchConcepts) ? doc.researchConcepts.join(', ') : String(doc.researchConcepts) 
                });
              }
              if (doc.researchDomain) {
                highlights.push({ label: 'Research Domain', text: doc.researchDomain });
              }

              const allKeywords = Array.from(new Set([
                ...(Array.isArray(doc.keywords) ? doc.keywords : (doc.keywords ? String(doc.keywords).split(' ') : [])),
                ...(Array.isArray(doc.researchConcepts) ? doc.researchConcepts : []),
                ...(Array.isArray(doc.researchTopics) ? doc.researchTopics : []),
                ...(Array.isArray(doc.methodologies) ? doc.methodologies : [])
              ])).filter(Boolean);

              const pubYear = doc.created_at ? new Date(doc.created_at).getFullYear() : new Date().getFullYear();

              return {
                id: doc.id || doc._id,
                title: docTitle,
                abstract: doc.abstract || 'No abstract preview available.',
                abstractHighlights: highlights.length > 0 ? highlights : undefined,
                authors: [nameMatch || 'Faculty Author'],
                adviserName: nameMatch,
                adviserId: doc.adviserId || adv.uid,
                department: adv.department || 'Computer Studies',
                college: adv.college || '',
                publicationYear: pubYear,
                keywords: allKeywords,
                fileUrl: doc.fileUrl,
                pdfUrl: doc.fileUrl,
                originalFilename: doc.originalFilename,
                isUploadedResearch: true,
                processingStatus: doc.processingStatus,
              };
            });

          const advPubs = [
            ...advUploadedDocs,
            ...(adv.publishedWorks || []),
            ...repoPubs.filter(
              (p) =>
                (p.adviserName &&
                  nameMatch &&
                  p.adviserName.toLowerCase().includes(nameMatch.toLowerCase())) ||
                (p.adviserId && (p.adviserId === adv.uid || p.adviserId === adv.id)) ||
                (Array.isArray(p.authors) &&
                  p.authors.some(
                    (a) => nameMatch && a.toLowerCase().includes(nameMatch.toLowerCase())
                  ))
            ),
          ];

          // Deduplicate publications by title or ID
          const uniquePubs = [];
          const seen = new Set();
          advPubs.forEach((p) => {
            const key = p.id || p.title?.toLowerCase()?.trim();
            if (!seen.has(key)) {
              seen.add(key);
              uniquePubs.push(p);
            }
          });

          // Compile all expertise tags (combining profile specializations + concepts from published works)
          const docKeywords = advUploadedDocs.flatMap((d) => d.keywords || []);
          const allExpertise = Array.from(
            new Set([
              ...(adv.selectedExpertise || []),
              ...(adv.expertise || []),
              ...(adv.specialization || []),
              ...(adv.researchInterests || []),
              ...docKeywords,
            ])
          ).filter(Boolean);

          const activeGroups = (allWorkspaces || []).filter(
            (ws) => (ws.adviserId === adv.uid || ws.adviserId === adv.id) && ws.status !== 'archived'
          );

          return {
            ...adv,
            displayName: nameMatch || 'Faculty Adviser',
            fullName: nameMatch || 'Faculty Adviser',
            activeAdviseeCount: activeGroups.length,
            maxAdvisees: adv.maxCapacity || adv.maxAdvisees || 5,
            maxCapacity: adv.maxCapacity || adv.maxAdvisees || 5,
            academicRank: adv.academicRank || 'Assistant Professor',
            status: adv.status || 'active',
            allExpertise,
            expertise: allExpertise,
            matchedPublications: uniquePubs,
          };
        });

        setAdvisers(enriched);
      } catch (err) {
        console.error('[AdvisersList] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter advisers by search and department
  const filteredAdvisers = advisers.filter((adv) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      adv.displayName.toLowerCase().includes(q) ||
      (adv.department && adv.department.toLowerCase().includes(q)) ||
      adv.allExpertise.some((e) => e.toLowerCase().includes(q));

    const matchesDept =
      departmentFilter === 'all' ||
      (adv.department && adv.department.toLowerCase().includes(departmentFilter.toLowerCase()));

    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={HiAcademicCap}
        title="Faculty Advisers Directory"
        description="Explore faculty research advisers, inspect their areas of specialization and published works."
      />

      {/* Search and Filter (No container, justified) */}
      <div className="flex flex-col sm:flex-row items-end justify-between gap-4 pb-1">
        <div className="w-full sm:flex-1 sm:max-w-xl">
          <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">
            Search Faculty
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              <HiMagnifyingGlass className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search advisers by name or expertise..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all duration-200 rounded-full text-sm pl-10 pr-4 shadow-xs"
            />
          </div>
        </div>

        <div className="flex items-end gap-3 w-full sm:w-auto">
          <div className="hidden sm:flex h-10 items-center px-1">
            <HiFunnel className="w-4 h-4 text-gray-300 dark:text-[#6b6f84]" />
          </div>

          <div className="w-full sm:w-64">
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">
              Department
            </label>
            <div className="relative">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full h-10 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-full text-[13px] font-medium text-gray-700 dark:text-[#f3f4f8] pl-4 pr-9 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="all">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Information Systems">Information Systems</option>
              </select>
              <HiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Advisers Grid */}
      {loading ? (
        <div className="py-12 sm:py-16 text-center text-[13px] sm:text-sm text-gray-400 dark:text-gray-500">
          Loading faculty advisers directory...
        </div>
      ) : filteredAdvisers.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={HiAcademicCap}
            title="No Advisers Found"
            description="Try adjusting your search query or department filter."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAdvisers.map((adv, index) => (
            <FacultyDirectoryCard
              key={adv.uid || adv.id}
              adviser={adv}
              index={index}
              mode="directory"
              onViewProfile={(adviser) => setSelectedAdviser(adviser)}
            />
          ))}
        </div>
      )}

      {/* Adviser Profile Modal */}
      <Modal
        isOpen={Boolean(selectedAdviser)}
        onClose={() => setSelectedAdviser(null)}
        title={selectedAdviser?.displayName}
        icon={HiAcademicCap}
        maxWidth="max-w-3xl"
      >
        {selectedAdviser && (
          <div className="space-y-6 text-left">
            {/* Header: Photo, Name, Email, Dept */}
            <div className="flex items-start gap-4 border-b border-gray-100 dark:border-[#222433] pb-5">
              <div className="relative shrink-0">
                {selectedAdviser.profile_image ? (
                  <img
                    src={selectedAdviser.profile_image}
                    alt={selectedAdviser.displayName}
                    className="w-20 h-20 rounded-full object-cover border-2 border-blue-500/30 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xl flex items-center justify-center shadow-md">
                    {selectedAdviser.displayName
                      ?.split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'AD'}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedAdviser.displayName}
                </h3>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {selectedAdviser.department || 'Computer Studies Department'}
                </p>
                {selectedAdviser.college && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {selectedAdviser.college}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={`mailto:${selectedAdviser.email}`}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <HiEnvelope className="w-3.5 h-3.5" />
                    {selectedAdviser.email}
                  </a>
                </div>
              </div>
            </div>

            {/* Expertise & Specializations */}
            <div className="space-y-2.5">
              <h4 className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                Research Expertise &amp; Specializations
              </h4>
              {selectedAdviser.allExpertise && selectedAdviser.allExpertise.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedAdviser.allExpertise.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No expertise tags added yet.</p>
              )}
            </div>

            {/* Published Works Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HiBookOpen className="w-4 h-4 text-primary" />
                  <h4 className="text-xs uppercase font-bold text-gray-700 dark:text-gray-300 tracking-wider">
                    Published Research Works ({selectedAdviser.matchedPublications.length})
                  </h4>
                </div>
              </div>

              {selectedAdviser.matchedPublications.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-gray-50 dark:bg-[#1c1d28] border border-gray-100 dark:border-[#222433]">
                  <HiBookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">
                    No published works recorded in the repository for this adviser yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                  {selectedAdviser.matchedPublications.map((pub) => (
                    <div
                      key={pub.id || pub.title}
                      className="p-4 rounded-xl border border-gray-200 dark:border-[#222433] bg-gray-50/50 dark:bg-[#1c1d28] hover:border-blue-300 dark:hover:border-blue-700 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-gray-400">
                            {pub.publicationYear || '2025'}
                          </span>
                          <span className="text-[11px] text-gray-400">•</span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            {Array.isArray(pub.authors) ? pub.authors.join(', ') : pub.authors}
                          </span>
                          {pub.isUploadedResearch && (
                            <Badge variant="blue" size="sm" className="text-[10px] py-0 px-1.5 ml-1 font-semibold">
                              Verified Paper
                            </Badge>
                          )}
                        </div>
                        <h5 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                          {pub.title}
                        </h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {pub.abstract}
                        </p>
                        {pub.keywords && pub.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {pub.keywords.slice(0, 3).map((kw, ki) => (
                              <span
                                key={ki}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30"
                              >
                                #{kw}
                              </span>
                            ))}
                            {pub.keywords.length > 3 && (
                              <span className="text-[10px] text-gray-400 self-center">
                                +{pub.keywords.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => setSelectedPublication(pub)}
                      >
                        <HiEye className="w-3.5 h-3.5 mr-1.5" /> Read Paper
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-[#222433]">
              <Button variant="outline" size="sm" onClick={() => setSelectedAdviser(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Publication Detail Modal (Title, Authors, Abstract highlights, and Full Content) */}
      <PublicationDetailModal
        isOpen={Boolean(selectedPublication)}
        onClose={() => setSelectedPublication(null)}
        publication={selectedPublication}
      />
    </div>
  );
};

export default AdvisersList;
