// src/pages/Schedules.jsx
import React, { useState, useEffect } from "react";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { 
  HiCalendarDays, 
  HiMagnifyingGlass,
  HiClock,
  HiMapPin,
  HiUsers,
  HiChevronRight
} from "react-icons/hi2";
import { scheduleService } from "../services/schedule.service";

const formatTime12Hour = (time) => {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const h = parseInt(parts[0], 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedHour = h % 12 || 12;
  return `${formattedHour}:${parts[1]} ${ampm}`;
};

export const Schedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const data = await scheduleService.getAllSchedules();
      setSchedules(data);
    } catch (err) {
      console.error("[Schedules] fetch error:", err);
      setToast("Failed to load schedules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const filteredSchedules = schedules.filter((sch) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    
    const title = (sch.projectTitle || sch.title || "").toLowerCase();
    if (title.includes(q)) return true;
    
    const venue = (sch.venue || sch.location || "").toLowerCase();
    if (venue.includes(q)) return true;
    
    let studentNames = [];
    if (sch.studentNames && Array.isArray(sch.studentNames)) {
      studentNames = sch.studentNames;
    } else if (sch.members && Array.isArray(sch.members)) {
      studentNames = sch.members.map(m => m.fullName || m.name || "");
    } else if (sch.studentName) {
      studentNames = [sch.studentName];
    }
    if (studentNames.some(name => name.toLowerCase().includes(q))) return true;
    
    let panelistNames = [];
    if (sch.panelistNames && Array.isArray(sch.panelistNames)) {
      panelistNames = sch.panelistNames;
    } else if (sch.panelists && Array.isArray(sch.panelists)) {
      panelistNames = sch.panelists.map(p => p.name || p.fullName || "");
    }
    if (panelistNames.some(name => name.toLowerCase().includes(q))) return true;
    
    return false;
  });

  // Helper to resolve panelist info for a schedule
  const getScheduleDetails = (sch) => {
    let studentNames = [];
    if (sch.studentNames && Array.isArray(sch.studentNames)) {
      studentNames = sch.studentNames;
    } else if (sch.members && Array.isArray(sch.members)) {
      studentNames = sch.members.map(m => m.fullName || m.name || "");
    } else if (sch.studentName) {
      studentNames = [sch.studentName];
    }

    const panelists = Array.isArray(sch.panelists) ? sch.panelists : [];
    const subjectSpecialist = 
      panelists.find(p => (p.role || '').toLowerCase().includes('subject'))?.name || 
      panelists.find(p => (p.role || '').toLowerCase().includes('subject'))?.fullName ||
      (panelists.length > 0 && !panelists.some(p => (p.role || '').toLowerCase().includes('subject')) ? (panelists[0]?.name || panelists[0]?.fullName) : null) ||
      (Array.isArray(sch.panelistNames) && sch.panelistNames[0] ? sch.panelistNames[0] : null);

    const statistician = 
      panelists.find(p => (p.role || '').toLowerCase().includes('stat'))?.name || 
      panelists.find(p => (p.role || '').toLowerCase().includes('stat'))?.fullName ||
      (panelists.length > 1 && !panelists.some(p => (p.role || '').toLowerCase().includes('stat')) ? (panelists[1]?.name || panelists[1]?.fullName) : null) ||
      (Array.isArray(sch.panelistNames) && sch.panelistNames[1] ? sch.panelistNames[1] : null);

    const technical = 
      panelists.find(p => (p.role || '').toLowerCase().includes('tech'))?.name || 
      panelists.find(p => (p.role || '').toLowerCase().includes('tech'))?.fullName ||
      (panelists.length > 2 && !panelists.some(p => (p.role || '').toLowerCase().includes('tech')) ? (panelists[2]?.name || panelists[2]?.fullName) : null) ||
      (Array.isArray(sch.panelistNames) && sch.panelistNames[2] ? sch.panelistNames[2] : null);

    return { studentNames, subjectSpecialist, statistician, technical };
  };

  const tableColumns = [
    { label: "Time/Venue", className: "min-w-[170px]" },
    { label: "Name of Students", className: "min-w-[150px]" },
    { label: "Title", className: "min-w-[200px]" },
    { label: "Subject Specialist", className: "min-w-[150px]" },
    { label: "Statistician", className: "min-w-[140px]" },
    { label: "Technical", className: "min-w-[140px]" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 font-inter">
      <PageHeader
        icon={HiCalendarDays}
        title="Oral Defense Schedules"
        description="Public schedule for proposal defenses, final oral presentations, panel venues, and committee assignments."
      />

      {toast && (
        <Toast message={toast} variant="error" onClose={() => setToast("")} />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mt-4">
        <div className="w-full sm:max-w-md relative">
          <HiMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, student, venue, or panel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 h-11 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-2xl text-[13px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-sm"
          />
        </div>
        
        <div className="w-full sm:w-auto shrink-0">
          <Badge variant="blue" className="text-sm px-4 py-2">
            {filteredSchedules.length} Schedule{filteredSchedules.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Desktop Table — hidden on mobile */}
      <div className="hidden md:block bg-white dark:bg-[#15161e] rounded-xl border border-gray-200 dark:border-[#222433] shadow-card overflow-hidden">
        <DataTable columns={tableColumns} className="!border-0 !shadow-none !rounded-none">
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-gray-400">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className="text-sm">Loading defense schedules...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : filteredSchedules.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-16 text-center text-gray-400">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <HiCalendarDays className="w-12 h-12 text-gray-300 dark:text-[#6b6f84]" />
                  <span className="text-sm font-medium">No defense schedules found</span>
                  {searchQuery && (
                    <span className="text-xs text-gray-400">Try adjusting your search</span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredSchedules.map((sch) => {
              const { studentNames, subjectSpecialist, statistician, technical } = getScheduleDetails(sch);

              return (
                <TableRow key={sch.id || sch._id}>
                  <TableCell>
                    <div className="flex flex-col space-y-1.5">
                      {sch.date || sch.startTime ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <HiClock className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="font-bold text-[12px] text-gray-900 dark:text-white whitespace-nowrap">
                              {sch.date ? new Date(sch.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                              {sch.startTime ? ` · ${formatTime12Hour(sch.startTime)}` : ''}
                              {sch.endTime ? ` – ${formatTime12Hour(sch.endTime)}` : ''}
                            </span>
                          </div>
                          {sch.venue && (
                            <div className="flex items-center gap-1.5">
                              <HiMapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="text-[10px] text-gray-500 font-medium">{sch.venue}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400 italic text-sm">Not scheduled</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {studentNames.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {studentNames.map((name, idx) => (
                          <div key={idx} className="font-medium text-sm text-gray-700 dark:text-gray-300">{name}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-sm">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                      {sch.projectTitle || sch.title || 'Untitled'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                      {subjectSpecialist || <span className="text-gray-400 italic text-sm">Not Assigned</span>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                      {statistician || <span className="text-gray-400 italic text-sm">Not Assigned</span>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                      {technical || <span className="text-gray-400 italic text-sm">Not Assigned</span>}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </DataTable>
      </div>

      {/* Mobile Card List — shown only on mobile */}
      <div className="md:hidden bg-white dark:bg-[#15161e] rounded-xl border border-gray-200 dark:border-[#222433] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
            <span className="text-sm">Loading schedules...</span>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <HiCalendarDays className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-[#6b6f84]" />
            <p className="text-sm font-medium">No defense schedules found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-[#222433]">
            {filteredSchedules.map((sch) => {
              const { studentNames } = getScheduleDetails(sch);
              const titleText = sch.projectTitle || sch.title || 'Untitled';

              return (
                <button
                  key={sch.id || sch._id}
                  onClick={() => setSelectedSchedule(sch)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-[#1c1d28]/60 transition-colors active:bg-gray-100 dark:active:bg-[#1c1d28]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <HiClock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {sch.startTime ? formatTime12Hour(sch.startTime) : ''}
                        {sch.endTime ? ` – ${formatTime12Hour(sch.endTime)}` : ''}
                      </span>
                      {sch.venue && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">·</span>
                          <span className="text-[11px] text-gray-500">{sch.venue}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 mb-0.5">
                      {titleText}
                    </p>
                    {studentNames.length > 0 && (
                      <p className="text-xs text-gray-400 truncate">
                        {studentNames.join(', ')}
                      </p>
                    )}
                    {sch.date && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(sch.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <HiChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Schedule Detail Modal */}
      {selectedSchedule && (() => {
        const sch = selectedSchedule;
        const { studentNames, subjectSpecialist, statistician, technical } = getScheduleDetails(sch);

        return (
          <Modal
            isOpen={!!selectedSchedule}
            onClose={() => setSelectedSchedule(null)}
            title="Defense Details"
            icon={HiCalendarDays}
          >
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Date & Time</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                  {sch.date ? new Date(sch.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {sch.startTime ? formatTime12Hour(sch.startTime) : ''}{sch.endTime ? ` – ${formatTime12Hour(sch.endTime)}` : ''}
                </p>
              </div>
              {sch.venue && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Venue</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{sch.venue}</p>
                </div>
              )}
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Research Title</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{sch.projectTitle || sch.title || 'Untitled'}</p>
              </div>
              {studentNames.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Students</span>
                  <div className="mt-1 space-y-1">
                    {studentNames.map((name, idx) => (
                      <p key={idx} className="text-sm text-gray-700 dark:text-gray-300">{name}</p>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t border-gray-100 dark:border-[#222433] pt-4">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Panel Members</span>
                <div className="mt-2 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Subject Specialist</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{subjectSpecialist || 'Not Assigned'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Statistician</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{statistician || 'Not Assigned'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Technical</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{technical || 'Not Assigned'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

export default Schedules;
