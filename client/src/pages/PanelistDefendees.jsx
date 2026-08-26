// src/pages/PanelistDefendees.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast } from '../components/ui/Toast';
import { Users, CalendarDays, CheckCircle2, Search, ArrowRight, Folder } from 'lucide-react';
import { facultyService } from '../services/faculty.service';
import { courseService } from '../services/course.service';
import { sectionService } from '../services/section.service';

export const PanelistDefendees = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [defenses, setDefenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPanelistData = async () => {
    setLoading(true);
    try {
      // Fetch upcoming defenses and panelist groups concurrently
      const [fetchedDefenses, fetchedGroups, allCourses, allSections] = await Promise.all([
        facultyService.getUpcomingDefenses(currentUser.uid),
        facultyService.getPanelistGroups(currentUser.uid),
        courseService.getAllCourses(),
        sectionService.getAllSections()
      ]);

      // Enrich groups with metadata
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

      setDefenses(fetchedDefenses);
      setGroups(enriched);
    } catch (err) {
      console.error('[PanelistDefendees] fetch error:', err);
      setToast('Failed to load panelist assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchPanelistData();
    }
  }, [currentUser?.uid]);

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (g.programCode && g.programCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} variant="error" onClose={() => setToast('')} />}

      <PageHeader
        icon={Users}
        title="My Panel Assignments"
        description="View your assigned defendees, evaluate defense readiness, and check upcoming defense schedules."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          title="Total Defendees"
          value={groups.length}
          description="Groups assigned to your panel"
          trend="neutral"
        />
        <StatCard
          icon={CalendarDays}
          title="Upcoming Defenses"
          value={defenses.length}
          description="Scheduled defenses pending your attendance"
          color="purple"
          valueColor="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          icon={CheckCircle2}
          title="Evaluations Done"
          value="0"
          description="Completed panel rubrics"
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Schedule List */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-purple-600" /> 
                Upcoming Defenses
              </h3>
            </div>
            
            {loading ? (
              <div className="py-8 text-center text-gray-400">Loading schedules...</div>
            ) : defenses.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">No upcoming defenses.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {defenses.map((schedule) => (
                  <div key={schedule.id} className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <Badge variant="purple">{schedule.defenseType.replace('_', ' ').toUpperCase()}</Badge>
                      <span className="text-xs font-semibold text-gray-500">{new Date(schedule.date).toLocaleDateString()}</span>
                    </div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white">
                      {schedule.projectTitle || 'Research Defense'}
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                      <span>{schedule.startTime} - {schedule.endTime}</span>
                      <span className="truncate max-w-[120px]" title={schedule.venue}>{schedule.venue}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Groups Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-amber-600" />
                Assigned Defendee Groups
              </h3>
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-gray-400">Loading defendees...</div>
            ) : filteredGroups.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                No defendee groups match your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <th className="pb-3 px-4 font-semibold">Group</th>
                      <th className="pb-3 px-4 font-semibold">Program</th>
                      <th className="pb-3 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                    {filteredGroups.map((group) => (
                      <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="py-4 px-4 min-w-[200px]">
                          <div className="font-bold text-sm text-gray-900 dark:text-white">{group.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs" title={group.title || 'No Title Yet'}>
                            {group.title || 'No Title Yet'}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {group.programCode} - {group.sectionName}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
