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
import { Users, BookOpen, CheckCircle2, Search, ArrowRight, Folder, Clock, TrendingUp } from 'lucide-react';
import { facultyService } from '../services/faculty.service';
import { courseService } from '../services/course.service';
import { sectionService } from '../services/section.service';

export const AdviserAdvisees = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAdviseeData = async () => {
    setLoading(true);
    try {
      const [fetchedGroups, allCourses, allSections] = await Promise.all([
        facultyService.getAdviserGroups(currentUser.uid),
        courseService.getAllCourses(),
        sectionService.getAllSections()
      ]);

      const progress = await facultyService.getGroupsProgressSummary(fetchedGroups);
      setProgressMap(progress);

      const enriched = fetchedGroups.map(group => {
        const course = allCourses.find(c => c.id === group.courseId);
        const section = allSections.find(s => s.id === group.sectionId);
        return {
          ...group,
          programCode: course?.code || 'N/A',
          sectionName: section?.name || 'N/A',
          specialization: group.specialization || course?.specializations?.[0]?.code || '',
        };
      });

      setGroups(enriched);
    } catch (err) {
      console.error('[AdviserAdvisees] fetch error:', err);
      setToast('Failed to load advisee groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchAdviseeData();
    }
  }, [currentUser?.uid]);

  const filteredGroups = groups.filter(g =>
    (g.name && g.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (g.title && g.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (g.programCode && g.programCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const avgProgress = groups.length > 0
    ? Math.round(Object.values(progressMap).reduce((acc, curr) => acc + (curr || 0), 0) / groups.length)
    : 0;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} variant="error" onClose={() => setToast('')} />}

      <PageHeader
        icon={Users}
        title="My Advisees"
        description="Monitor research progress, review milestone drafts, and guide your assigned advisee research groups."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          title="Total Advisee Groups"
          value={groups.length}
          description="Assigned research groups"
          trend="neutral"
        />
        <StatCard
          icon={TrendingUp}
          title="Average Progress"
          value={`${avgProgress}%`}
          description="Across all advised groups"
          color="blue"
          valueColor="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={CheckCircle2}
          title="Active Workspaces"
          value={groups.length}
          description="Groups with active workspaces"
          color="emerald"
        />
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-600" />
            Advisee Research Groups
          </h3>
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups by name, title, or program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading advisees...</div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            {groups.length === 0
              ? "You currently have no advisee research groups assigned."
              : "No advisee groups match your search criteria."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="pb-3 px-4 font-semibold">Group & Title</th>
                  <th className="pb-3 px-4 font-semibold">Program / Section</th>
                  <th className="pb-3 px-4 font-semibold">Overall Progress</th>
                  <th className="pb-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                {filteredGroups.map((group) => {
                  const progress = progressMap[group.id] || 0;
                  return (
                    <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="py-4 px-4 min-w-[220px]">
                        <div className="font-bold text-sm text-gray-900 dark:text-white">{group.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-sm" title={group.title || 'No Research Title Set'}>
                          {group.title || 'No Research Title Set'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">
                        <div>{group.programCode}</div>
                        <div className="text-xs text-gray-400">{group.sectionName}</div>
                      </td>
                      <td className="py-4 px-4 min-w-[160px]">
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 w-9">
                            {progress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(`/faculty/workspace/${group.id}`)}
                        >
                          Workspace <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdviserAdvisees;
