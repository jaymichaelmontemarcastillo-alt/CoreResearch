// src/pages/StudentDirectory.jsx
import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { CourseFilterDropdown } from "../components/ui/CourseFilterDropdown";
import {
  HiAcademicCap,
  HiCheckCircle,
  HiLink as LinkIcon,
  HiMagnifyingGlass,
  HiFunnel,
  HiDocumentDuplicate,
  HiXCircle,
  HiTrash,
} from "react-icons/hi2";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import { studentService } from "../services/student.service";
import { enrollmentService } from "../services/enrollment.service";
import { useAuth } from "../context/AuthContext";

export const StudentDirectory = () => {
  const { currentUser } = useAuth();
  
  // --- Data State ---
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [allSectionsByCourse, setAllSectionsByCourse] = useState({});
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  
  // --- UI/Action State ---
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");
  const [generatingLink, setGeneratingLink] = useState(false);
  
  // --- Invitations State ---
  const [invitations, setInvitations] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [inviteToDelete, setInviteToDelete] = useState(null);
  
  // --- Manual Assign Form State (Legacy/Maintained functionality) ---
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignUid, setAssignUid] = useState("");
  const [yearLevel, setYearLevel] = useState(3);
  const [enrollmentStatus, setEnrollmentStatus] = useState("enrolled");
  const [assigning, setAssigning] = useState(false);

  // ---------------------------------------------------------------------------
  // 1. Data Fetching Effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch sections whenever course changes
  useEffect(() => {
    if (selectedCourse) {
      fetchSectionsForCourse(selectedCourse);
    } else {
      setSections([]);
    }
  }, [selectedCourse]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [coursesData, studentsData] = await Promise.all([
        courseService.getAllCourses(),
        studentService.getAllStudents(),
      ]);
      setCourses(coursesData);
      setStudents(studentsData);
      // Pre-fetch sections for all courses (for the flyout dropdown)
      const sectionMap = {};
      await Promise.all(
        coursesData.map(async (course) => {
          try {
            const secs = await sectionService.getSectionsByCourseId(course.id);
            sectionMap[course.id] = secs;
          } catch (e) {
            sectionMap[course.id] = [];
          }
        })
      );
      setAllSectionsByCourse(sectionMap);
    } catch (error) {
      console.error("Failed to load initial data:", error);
      showToast("Failed to load initial data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSectionsForCourse = async (courseId) => {
    try {
      const sectionsData = await sectionService.getSectionsByCourseId(courseId);
      setSections(sectionsData);
    } catch (error) {
      console.error("Failed to load sections:", error);
    }
  };

  const fetchInvitations = async () => {
    setLoadingInvites(true);
    try {
      const invites = await enrollmentService.getInvitationsForFilters(
        selectedCourse,
        selectedSpecialization,
        selectedSection
      );
      setInvitations(invites);
    } catch (error) {
      console.error("Failed to fetch invitations:", error);
    } finally {
      setLoadingInvites(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. Derived State & Filter Logic (The Core Requirements)
  // ---------------------------------------------------------------------------
  const courseObj = courses.find((c) => c.id === selectedCourse);
  const specializations = courseObj?.specializations || [];
  const hasSpecializations = specializations.length > 0;

  // Sections that belong to the selected specialization (or all course sections if no specialization is selected)
  const relevantSections = sections.filter((s) => {
    if (hasSpecializations && selectedSpecialization) {
      return s.specializationId === selectedSpecialization;
    }
    return true;
  });

  // Check if the chosen specialization actually has any sections mapped to it in the system
  const specHasSections = hasSpecializations && relevantSections.length > 0;

  // Determine if we should render the Section dropdown
  const showSectionFilter =
    (!hasSpecializations && selectedCourse) || 
    (hasSpecializations && selectedSpecialization && specHasSections);

  // Determine if the Invite Link button should be enabled based on strict rules
  const isInviteEnabled = () => {
    if (!selectedCourse) return false;
    
    if (!hasSpecializations) {
      // CS rule: Requires both Course and Section
      return !!selectedSection;
    } else {
      // IT rule: Requires Specialization. If spec has sections, requires Section too.
      if (!selectedSpecialization) return false;
      if (specHasSections) return !!selectedSection;
      return true;
    }
  };

  useEffect(() => {
    if (isInviteEnabled()) {
      fetchInvitations();
    } else {
      setInvitations([]);
    }
  }, [selectedCourse, selectedSpecialization, selectedSection]);

  // Apply filters to student list
  const filteredStudents = students.filter((s) => {
    // Course Match
    if (selectedCourse && s.courseId !== selectedCourse) return false;
    
    // Specialization Match
    if (selectedSpecialization && s.specializationId !== selectedSpecialization) return false;
    
    // Section Match
    if (selectedSection && s.sectionId !== selectedSection) return false;
    
    // Search Query Match (Name, ID, Email)
    const q = searchQuery.toLowerCase();
    if (q) {
      const matchName = s.fullName?.toLowerCase().includes(q);
      const matchId = s.studentIdOrEmployeeId?.toLowerCase().includes(q);
      const matchEmail = s.email?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchEmail) return false;
    }
    
    return true;
  });

  const unassignedStudents = students.filter((s) => !s.courseId || !s.sectionId);

  // ---------------------------------------------------------------------------
  // 3. Handlers (Invite Link & Manual Assign)
  // ---------------------------------------------------------------------------
  const showToast = (msg, variant = "success") => {
    setToastMessage(msg);
    setToastVariant(variant);
  };

  const handleGenerateLink = async () => {
    if (!isInviteEnabled()) return;

    setGeneratingLink(true);
    try {
      const payload = {
        courseId: selectedCourse,
        createdBy: currentUser.uid,
        active: true,
      };

      if (selectedSection) payload.sectionId = selectedSection;
      if (selectedSpecialization) payload.specializationId = selectedSpecialization;

      const invite = await enrollmentService.createInvitation(payload);
      
      const link = `${window.location.origin}/join/${invite.id}`;
      await navigator.clipboard.writeText(link);
      
      showToast("Join link generated and copied to clipboard!");
      fetchInvitations();
    } catch (error) {
      console.error("Error generating link:", error);
      showToast(error.message || "Failed to generate link.", "error");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = (inviteId) => {
    const link = `${window.location.origin}/join/${inviteId}`;
    navigator.clipboard.writeText(link)
      .then(() => showToast("Join link copied to clipboard!"))
      .catch(() => showToast("Failed to copy link.", "error"));
  };

  const handleDeactivate = async (inviteId) => {
    try {
      await enrollmentService.deactivateInvitation(inviteId);
      showToast("Invitation deactivated.");
      fetchInvitations();
    } catch (error) {
      showToast("Failed to deactivate invitation.", "error");
    }
  };

  const confirmDelete = (inviteId) => {
    setInviteToDelete(inviteId);
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!inviteToDelete) return;
    try {
      await enrollmentService.deleteInvitation(inviteToDelete);
      showToast("Invitation deleted.");
      fetchInvitations();
    } catch (error) {
      showToast("Failed to delete invitation.", "error");
    } finally {
      setDeleteConfirmOpen(false);
      setInviteToDelete(null);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourse || !selectedSection || !assignUid) {
      showToast("Please select a course, section, and a student.", "error");
      return;
    }

    setAssigning(true);
    try {
      const payload = {
        courseId: selectedCourse,
        sectionId: selectedSection,
        yearLevel: Number(yearLevel),
        enrollmentStatus,
      };
      if (selectedSpecialization) payload.specializationId = selectedSpecialization;

      await studentService.updateStudentAcademicInfo(assignUid, payload);
      
      showToast("Student assigned successfully.");
      setShowAssignForm(false);
      setAssignUid("");
      await fetchInitialData(); // Refresh list
    } catch (error) {
      showToast(error.message || "Failed to assign student", "error");
    } finally {
      setAssigning(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Render Helpers
  // ---------------------------------------------------------------------------
  const getCourseCode = (id) => courses.find((c) => c.id === id)?.code || "N/A";
  
  const getSectionName = (cId, sId) => {
    // Try current course sections first, then fall back to allSectionsByCourse cache
    const fromCurrent = sections.find((s) => s.id === sId)?.name;
    if (fromCurrent) return fromCurrent;
    const fromCache = (allSectionsByCourse[cId] || []).find((s) => s.id === sId)?.name;
    return fromCache || sId;
  };

  const handleCourseSelect = (courseId, specId, sectionId) => {
    setSelectedCourse(courseId || "");
    setSelectedSpecialization(specId || "");
    setSelectedSection(sectionId || "");
    // Also update current sections cache for the filter bar
    if (courseId) {
      setSections(allSectionsByCourse[courseId] || []);
    } else {
      setSections([]);
    }
  };

  const getSpecializationName = (cId, specId) => {
    if (!specId) return "—";
    const c = courses.find((x) => x.id === cId);
    if (!c) return "—";
    const s = c.specializations?.find((x) => x.id === specId);
    return s ? (s.code || s.name) : "—";
  };

  // Table structure
  const columns = [
    { label: "Student Name", className: "w-[180px] min-w-[150px]" },
    { label: "Student ID", className: "min-w-[120px]" },
    { label: "Program", className: "min-w-[100px]" },
    { label: "Specialization", className: "min-w-[130px]" },
    { label: "Section", className: "min-w-[90px]" },
    { label: "Year Level", className: "min-w-[110px] text-center whitespace-nowrap" },
    { label: "Status", className: "min-w-[110px] text-right" },
  ];

  return (
    <div className="space-y-6 font-inter">
      {/* Page Header (Preserved existing manual assign action) */}
      <PageHeader
        icon={HiAcademicCap}
        title="Students"
        description="Manage student directory and generate enrollment links."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAssignForm(!showAssignForm)}
              disabled={!selectedCourse || !selectedSection}
            >
              <HiCheckCircle className="w-3.5 h-3.5 mr-1.5" /> Manual Assign
            </Button>
          </div>
        }
      />

      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage("")} />
      )}

      {/* Manual Assignment Form (Legacy/Preserved) */}
      {showAssignForm && selectedCourse && selectedSection && (
        <Card className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
          <h3 className="text-sm font-semibold mb-3 text-blue-800 dark:text-blue-300">Assign Student</h3>
          <form onSubmit={handleAssignSubmit} className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-500 mb-1">Select Unassigned Student</label>
              <select
                className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm px-3"
                value={assignUid}
                onChange={(e) => setAssignUid(e.target.value)}
                required
              >
                <option value="" disabled>Choose a student...</option>
                {unassignedStudents.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.fullName} ({u.studentIdOrEmployeeId || u.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-32">
              <label className="block text-xs font-medium text-gray-500 mb-1">Year Level</label>
              <select
                className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm px-3"
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
              >
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>
            <div className="w-full md:w-48">
              <label className="block text-xs font-medium text-gray-500 mb-1">Enrollment Status</label>
              <select
                className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm px-3"
                value={enrollmentStatus}
                onChange={(e) => setEnrollmentStatus(e.target.value)}
              >
                <option value="enrolled">Enrolled - Regular</option>
                <option value="irregular">Enrolled - Irregular</option>
                <option value="leave">Leave of Absence</option>
              </select>
            </div>
            <div className="flex gap-2 w-full md:w-auto mt-3 md:mt-0">
              <Button type="button" variant="outline" onClick={() => setShowAssignForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={assigning}>
                Assign
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 
        Google Classroom-style Filter Row
        - Minimal, flat, no heavy borders.
        - Flex layout aligned with search bar.
      */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-4 pb-2">
        <div className="flex flex-col md:flex-row items-end gap-3 flex-1 w-full">
          {/* Search Bar */}
          <div className="w-full md:max-w-xs">
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
              Search
            </label>
            <Input
              placeholder="Search students..."
              icon={HiMagnifyingGlass}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-slate-900 shadow-sm"
            />
          </div>

          {/* Filter Icon Indicator (visual only) */}
          <div className="hidden md:flex h-10 items-center px-1">
            <HiFunnel className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </div>

          {/* Program/Course Filter - Custom flyout dropdown */}
          <div className="w-full md:w-48">
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
              Program
            </label>
            <CourseFilterDropdown
              courses={courses}
              sectionsByCourse={allSectionsByCourse}
              selectedCourse={selectedCourse}
              selectedSpecialization={selectedSpecialization}
              selectedSection={selectedSection}
              onSelect={handleCourseSelect}
              placeholder="All Programs"
            />
          </div>

          {/* Specialization Filter (Conditional) */}
          {hasSpecializations && (
            <div className="w-full md:w-56 animate-in fade-in slide-in-from-left-2 duration-200">
              <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Specialization
              </label>
              <select
                className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-[13px] font-medium text-gray-600 dark:text-gray-300 px-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                value={selectedSpecialization}
                onChange={(e) => {
                  setSelectedSpecialization(e.target.value);
                  setSelectedSection("");
                }}
              >
                <option value="">Select Specialization...</option>
                {specializations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code || s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Section Filter (Conditional based on course/specialization logic) */}
          {showSectionFilter && (
            <div className="w-full md:w-40 animate-in fade-in slide-in-from-left-2 duration-200">
              <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Section
              </label>
              <select
                className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-[13px] font-medium text-gray-600 dark:text-gray-300 px-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow disabled:opacity-50"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                <option value="">Select Section...</option>
                {relevantSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Generate Invite Link Button (Far Right) */}
        <div className="w-full md:w-auto shrink-0 mt-4 md:mt-0">
          <Button
            variant="primary"
            size="md"
            className="w-full md:w-auto h-10 shadow-sm"
            onClick={handleGenerateLink}
            disabled={!isInviteEnabled()}
            isLoading={generatingLink}
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Create Invite Link
          </Button>
        </div>
      </div>

      {/* Invitations List (Appears below filter bar if valid filters selected) */}
      {isInviteEnabled() && (
        <div className="pt-2 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Active Join Links for this selection
            </h3>
          </div>
          {loadingInvites ? (
            <div className="text-xs text-gray-400">Loading links...</div>
          ) : invitations.length === 0 ? (
            <div className="text-xs text-gray-400 italic">No active links for this selection.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {invitations.map(invite => (
                <div key={invite.id} className={`flex items-center justify-between p-3 rounded-lg border ${invite.active ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 'bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-700'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant={invite.active ? "emerald" : "gray"}>
                      {invite.active ? "Active" : "Inactive"}
                    </Badge>
                    <span className={`text-sm font-medium truncate max-w-[200px] md:max-w-none ${invite.active ? 'text-emerald-700 dark:text-emerald-400' : 'text-black dark:text-gray-300'}`}>
                      {window.location.origin}/join/{invite.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => handleCopyLink(invite.id)} title="Copy Link">
                      <HiDocumentDuplicate className="w-4 h-4 text-gray-500" />
                    </Button>
                    {invite.active ? (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-orange-500 hover:text-orange-600 hover:bg-orange-50" 
                        onClick={() => handleDeactivate(invite.id)}
                        title="Deactivate Link"
                      >
                        <HiXCircle className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-600 hover:bg-red-50" 
                        onClick={() => confirmDelete(invite.id)}
                        title="Delete Link"
                      >
                        <HiTrash className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 
        Clean Students Table
        - Standardized typography (Inter is inherited from layout, but we enforce sizing)
        - Consistent alignments and visual clean-up.
      */}
      <DataTable columns={columns} className="shadow-sm">
        {loading ? (
          <TableRow>
            <TableCell colSpan={5} className="py-12 text-center text-gray-400">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm">Loading students...</span>
              </div>
            </TableCell>
          </TableRow>
        ) : filteredStudents.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-16 text-center text-gray-400">
              <span className="text-sm">No students match the selected filters.</span>
            </TableCell>
          </TableRow>
        ) : (
          filteredStudents.map((u) => (
            <TableRow key={u.uid}>
              <TableCell className="max-w-[200px]">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {u.fullName ? u.fullName.charAt(0) : "S"}
                  </div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">
                    {u.fullName || "Unnamed User"}
                  </span>
                </div>
              </TableCell>

              <TableCell className="max-w-[120px] font-semibold text-gray-700 dark:text-gray-300 truncate">
                {u.studentIdOrEmployeeId || "—"}
              </TableCell>

              <TableCell className="max-w-[120px] font-semibold text-gray-700 dark:text-gray-300 truncate">
                {u.courseId ? getCourseCode(u.courseId) : "—"}
              </TableCell>

              <TableCell className="max-w-[140px] font-semibold text-gray-700 dark:text-gray-300 truncate">
                {u.courseId ? getSpecializationName(u.courseId, u.specializationId) : "—"}
              </TableCell>

              <TableCell className="max-w-[100px] font-semibold text-gray-700 dark:text-gray-300 truncate">
                {u.courseId && u.sectionId ? getSectionName(u.courseId, u.sectionId) : "—"}
              </TableCell>

              <TableCell className="text-center max-w-[110px] font-semibold text-gray-700 dark:text-gray-300 truncate">
                {u.yearLevel ? `${u.yearLevel}${u.yearLevel === 3 ? "rd" : "th"} Year` : "—"}
              </TableCell>

              <TableCell className="text-right max-w-[120px]">
                {u.enrollmentStatus ? (
                  <div className="flex justify-end truncate">
                    <Badge 
                      variant={u.enrollmentStatus === "enrolled" ? "emerald" : "orange"}
                      className="text-[11px] px-2 py-0.5 uppercase tracking-wide truncate max-w-full"
                    >
                      {u.enrollmentStatus}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500 font-semibold text-xs truncate">—</span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </DataTable>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Join Link"
        icon={HiTrash}
        maxWidth="max-w-md"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 font-medium">
          Are you sure you want to permanently delete this join link? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            className="bg-red-500 hover:bg-red-600 focus:ring-red-500/20 text-white border-none shadow-sm"
            onClick={executeDelete}
          >
            Delete Link
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default StudentDirectory;
