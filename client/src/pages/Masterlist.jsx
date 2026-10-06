// src/pages/Masterlist.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import {
  HiClipboardDocumentList,
  HiAcademicCap,
  HiMagnifyingGlass,
  HiCheckCircle,
  HiExclamationCircle,
  HiUsers,
  HiUserGroup,
} from "react-icons/hi2";
import { studentService } from "../services/student.service";
import { groupService } from "../services/group.service";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";

export const Masterlist = () => {
  const { userProfile, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [section, setSection] = useState(null);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState({ message: "", variant: "error" });

  useEffect(() => {
    if (role === "student" && userProfile?.uid) {
      loadMasterlistData();
    } else {
      setLoading(false);
    }
  }, [role, userProfile]);

  const loadMasterlistData = async () => {
    if (!userProfile?.sectionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Load course and section metadata
      const [allCourses, allSections] = await Promise.all([
        courseService.getAllCourses(),
        sectionService.getAllSections(),
      ]);

      const foundCourse = allCourses.find((c) => c.id === userProfile.courseId);
      const foundSection = allSections.find((s) => s.id === userProfile.sectionId);
      setCourse(foundCourse || null);
      setSection(foundSection || null);

      // 2. Fetch all students belonging to the same academic section
      const allStudents = await studentService.getAllStudents();
      const sectionStudents = allStudents.filter(
        (s) => s.sectionId === userProfile.sectionId
      );

      // 3. Fetch all groups in this section to determine group status automatically
      const sectionGroups = await groupService.getGroupsBySection(userProfile.sectionId);
      setGroups(sectionGroups);
      setStudents(sectionStudents);
    } catch (err) {
      console.error("[Masterlist] Error loading section masterlist:", err);
      setToast({ message: "Unable to load section masterlist.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine real-time group status
  const getStudentGroupInfo = (studentUid) => {
    const matchedGroup = groups.find((g) => (g.memberIds || []).includes(studentUid));
    if (matchedGroup) {
      return {
        inGroup: true,
        statusLabel: "In a Group",
        groupName: matchedGroup.name,
      };
    }
    return {
      inGroup: false,
      statusLabel: "Looking for a Group",
      groupName: null,
    };
  };

  // Filter students based on search query
  const filteredStudents = students.filter((student) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const fullName = (
      student.fullName ||
      `${student.first_name || ""} ${student.last_name || ""}`
    ).toLowerCase();

    const studentNumber = (
      student.studentIdOrEmployeeId ||
      student.studentId ||
      student.studentNumber ||
      ""
    ).toLowerCase();

    return fullName.includes(q) || studentNumber.includes(q);
  });

  const tableColumns = [
    { label: "Student ID", className: "min-w-[130px]" },
    { label: "Name", className: "min-w-[200px]" },
    { label: "Program", className: "min-w-[120px]" },
    { label: "Major", className: "min-w-[140px]" },
    { label: "Section", className: "min-w-[90px]" },
    { label: "Group Status", className: "min-w-[170px]" },
  ];

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-gray-400 space-y-3 font-inter">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-sm font-medium">Loading section masterlist...</span>
      </div>
    );
  }

  // 1. EMPTY STATE: Student Has No Section Assigned Yet (Prompt Section 2.6)
  if (!userProfile?.sectionId) {
    return (
      <div className="space-y-6 font-inter">
        <PageHeader
          icon={HiClipboardDocumentList}
          title="Section Masterlist"
          description="View classmates registered in your academic section."
        />

        <Card className="p-10 text-center bg-white dark:bg-[#15161e] border-dashed border-2 border-gray-200 dark:border-[#222433] rounded-2xl shadow-xs">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-900/30">
            <HiAcademicCap className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No Section Assigned Yet
          </h3>
          <p className="text-gray-500 dark:text-[#9396a8] max-w-lg mx-auto text-sm leading-relaxed mb-6">
            You haven't been assigned to a section yet. Once your section is assigned by the administrator, you'll be able to view the masterlist of your classmates and see who is available to join a research group.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 dark:bg-[#1a1b26] text-xs font-medium text-gray-600 dark:text-[#9396a8] border border-gray-200 dark:border-[#222433]">
            Please wait for your section assignment or contact your administrator for assistance.
          </div>
        </Card>
      </div>
    );
  }

  // 2. ACTIVE SECTION MASTERLIST
  return (
    <div className="space-y-4 sm:space-y-6 font-inter">
      {toast.message && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast({ message: "", variant: "error" })}
        />
      )}

      <PageHeader
        icon={HiClipboardDocumentList}
        title="Section Masterlist"
        description={`Class directory for ${course?.code || userProfile?.programCode || "BSIT"} • ${userProfile?.majorCode || userProfile?.programSpecialization || "Major"} • Section ${section?.name || userProfile?.sectionName || "A"}`}
      />

      {/* Info Stats Bar — compact horizontal on mobile */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="p-2.5 sm:p-4 bg-white dark:bg-[#15161e] rounded-xl border border-gray-200 dark:border-[#222433] shadow-xs flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center shrink-0">
            <HiUsers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-xs text-gray-400 uppercase font-semibold block truncate">Classmates</span>
            <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{students.length}</span>
          </div>
        </div>

        <div className="p-2.5 sm:p-4 bg-white dark:bg-[#15161e] rounded-xl border border-gray-200 dark:border-[#222433] shadow-xs flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center shrink-0">
            <HiCheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-xs text-gray-400 uppercase font-semibold block truncate">In Group</span>
            <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              {students.filter((s) => getStudentGroupInfo(s.uid).inGroup).length}
            </span>
          </div>
        </div>

        <div className="p-2.5 sm:p-4 bg-white dark:bg-[#15161e] rounded-xl border border-gray-200 dark:border-[#222433] shadow-xs flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center shrink-0">
            <HiExclamationCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-xs text-gray-400 uppercase font-semibold block truncate">No Group</span>
            <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              {students.filter((s) => !getStudentGroupInfo(s.uid).inGroup).length}
            </span>
          </div>
        </div>
      </div>

      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Input
            icon={HiMagnifyingGlass}
            placeholder="Search classmates by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 text-sm"
          />
        </div>

        <div className="text-xs text-gray-400">
          Showing {filteredStudents.length} of {students.length} students
        </div>
      </div>

      {/* Desktop Table — hidden on mobile */}
      <div className="hidden md:block bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200/90 dark:border-[#222433] shadow-sm overflow-hidden">
        <DataTable columns={tableColumns} className="shadow-none">
          {filteredStudents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-16 text-center text-gray-400">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <HiUsers className="w-12 h-12 text-gray-300 dark:text-[#6b6f84]" />
                  {students.length === 0 ? (
                    <>
                      <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">
                        No Students Found
                      </h4>
                      <p className="text-xs text-gray-400">
                        No students are currently registered in your section.
                      </p>
                    </>
                  ) : (
                    <>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        No Matching Students
                      </h4>
                      <p className="text-xs text-gray-400">
                        Try adjusting your search criteria.
                      </p>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredStudents.map((student) => {
              const groupInfo = getStudentGroupInfo(student.uid);
              const isCurrentUser = student.uid === userProfile.uid;
              const studentName =
                student.fullName ||
                `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
                "Student";
              const studentNumber =
                student.studentIdOrEmployeeId ||
                student.studentId ||
                student.studentNumber ||
                "—";
              const programDisplay =
                student.programCode || course?.code || (student.program?.includes("Information Technology") ? "BSIT" : student.program) || "BSIT";
              const majorDisplay =
                student.majorCode || (student.programSpecialization?.includes("WMAD") ? "WMAD" : student.programSpecialization?.includes("AMG") ? "AMG" : student.programSpecialization?.includes("SMP") ? "SMP" : student.programSpecialization) || "—";
              const sectionDisplay = section?.name || student.sectionName || "A";

              return (
                <TableRow
                  key={student.uid}
                  className={`transition-colors ${
                    isCurrentUser
                      ? "bg-blue-50/40 dark:bg-blue-950/20 font-medium"
                      : "hover:bg-gray-50/70 dark:hover:bg-[#1a1b26]/50"
                  }`}
                >
                  {/* 1. Student ID */}
                  <TableCell>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {studentNumber}
                    </span>
                  </TableCell>

                  {/* 2. Name */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isCurrentUser
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 dark:bg-[#1f202e] text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {studentName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                            {studentName}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="blue" className="text-[9px] px-1.5 py-0">
                              You
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 truncate block">
                          {student.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* 3. Program */}
                  <TableCell>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {programDisplay}
                    </span>
                  </TableCell>

                  {/* 4. Major */}
                  <TableCell>
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      {majorDisplay}
                    </span>
                  </TableCell>

                  {/* 5. Section */}
                  <TableCell>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {sectionDisplay}
                    </span>
                  </TableCell>

                  {/* 6. Group Status */}
                  <TableCell>
                    {groupInfo.inGroup ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          In a Group
                        </span>
                        {groupInfo.groupName && (
                          <span className="text-[11px] text-gray-400 truncate max-w-[120px]">
                            ({groupInfo.groupName})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          Looking for a Group
                        </span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </DataTable>
      </div>

      {/* Mobile Card List — shown only on mobile */}
      <div className="md:hidden bg-white dark:bg-[#15161e] rounded-xl border border-gray-200 dark:border-[#222433] shadow-sm overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <HiUsers className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-[#6b6f84]" />
            <p className="text-sm font-medium">{students.length === 0 ? 'No students found' : 'No matching students'}</p>
          </div>
        ) : (
          <div className="mobile-card-list divide-y divide-gray-100 dark:divide-[#222433]">
            {filteredStudents.map((student) => {
              const groupInfo = getStudentGroupInfo(student.uid);
              const isCurrentUser = student.uid === userProfile.uid;
              const studentName =
                student.fullName ||
                `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
                "Student";
              const studentNumber =
                student.studentIdOrEmployeeId ||
                student.studentId ||
                student.studentNumber ||
                "N/A";

              return (
                <div
                  key={student.uid}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    isCurrentUser ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isCurrentUser
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-[#1f202e] text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {studentName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {studentName}
                      </span>
                      {isCurrentUser && (
                        <Badge variant="blue" className="text-[9px] px-1.5 py-0">You</Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 block truncate">{student.email}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[11px] font-semibold text-gray-500 block" style={{ fontFamily: 'Poppins, sans-serif' }}>{studentNumber}</span>
                    {groupInfo.inGroup ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">In Group</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">No Group</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Masterlist;
