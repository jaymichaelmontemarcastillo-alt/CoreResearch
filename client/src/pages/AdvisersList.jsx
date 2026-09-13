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
        // 1. Fetch advisers from user service
        const adviserUsers = await userService.getUsersByRole('adviser');

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

        // Map publications to advisers if they match adviserName or adviserId or user.publishedWorks
        const enriched = adviserUsers.map((adv) => {
          const nameMatch = adv.fullName || `${adv.first_name} ${adv.last_name}`.trim();
          const advPubs = [
            ...(adv.publishedWorks || []),
            ...repoPubs.filter(
              (p) =>
                (p.adviserName &&
                  nameMatch &&
                  p.adviserName.toLowerCase().includes(nameMatch.toLowerCase())) ||
                (p.adviserId && p.adviserId === adv.uid) ||
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
            const key = p.id || p.title;
            if (!seen.has(key)) {
              seen.add(key);
              uniquePubs.push(p);
            }
          });

          // Compile all expertise tags
          const allExpertise = Array.from(
            new Set([
              ...(adv.selectedExpertise || []),
              ...(adv.expertise || []),
              ...(adv.specialization || []),
              ...(adv.researchInterests || []),
            ])
          ).filter(Boolean);

          return {
            ...adv,
            displayName: nameMatch || 'Faculty Adviser',
            allExpertise,
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

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full flex items-center gap-2">
          <Input
            placeholder="Search advisers by name, department, or expertise (e.g. AI, Web, Cloud)..."
            icon={HiMagnifyingGlass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'Computer Science', 'Information Technology'].map((dept) => (
            <button
              key={dept}
              onClick={() => setDepartmentFilter(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                departmentFilter === dept
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {dept === 'all' ? 'All Departments' : dept}
            </button>
          ))}
        </div>
      </Card>

      {/* Advisers Grid */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 dark:text-gray-500">
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
          {filteredAdvisers.map((adv) => (
            <Card
              key={adv.uid || adv.id}
              hover
              className="flex flex-col justify-between p-5 space-y-4 border border-gray-200 dark:border-[#222433] bg-white dark:bg-[#15161e] transition-all"
            >
              <div className="space-y-4">
                {/* Header: Photo & Name */}
                <div className="flex items-start gap-3.5">
                  <div className="relative shrink-0">
                    {adv.profile_image ? (
                      <img
                        src={adv.profile_image}
                        alt={adv.displayName}
                        className="w-14 h-14 rounded-full object-cover border-2 border-blue-500/20 shadow-sm"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-base items-center justify-center shadow-sm ${
                        adv.profile_image ? 'hidden' : 'flex'
                      }`}
                    >
                      {adv.displayName
                        ?.split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'AD'}
                    </div>
                  </div>

                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                      {adv.displayName}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {adv.department || 'Faculty Adviser'}
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <Badge variant="emerald" size="sm">
                        Available for Advising
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* College / Academic Unit */}
                {adv.college && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <HiBuildingOffice2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{adv.college}</span>
                  </div>
                )}

                {/* Expertise Badges */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Core Expertise
                  </div>
                  {adv.allExpertise && adv.allExpertise.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {adv.allExpertise.slice(0, 4).map((exp, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40"
                        >
                          {exp}
                        </span>
                      ))}
                      {adv.allExpertise.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-slate-800">
                          +{adv.allExpertise.length - 4} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No expertise tags listed.</p>
                  )}
                </div>

                {/* Published Works Count */}
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 pt-1">
                  <HiBookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    <strong>{adv.matchedPublications.length}</strong> published{' '}
                    {adv.matchedPublications.length === 1 ? 'work' : 'works'}
                  </span>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="pt-3 border-t border-gray-100 dark:border-[#222433] flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full sm:w-auto shadow-sm"
                  onClick={() => setSelectedAdviser(adv)}
                >
                  <HiEye className="w-4 h-4 mr-1.5" /> View Profile &amp; Works
                </Button>
              </div>
            </Card>
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
                        </div>
                        <h5 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                          {pub.title}
                        </h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {pub.abstract}
                        </p>
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
