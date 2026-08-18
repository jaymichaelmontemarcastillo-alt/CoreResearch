import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { CourseFilterDropdown } from "../components/ui/CourseFilterDropdown";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import {
  Users,
  CheckCircle,
  Plus,
  Search,
  Filter,
} from "lucide-react";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import { studentService } from "../services/student.service";
import { groupService } from "../services/group.service";
import { titleProposalService } from "../services/titleProposal.service";

export const ResearchGroups = () => {
  // --- Data State ---
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [allSectionsByCourse, setAllSectionsByCourse] = useState({});
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [groups, setGroups] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  
  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  
  // --- UI/Action State ---
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [creating, setCreating] = useState(false);

  // ---------------------------------------------------------------------------
  // 1. Data Fetching Effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchSectionsForCourse(selectedCourse);
    } else {
      setSections([]);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedCourse && selectedSection) {
      fetchGroupsAndStudents();
    } else {
      setGroups([]);
      setProposals([]);
      setUnassignedStudents([]);
      setSelectedStudentIds([]);
    }
  }, [selectedSection, selectedCourse]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [coursesData, studentsData] = await Promise.all([
        courseService.getAllCourses(),
        studentService.getAllStudents(),
      ]);
      setCourses(coursesData);
      setStudents(studentsData);
      // Pre-fetch sections for all courses
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

  const fetchGroupsAndStudents = async () => {
    setLoading(true);
    setSelectedStudentIds([]);
    try {
      const sectionGroups = await groupService.getGroupsBySection(selectedSection);
      
      // Fetch proposals for these groups to get the Title
      const groupIds = sectionGroups.map(g => g.id);
      let sectionProposals = [];
      if (groupIds.length > 0) {
        sectionProposals = await titleProposalService.getProposalsByGroupIds(groupIds);
      }
      
      // Filter students who belong to this course & section
      const sectionStudents = students.filter(
        s => s.courseId === selectedCourse && s.sectionId === selectedSection
      );

      // Find students who are NOT in any of the sectionGroups
      const assignedIds = new Set();
      sectionGroups.forEach(g => {
        g.memberIds.forEach(uid => assignedIds.add(uid));
      });

      const unassigned = sectionStudents.filter(s => !assignedIds.has(s.uid));

      setGroups(sectionGroups);
      setProposals(sectionProposals);
      setUnassignedStudents(unassigned);
    } catch (error) {
      console.error("Failed to load groups and students", error);
      showToast(error.response?.data?.message || error.message || "Failed to load groups data.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. Derived State & Filter Logic
  // ---------------------------------------------------------------------------
  const courseObj = courses.find((c) => c.id === selectedCourse);
  const specializations = courseObj?.specializations || [];
  const hasSpecializations = specializations.length > 0;

  const relevantSections = sections.filter((s) => {
    if (hasSpecializations && selectedSpecialization) {
      return s.specializationId === selectedSpecialization;
    }
    return true;
  });

  const specHasSections = hasSpecializations && relevantSections.length > 0;

  const showSectionFilter =
    (!hasSpecializations && selectedCourse) || 
    (hasSpecializations && selectedSpecialization && specHasSections);

  // Filter groups based on search query
  const filteredGroups = groups.filter((g) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    
    // Match group name, member names, or title
    const matchName = g.name.toLowerCase().includes(q);
    const matchMember = g.members.some(m => m.fullName.toLowerCase().includes(q));
    const proposal = proposals.find(p => p.groupId === g.id);
    const matchTitle = proposal?.title?.toLowerCase().includes(q);
    
    return matchName || matchMember || matchTitle;
  });

  // ---------------------------------------------------------------------------
  // 3. Handlers
  // ---------------------------------------------------------------------------
  const showToast = (msg, variant = "success") => {
    setToastMessage(msg);
    setToastVariant(variant);
  };

  const handleCourseSelect = (courseId, specId, sectionId) => {
    setSelectedCourse(courseId || "");
    setSelectedSpecialization(specId || "");
    setSelectedSection(sectionId || "");
    if (courseId) {
      setSections(allSectionsByCourse[courseId] || []);
    } else {
      setSections([]);
    }
  };

  const toggleStudentSelection = (uid) => {
    setSelectedStudentIds(prev => {
      if (prev.includes(uid)) {
        return prev.filter(id => id !== uid);
      } else {
        if (prev.length >= 3) {
          showToast("A research group can only contain up to 3 members.", "error");
          return prev;
        }
        return [...prev, uid];
      }
    });
  };

  const handleCreateGroup = async () => {
    if (selectedStudentIds.length === 0 || selectedStudentIds.length > 3) {
      showToast("Please select 1 to 3 students.", "error");
      return;
    }

    setCreating(true);
    try {
      const members = selectedStudentIds.map(uid => {
        const student = unassignedStudents.find(s => s.uid === uid);
        return {
          uid: student.uid,
          fullName: student.fullName,
          email: student.email
        };
      });

      await groupService.createGroup({
        courseId: selectedCourse,
        sectionId: selectedSection,
        memberIds: selectedStudentIds,
        members
      });

      showToast("Research Group created successfully!");
      setIsCreateModalOpen(false);
      await fetchGroupsAndStudents();
    } catch (error) {
      console.error("Error creating group:", error);
      showToast(error.message || "Failed to create group", "error");
    } finally {
      setCreating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Helpers for Schedule Header
  // ---------------------------------------------------------------------------
  const currentSection = sections.find(s => s.id === selectedSection);
  const currentSpec = specializations.find(s => s.id === selectedSpecialization);
  const courseFullName = courseObj?.name || "PROGRAM NOT SELECTED";
  const specFullName = currentSpec?.name || "";
  const sectionName = currentSection?.name || "";
  
  const getProposalForGroup = (groupId) => {
    return proposals.find(p => p.groupId === groupId);
  };
  
  const getMockTime = (index) => {
    const startMinutes = 8 * 60 + 30; // 8:30 in minutes
    const currentMinutes = startMinutes + (index * 10);
    const hours = Math.floor(currentMinutes / 60);
    const mins = currentMinutes % 60;
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')}`;
  };

  const tableColumns = [
    { label: "Time", className: "w-[100px] text-center whitespace-nowrap" },
    { label: "Name of Students", className: "min-w-[200px]" },
    { label: "Title", className: "min-w-[250px]" },
    { label: "Adviser", className: "min-w-[200px]" },
  ];

  return (
    <div className="space-y-6 font-inter">
      <PageHeader
        icon={Users}
        title="Research Groups"
        description="View and manage research groups and title defense schedules."
      />

      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage("")} />
      )}

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-4 pb-2">
        <div className="flex flex-col md:flex-row items-end gap-3 flex-1 w-full">
          {/* Search Bar */}
          <div className="w-full md:max-w-xs">
            <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
              Search Groups
            </label>
            <Input
              placeholder="Search by name, student, or title..."
              icon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-slate-900 shadow-sm"
            />
          </div>

          <div className="hidden md:flex h-10 items-center px-1">
            <Filter className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </div>

          {/* Program/Course Filter */}
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

          {/* Specialization Filter */}
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

          {/* Section Filter */}
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

        {/* Create Group Button */}
        <div className="w-full md:w-auto shrink-0 mt-4 md:mt-0">
          <Button
            variant="primary"
            size="md"
            className="w-full md:w-auto h-10 shadow-sm"
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!selectedCourse || !selectedSection}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Research Group
          </Button>
        </div>
      </div>

      {/* Schedule Table View */}
      {selectedCourse && selectedSection && (
        <div className="space-y-6">
          {/* Header styling to look like a clean web dashboard section */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {courseFullName}
              </h2>
              {specFullName && (
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                  Specialized in <span className="text-gray-700 dark:text-gray-300">{specFullName}</span>
                </p>
              )}
            </div>
            <div className="text-left md:text-right">
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Schedule of Title Defense
              </h3>
              <div className="flex items-center gap-2 mt-2 md:justify-end">
                <Badge variant="blue" className="px-2.5 py-1">March 13, 2026</Badge>
                <Badge variant="gray" className="px-2.5 py-1">8:30 AM</Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Section <span className="text-gray-900 dark:text-white">{sectionName}</span>
            </h3>
          </div>

          <DataTable columns={tableColumns} className="shadow-sm">
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="text-sm">Loading schedule...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center text-gray-400">
                  <span className="text-sm">No groups found for this section.</span>
                </TableCell>
              </TableRow>
            ) : (
              filteredGroups.map((group, index) => {
                const proposal = getProposalForGroup(group.id);
                return (
                  <TableRow key={group.id}>
                    <TableCell className="text-center">
                      <Badge variant="gray" className="font-semibold text-[13px]">
                        {getMockTime(index)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        {group.members.map(member => (
                          <div key={member.uid} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {member.fullName.charAt(0)}
                            </div>
                            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                              {member.fullName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>
                      {proposal ? (
                        <div className="font-semibold text-gray-900 dark:text-white line-clamp-3">
                          {proposal.title}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No approved title yet</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                          {group.adviserName || "Pending Adviser"}
                        </span>
                        {group.adviserName && (
                          <span className="text-xs text-gray-400">Scheduled: May 18, 2026</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </DataTable>
        </div>
      )}

      {/* Create Group Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedStudentIds([]);
        }}
        title="Create Research Group"
        icon={Users}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Unassigned Students ({unassignedStudents.length})
            </h3>
            <Badge variant="gray">{selectedStudentIds.length} / 3 Selected</Badge>
          </div>

          {unassignedStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm italic">
              All students in this section are assigned to a group.
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {unassignedStudents.map(student => (
                <div
                  key={student.uid}
                  onClick={() => toggleStudentSelection(student.uid)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedStudentIds.includes(student.uid)
                      ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                      : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                      {student.fullName}
                    </span>
                    <span className="text-xs text-gray-500">{student.studentIdOrEmployeeId || student.email}</span>
                  </div>
                  {selectedStudentIds.includes(student.uid) && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 gap-3">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              disabled={selectedStudentIds.length === 0 || selectedStudentIds.length > 3 || creating}
              isLoading={creating}
              onClick={handleCreateGroup}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ResearchGroups;

