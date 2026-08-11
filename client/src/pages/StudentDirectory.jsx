import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Users, GraduationCap, CheckCircle } from "lucide-react";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import { studentService } from "../services/student.service";

export const StudentDirectory = () => {
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");

  // Assignment Modal/State
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignUid, setAssignUid] = useState("");
  const [yearLevel, setYearLevel] = useState(1);
  const [enrollmentStatus, setEnrollmentStatus] = useState("enrolled");
  const [assigning, setAssigning] = useState(false);

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

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [coursesData, studentsData] = await Promise.all([
        courseService.getAllCourses(),
        studentService.getAllStudents()
      ]);
      setCourses(coursesData);
      setStudents(studentsData);
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

  const showToast = (msg, variant = "success") => {
    setToastMessage(msg);
    setToastVariant(variant);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourse || !selectedSection || !assignUid) {
      showToast("Please select a course, section, and a student.", "error");
      return;
    }

    setAssigning(true);
    try {
      await studentService.updateStudentAcademicInfo(assignUid, {
        courseId: selectedCourse,
        sectionId: selectedSection,
        yearLevel: Number(yearLevel),
        enrollmentStatus
      });
      
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

  // Derived data
  const filteredStudents = students.filter(s => {
    if (selectedCourse && s.courseId !== selectedCourse) return false;
    if (selectedSection && s.sectionId !== selectedSection) return false;
    return true;
  });

  const unassignedStudents = students.filter(s => !s.courseId || !s.sectionId);

  const columns = [
    { label: "Student" },
    { label: "ID Number" },
    { label: "Course / Section" },
    { label: "Year Level" },
    { label: "Enrollment Status" }
  ];

  const getCourseCode = (id) => courses.find(c => c.id === id)?.code || "N/A";
  
  // Try to find section name from loaded sections if it belongs to selected course,
  // else we might not have it loaded (requires a global sections fetch, but for simplicity we display ID or generic)
  const getSectionName = (cId, sId) => {
    if (cId === selectedCourse) {
      return sections.find(s => s.id === sId)?.name || sId;
    }
    return "Assigned";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={GraduationCap}
        title="Student Assignment"
        description="Map students to their specific course and section."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAssignForm(!showAssignForm)}
              disabled={!selectedCourse || !selectedSection}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Assign Student to Selected Section
            </Button>
          </div>
        }
      />

      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage("")} />
      )}

      {/* Course & Section Selectors */}
      <Card className="p-4 flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Filter by Course</label>
          <select
            className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm px-3"
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setSelectedSection(""); // reset section when course changes
            }}
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-1/3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Filter by Section</label>
          <select
            className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm px-3 disabled:opacity-50"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedCourse}
          >
            <option value="">All Sections in Course</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Assignment Form (Visible only if toggle is true) */}
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
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
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

      {/* Students Table */}
      <DataTable columns={columns}>
        {loading ? (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-gray-400">
              Loading students...
            </TableCell>
          </TableRow>
        ) : filteredStudents.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-gray-400">
              No students found for this selection.
            </TableCell>
          </TableRow>
        ) : (
          filteredStudents.map((u) => (
            <TableRow key={u.uid}>
              <TableCell className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                  {u.fullName ? u.fullName.charAt(0) : "S"}
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">{u.fullName}</div>
                  <div className="text-gray-400 dark:text-gray-500 text-[11px]">{u.email}</div>
                </div>
              </TableCell>

              <TableCell className="font-mono text-gray-500 dark:text-gray-400">
                {u.studentIdOrEmployeeId || "N/A"}
              </TableCell>

              <TableCell>
                {u.courseId ? (
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                      {getCourseCode(u.courseId)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {u.sectionId ? getSectionName(u.courseId, u.sectionId) : "No section"}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400 italic text-sm">Unassigned</span>
                )}
              </TableCell>

              <TableCell>
                {u.yearLevel ? `Year ${u.yearLevel}` : "-"}
              </TableCell>

              <TableCell>
                {u.enrollmentStatus ? (
                  <Badge variant={u.enrollmentStatus === "enrolled" ? "emerald" : "orange"}>
                    {u.enrollmentStatus.toUpperCase()}
                  </Badge>
                ) : (
                  "-"
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </DataTable>
    </div>
  );
};

export default StudentDirectory;
