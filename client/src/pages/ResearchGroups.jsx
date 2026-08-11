import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Users, CheckCircle, Plus, Eye, X } from "lucide-react";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import { studentService } from "../services/student.service";
import { groupService } from "../services/group.service";

export const ResearchGroups = () => {
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [creating, setCreating] = useState(false);

  const [viewingGroup, setViewingGroup] = useState(null);

  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");

  useEffect(() => {
    fetchCourses();
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
      setUnassignedStudents([]);
      setSelectedStudentIds([]);
    }
  }, [selectedSection]);

  const fetchCourses = async () => {
    try {
      const coursesData = await courseService.getAllCourses();
      setCourses(coursesData);
    } catch (error) {
      console.error("Failed to load courses", error);
    }
  };

  const fetchSectionsForCourse = async (courseId) => {
    try {
      const sectionsData = await sectionService.getSectionsByCourseId(courseId);
      setSections(sectionsData);
    } catch (error) {
      console.error("Failed to load sections", error);
    }
  };

  const fetchGroupsAndStudents = async () => {
    setLoading(true);
    setSelectedStudentIds([]);
    try {
      const [allStudents, sectionGroups] = await Promise.all([
        studentService.getAllStudents(),
        groupService.getGroupsBySection(selectedSection)
      ]);

      // Filter students who belong to this course & section
      const sectionStudents = allStudents.filter(
        s => s.courseId === selectedCourse && s.sectionId === selectedSection
      );

      // Find students who are NOT in any of the sectionGroups
      const assignedIds = new Set();
      sectionGroups.forEach(g => {
        g.memberIds.forEach(uid => assignedIds.add(uid));
      });

      const unassigned = sectionStudents.filter(s => !assignedIds.has(s.uid));

      setGroups(sectionGroups);
      setUnassignedStudents(unassigned);
    } catch (error) {
      console.error("Failed to load groups and students", error);
      showToast(error.response?.data?.message || error.message || "Failed to load groups data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, variant = "success") => {
    setToastMessage(msg);
    setToastVariant(variant);
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
      // Map IDs to ResearchGroupMember objects
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
      // Refresh the view
      await fetchGroupsAndStudents();
    } catch (error) {
      console.error("Error creating group:", error);
      showToast(error.message || "Failed to create group", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Research Groups"
        description="Organize students into 3-member research groups."
      />

      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage("")} />
      )}

      {/* Course & Section Selectors */}
      <Card className="p-4 flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Select Course</label>
          <select
            className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm px-3"
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setSelectedSection("");
            }}
          >
            <option value="">Choose Course...</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-1/2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Select Section</label>
          <select
            className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm px-3 disabled:opacity-50"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedCourse}
          >
            <option value="">Choose Section...</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Main Content Area */}
      {selectedCourse && selectedSection && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Unassigned Students */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Unassigned Students ({unassignedStudents.length})
              </h3>
              <Badge variant="gray">{selectedStudentIds.length} / 3 Selected</Badge>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading students...</div>
            ) : unassignedStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm italic">
                All students in this section are assigned to a group.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
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
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button 
              variant="primary" 
              className="w-full py-2.5" 
              disabled={selectedStudentIds.length === 0 || selectedStudentIds.length > 3 || creating}
              isLoading={creating}
              onClick={handleCreateGroup}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Research Group
            </Button>
          </div>

          {/* Right Column: Existing Groups */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Created Groups ({groups.length})
              </h3>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading groups...</div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm italic">
                No research groups created yet for this section.
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {groups.map(group => (
                  <div key={group.id} className="border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                    <div className="p-4 space-y-4">
                      {/* Header */}
                      <div>
                        <h4 className="font-bold text-lg text-gray-900 dark:text-white leading-none">
                          {group.name}
                        </h4>
                      </div>

                      {/* Members List - Dot separated */}
                      <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {group.members.map(m => m.fullName.split(' ')[0]).join(" • ")}
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-500">Status:</span>
                        {group.status === 'ready' ? (
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            Ready
                          </span>
                        ) : group.status === 'incomplete' ? (
                          <span className="text-sm font-semibold text-orange-500">
                            Incomplete
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 capitalize">
                            {group.status}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Actions footer */}
                    <div className="bg-gray-50 dark:bg-slate-800/50 p-3 border-t border-gray-200 dark:border-slate-700">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 shadow-sm"
                        onClick={() => setViewingGroup(group)}
                      >
                        <Eye className="w-4 h-4 mr-2 text-gray-500" />
                        View Group
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Group Modal */}
      {viewingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {viewingGroup.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {courses.find(c => c.id === viewingGroup.courseId)?.name} • {sections.find(s => s.id === viewingGroup.sectionId)?.name}
                </p>
              </div>
              <button 
                onClick={() => setViewingGroup(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  Group Members ({viewingGroup.members.length}/3)
                </h4>
                <div className="space-y-3">
                  {viewingGroup.members.map(member => (
                    <div key={member.uid} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                        {member.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">{member.fullName}</div>
                        <div className="text-xs text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Status
                </h4>
                {viewingGroup.status === 'ready' ? (
                  <Badge variant="emerald">Ready for Title Proposal</Badge>
                ) : viewingGroup.status === 'incomplete' ? (
                  <Badge variant="orange">Incomplete Group</Badge>
                ) : (
                  <Badge variant="blue" className="capitalize">{viewingGroup.status}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchGroups;
