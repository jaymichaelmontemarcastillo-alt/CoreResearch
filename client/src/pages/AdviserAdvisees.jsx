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
import { Users, BookOpen, CheckCircle2, Search, ArrowRight, Folder, Clock, TrendingUp, Calendar } from 'lucide-react';
import { facultyService } from '../services/faculty.service';
import { courseService } from '../services/course.service';
import { sectionService } from '../services/section.service';
import { scheduleService } from '../services/schedule.service';

export const AdviserAdvisees = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [scheduleMap, setScheduleMap] = useState({});

  const fetchAdviseeData = async () => {
    setLoading(true);
    try {
      const [fetchedGroups, allCourses, allSections, allSchedules] = await Promise.all([
        facultyService.getAdviserGroups(currentUser.uid),
        courseService.getAllCourses(),
        sectionService.getAllSections(),
        scheduleService.getAllSchedules().catch(() => []),
      ]);

      const progress = await facultyService.getGroupsProgressSummary(fetchedGroups);
      setProgressMap(progress);

      // Build schedule map
      const schMap = {};
      allSchedules.forEach((sch) => {
        if (sch.status !== 'cancelled') {
          const gId = sch.projectId || sch.groupId;
          if (gId) schMap[gId] = sch;
        }
      });
      setScheduleMap(schMap);

      const enriched = fetchedGroups.map((group) => {
        const course = allCourses.find((c) => c.id === group.courseId);
        const section = allSections.find((s) => s.id === group.sectionId);
        return {
          ...group,
          programCode: course?.code || course?.name || 'N/A',
          sectionName: section?.name || 'N/A',
          yearLevelDisplay: `${group.yearLevel || 4}th Year`,
          specialization: group.specialization || course?.specializations?.[0]?.code || '',
          schedule: schMap[group.id] || null,
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
            {groups.length === 0 ? (
              <div className="space-y-2">
                <Users className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">
                  No Assigned Advisees
                </h4>
                <p className="text-sm text-gray-400">
                  You currently have no assigned research groups.
                </p>
              </div>
            ) : (
              "No advisee groups match your search criteria."
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="pb-3 px-4 font-semibold">Group & Title</th>
                  <th className="pb-3 px-4 font-semibold">Student Members</th>
                  <th className="pb-3 px-4 font-semibold">Program / Section</th>
                  <th className="pb-3 px-4 font-semibold">Manuscript Status</th>
                  <th className="pb-3 px-4 font-semibold">Defense Schedule</th>
                  <th className="pb-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                {filteredGroups.map((group) => {
                  const progress = progressMap[group.id] || 0;
                  const membersList = group.members || [];
                  const sch = group.schedule;

                  return (
                    <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                      {/* Group & Title */}
                      <td className="py-4 px-4 min-w-[200px]">
                        <div className="font-bold text-sm text-gray-900 dark:text-white">{group.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs" title={group.title || 'No Research Title Set'}>
                          {group.title || 'No Research Title Set'}
                        </div>
                      </td>

                      {/* Student Members */}
                      <td className="py-4 px-4 min-w-[180px]">
                        {membersList.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">No members assigned</span>
                        ) : (
                          <div className="space-y-1">
                            {membersList.slice(0, 3).map((m, idx) => (
                              <div key={m.uid || idx} className="text-xs text-gray-700 dark:text-gray-300">
                                <span className="font-medium">{m.fullName || m.name}</span>
                                {(m.studentNumber || m.studentIdOrEmployeeId) && (
                                  <span className="text-gray-400 font-mono ml-1.5 text-[11px]">
                                    ({m.studentNumber || m.studentIdOrEmployeeId})
                                  </span>
                                )}
                              </div>
                            ))}
                            {membersList.length > 3 && (
                              <span className="text-[10px] text-gray-400 font-semibold block">
                                +{membersList.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Program, Year Level & Section */}
                      <td className="py-4 px-4 text-xs text-gray-700 dark:text-gray-300 min-w-[140px]">
                        <div className="font-semibold text-gray-900 dark:text-white">{group.programCode}</div>
                        <div className="text-gray-500 dark:text-gray-400">{group.yearLevelDisplay} • {group.sectionName}</div>
                      </td>

                      {/* Manuscript Status */}
                      <td className="py-4 px-4 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {progress}%
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 capitalize block mt-1">
                          {group.status || 'in_progress'}
                        </span>
                      </td>

                      {/* Defense Schedule */}
                      <td className="py-4 px-4 min-w-[170px]">
                        {sch ? (
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              {sch.date}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                              {sch.startTime} – {sch.endTime}
                            </div>
                            <div className="text-[11px] text-gray-400 truncate max-w-[150px]">
                              {sch.venue || sch.location || "Room TBA"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not Scheduled Yet</span>
                        )}
                      </td>

                      {/* Action */}
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
