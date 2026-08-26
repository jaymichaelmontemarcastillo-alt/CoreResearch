// src/pages/AdviserAdvisees.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast } from '../components/ui/Toast';
import { Users, BookOpen, CheckCircle2, Search, ArrowRight } from 'lucide-react';
import { facultyService } from '../services/faculty.service';
import progressService from '../services/progress.service';
import { courseService } from '../services/course.service';
import { sectionService } from '../services/section.service';
import { researchWorkspaceService } from '../services/researchWorkspace.service';

export const AdviserAdvisees = () => {
  const { currentUser, role, currentFacultyMode } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [enrichedGroups, setEnrichedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveRole = role === 'faculty' ? currentFacultyMode : role;

  const fetchAdviseeData = async () => {
    setLoading(true);
    try {
      let list = [];
      if (effectiveRole === 'adviser') {
        list = await facultyService.getAdviserGroups(currentUser.uid);
      } else {
        // Fallback for admins etc if they hit this page
        list = await facultyService.getAdviserGroups(currentUser.uid); 
      }
      setGroups(list);

      // Fetch all courses and sections to map the IDs to names
      const [allCourses, allSections] = await Promise.all([
        courseService.getAllCourses(),
        sectionService.getAllSections()
      ]);

      // Enrich groups with course, section, and progress data
      const enriched = await Promise.all(list.map(async (group) => {
        const course = allCourses.find(c => c.id === group.courseId);
        const section = allSections.find(s => s.id === group.sectionId);
        
        // Use progressService which dynamically pulls from tasks/sections now, or use the workspace direct
        const workspace = await researchWorkspaceService.getWorkspaceByStudentOrGroup('', group.id);
        const progress = workspace ? await progressService.calculateWorkspaceProgress(workspace, []) : 0;
        
        return {
          ...group,
          workspaceId: workspace?.id || '',
          programCode: course?.code || 'N/A',
          sectionName: section?.name || 'N/A',
          specialization: group.specialization || course?.specializations?.[0]?.code || '',
          progressPercentage: progress || 0,
          currentStage: workspace?.researchPhase || 'Not Started',
          memberCount: group.memberIds?.length || 0,
        };
      }));

      setEnrichedGroups(enriched);
    } catch (err) {
      console.error('[AdviserAdvisees] fetch error:', err);
      setToast('Failed to load advisee data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchAdviseeData();
    }
  }, [currentUser?.uid, effectiveRole]);

  const filteredGroups = enrichedGroups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (g.programCode && g.programCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} variant="error" onClose={() => setToast('')} />}

      <PageHeader
        icon={Users}
        title="My Assigned Advisees"
        description="Monitor student research groups, track progress, and manage your advisory workflow."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          title="Assigned Research Groups"
          value={groups.length}
          description="Active student groups under advisory"
          trend="neutral"
        />
        <StatCard
          icon={CheckCircle2}
          title="Average Progress"
          value={`${enrichedGroups.length ? Math.round(enrichedGroups.reduce((acc, g) => acc + g.progressPercentage, 0) / enrichedGroups.length) : 0}%`}
          description="Across all handled groups"
          trend="up"
        />
        <StatCard
          icon={BookOpen}
          title="Groups in Defense Stage"
          value={enrichedGroups.filter(g => g.currentStage.toLowerCase().includes('defense')).length}
          description="Groups ready for panel evaluation"
          trend="neutral"
        />
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Groups Overview</h3>
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups or program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading advisee groups...</div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            No research groups match your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="pb-3 px-4 font-semibold">Group & Title</th>
                  <th className="pb-3 px-4 font-semibold">Program</th>
                  <th className="pb-3 px-4 font-semibold">Section</th>
                  <th className="pb-3 px-4 font-semibold">Specialization</th>
                  <th className="pb-3 px-4 font-semibold">Members</th>
                  <th className="pb-3 px-4 font-semibold">Progress</th>
                  <th className="pb-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                {filteredGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="py-4 px-4 min-w-[250px]">
                      <div className="font-bold text-sm text-gray-900 dark:text-white">{group.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs" title={group.title || 'No Title Yet'}>
                        {group.title || 'No Title Yet'}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {group.programCode}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {group.sectionName}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {group.specialization || <span className="text-gray-400 italic">None</span>}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {group.memberCount} Students
                    </td>
                    <td className="py-4 px-4 min-w-[150px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{group.progressPercentage}%</span>
                        <span className="text-[10px] text-gray-500 capitalize px-2 bg-gray-100 dark:bg-slate-800 rounded-full">{group.currentStage.replace('_', ' ')}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-700" style={{ width: `${group.progressPercentage}%` }} />
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!group.workspaceId}
                        onClick={() => navigate(`/faculty/workspace/${group.workspaceId}`)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Workspace <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
