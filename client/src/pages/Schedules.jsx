// src/pages/Schedules.jsx
import React, { useState, useEffect } from "react";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { 
  HiCalendarDays, 
  HiMagnifyingGlass,
  HiClock,
  HiMapPin,
  HiUsers
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
    
    // Search in title
    const title = (sch.projectTitle || sch.title || "").toLowerCase();
    if (title.includes(q)) return true;
    
    // Search in venue
    const venue = (sch.venue || sch.location || "").toLowerCase();
    if (venue.includes(q)) return true;
    
    // Search in student names
    let studentNames = [];
    if (sch.studentNames && Array.isArray(sch.studentNames)) {
      studentNames = sch.studentNames;
    } else if (sch.members && Array.isArray(sch.members)) {
      studentNames = sch.members.map(m => m.fullName || m.name || "");
    } else if (sch.studentName) {
      studentNames = [sch.studentName];
    }
    if (studentNames.some(name => name.toLowerCase().includes(q))) return true;
    
    // Search in panelist names
    let panelistNames = [];
    if (sch.panelistNames && Array.isArray(sch.panelistNames)) {
      panelistNames = sch.panelistNames;
    } else if (sch.panelists && Array.isArray(sch.panelists)) {
      panelistNames = sch.panelists.map(p => p.name || p.fullName || "");
    }
    if (panelistNames.some(name => name.toLowerCase().includes(q))) return true;
    
    return false;
  });

  const tableColumns = [
    { label: "Time/Venue", className: "min-w-[170px]" },
    { label: "Name of Students", className: "min-w-[150px]" },
    { label: "Title", className: "min-w-[200px]" },
    { label: "Subject Specialist", className: "min-w-[150px]" },
    { label: "Statistician", className: "min-w-[140px]" },
    { label: "Technical", className: "min-w-[140px]" },
  ];

  return (
    <div className="space-y-6 font-inter">
      <PageHeader
        icon={HiCalendarDays}
        title="Oral Defense Schedules"
        description="Public schedule for proposal defenses, final oral presentations, panel venues, and committee assignments."
      />

      {toast && (
        <Toast message={toast} variant="error" onClose={() => setToast("")} />
      )}

      <div className="flex flex-col md:flex-row items-end justify-between gap-4 pb-2">
        <div className="w-full md:max-w-xs">
          <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">
            Search Schedules
          </label>
          <Input
            placeholder="Search by title, student, venue, or panelist..."
            icon={HiMagnifyingGlass}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="shadow-sm"
          />
        </div>
        
        <div className="w-full md:w-auto shrink-0">
          <Badge variant="blue" className="text-sm px-4 py-2">
            {filteredSchedules.length} Schedule{filteredSchedules.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      <div className="bg-white dark:bg-[#15161e] p-6 rounded-2xl border border-gray-200/90 dark:border-[#222433] shadow-sm">
        <DataTable columns={tableColumns} className="shadow-sm">
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
              // Get student names from various possible fields
              let studentNames = [];
              if (sch.studentNames && Array.isArray(sch.studentNames)) {
                studentNames = sch.studentNames;
              } else if (sch.members && Array.isArray(sch.members)) {
                studentNames = sch.members.map(m => m.fullName || m.name || "");
              } else if (sch.studentName) {
                studentNames = [sch.studentName];
              }

              // Resolve panelists by role
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

              return (
                <TableRow key={sch.id || sch._id}>
                  {/* Time/Venue */}
                  <TableCell>
                    <div className="flex flex-col space-y-1.5">
                      {sch.date || sch.startTime ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <HiClock className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">
                              {sch.date ? new Date(sch.date).toLocaleDateString(undefined, { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              }) : ''}
                              {sch.startTime ? ` · ${formatTime12Hour(sch.startTime)}` : ''}
                              {sch.endTime ? ` – ${formatTime12Hour(sch.endTime)}` : ''}
                            </span>
                          </div>
                          {sch.venue && (
                            <div className="flex items-center gap-1.5">
                              <HiMapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                {sch.venue}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400 italic text-sm">Not scheduled</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Name of Students */}
                  <TableCell>
                    {studentNames.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {studentNames.map((name, idx) => (
                          <div key={idx} className="font-medium text-sm text-gray-800 dark:text-gray-200">
                            {name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-sm">Not assigned</span>
                    )}
                  </TableCell>

                  {/* Title */}
                  <TableCell>
                    <div className="font-medium text-gray-900 dark:text-white line-clamp-3 text-sm">
                      {sch.projectTitle || sch.title || 'Untitled'}
                    </div>
                  </TableCell>

                  {/* Subject Specialist */}
                  <TableCell>
                    <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
                      {subjectSpecialist || <span className="text-gray-400 italic text-sm">Not Assigned</span>}
                    </span>
                  </TableCell>

                  {/* Statistician */}
                  <TableCell>
                    <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
                      {statistician || <span className="text-gray-400 italic text-sm">Not Assigned</span>}
                    </span>
                  </TableCell>

                  {/* Technical */}
                  <TableCell>
                    <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
                      {technical || <span className="text-gray-400 italic text-sm">Not Assigned</span>}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </DataTable>
      </div>
    </div>
  );
};

export default Schedules;