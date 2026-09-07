// src/pages/MyGroup.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import {
  HiUsers,
  HiExclamationCircle,
  HiCheckCircle,
  HiUserPlus,
  HiCalendarDays,
  HiAcademicCap,
  HiArrowRightOnRectangle,
  HiClock,
  HiMapPin,
  HiUser,
} from "react-icons/hi2";
import { groupService } from "../services/group.service";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import { studentService } from "../services/student.service";
import { scheduleService } from "../services/schedule.service";

export const MyGroup = () => {
  const { userProfile, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [course, setCourse] = useState(null);
  const [section, setSection] = useState(null);
  const [defenseSchedule, setDefenseSchedule] = useState(null);

  // Creation & Member Management State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [availableClassmates, setAvailableClassmates] = useState([]);
  const [loadingClassmates, setLoadingClassmates] = useState(false);
  const [selectedClassmateId, setSelectedClassmateId] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Toast / Error state
  const [toast, setToast] = useState({ message: "", variant: "success" });

  const showToast = (message, variant = "success") => {
    setToast({ message, variant });
  };

  useEffect(() => {
    if (role === "student" && userProfile?.uid) {
      loadInitialData();
    } else {
      setLoading(false);
    }
  }, [role, userProfile]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [allCourses, allSections] = await Promise.all([
        courseService.getAllCourses(),
        sectionService.getAllSections(),
      ]);

      if (userProfile?.courseId) {
        setCourse(allCourses.find((c) => c.id === userProfile.courseId) || null);
      }
      if (userProfile?.sectionId) {
        setSection(allSections.find((s) => s.id === userProfile.sectionId) || null);
      }

      // Fetch group for this student
      const myGroup = await groupService.getGroupByStudentId(userProfile.uid);
      if (myGroup) {
        setGroup(myGroup);
        if (myGroup.courseId && !course) {
          setCourse(allCourses.find((c) => c.id === myGroup.courseId) || null);
        }
        if (myGroup.sectionId && !section) {
          setSection(allSections.find((s) => s.id === myGroup.sectionId) || null);
        }

        // Fetch defense schedule if available
        try {
          const schedules = await scheduleService.getAllSchedules();
          const match = schedules.find(
            (s) =>
              (s.projectId === myGroup.id || s.groupId === myGroup.id) &&
              s.status !== "cancelled"
          );
          setDefenseSchedule(match || null);
        } catch (e) {
          console.warn("[MyGroup] Schedule fetch fallback:", e);
        }
      } else {
        setGroup(null);
        setDefenseSchedule(null);
      }
    } catch (error) {
      console.error("[MyGroup] Initial load error:", error);
      showToast("Unable to load group information. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e?.preventDefault();
    if (!userProfile?.sectionId || !userProfile?.courseId) {
      showToast("You must belong to an academic section to create a group.", "error");
      return;
    }

    setCreatingGroup(true);
    try {
      const studentNumber =
        userProfile.studentIdOrEmployeeId ||
        userProfile.studentId ||
        userProfile.studentNumber ||
        "";

      const created = await groupService.createGroup({
        name: newGroupName.trim() || undefined,
        courseId: userProfile.courseId,
        courseName: course?.name || course?.code || "",
        sectionId: userProfile.sectionId,
        sectionName: section?.name || "",
        yearLevel: userProfile.yearLevel || 4,
        memberIds: [userProfile.uid],
        members: [
          {
            uid: userProfile.uid,
            fullName: userProfile.fullName || "Student Researcher",
            email: userProfile.email || "",
            studentNumber: studentNumber,
            studentIdOrEmployeeId: studentNumber,
          },
        ],
      });

      setGroup(created);
      setIsCreateModalOpen(false);
      setNewGroupName("");
      showToast("Research group created successfully!");
    } catch (err) {
      console.error("[MyGroup] Create group error:", err);
      showToast(
        err.message || "Failed to create group. Please check your eligibility.",
        "error"
      );
    } finally {
      setCreatingGroup(false);
    }
  };

  const openAddClassmateModal = async () => {
    if (!userProfile?.sectionId) return;
    setIsAddModalOpen(true);
    setLoadingClassmates(true);
    setSelectedClassmateId("");

    try {
      // 1. Get all students in this section
      const allStudents = await studentService.getAllStudents();
      const sectionStudents = allStudents.filter(
        (s) => s.sectionId === userProfile.sectionId && s.uid !== userProfile.uid
      );

      // 2. Get all groups in this section to identify who is already in a group
      const sectionGroups = await groupService.getGroupsBySection(userProfile.sectionId);
      const assignedUids = new Set();
      sectionGroups.forEach((g) => {
        (g.memberIds || []).forEach((id) => assignedUids.add(id));
      });

      // 3. Filter only available classmates (Looking for a group)
      const available = sectionStudents.filter((s) => !assignedUids.has(s.uid));
      setAvailableClassmates(available);
    } catch (err) {
      console.error("[MyGroup] fetch classmates error:", err);
      showToast("Failed to load available classmates.", "error");
    } finally {
      setLoadingClassmates(false);
    }
  };

  const handleAddClassmate = async () => {
    if (!selectedClassmateId || !group) return;

    const candidate = availableClassmates.find((s) => s.uid === selectedClassmateId);
    if (!candidate) return;

    setAddingMember(true);
    try {
      const candidateStudentNum =
        candidate.studentIdOrEmployeeId ||
        candidate.studentId ||
        candidate.studentNumber ||
        "";

      const updated = await groupService.addMemberToGroup(group.id, {
        uid: candidate.uid,
        fullName: candidate.fullName || `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || "Student",
        email: candidate.email || "",
        studentNumber: candidateStudentNum,
      });

      setGroup(updated);
      setIsAddModalOpen(false);
      showToast(`${candidate.fullName} has been added to your group!`);
    } catch (err) {
      console.error("[MyGroup] Add member error:", err);
      showToast(err.message || "Failed to add member to group.", "error");
    } finally {
      setAddingMember(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!group || !window.confirm("Are you sure you want to leave this research group?")) {
      return;
    }

    try {
      if (group.memberIds.length <= 1) {
        // Last member leaving: delete group
        await groupService.deleteGroup(group.id);
        setGroup(null);
      } else {
        await groupService.removeMemberFromGroup(group.id, userProfile.uid);
        setGroup(null);
      }
      showToast("You have left the research group.");
    } catch (err) {
      console.error("[MyGroup] Leave error:", err);
      showToast("Failed to leave group. Please try again.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-gray-400 space-y-3">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-sm font-medium">Loading group information...</span>
      </div>
    );
  }

  // 1. EMPTY STATE: Student Has No Section Assigned Yet (Prompt Section 2.6)
  if (!userProfile?.sectionId) {
    return (
      <div className="space-y-6 font-inter">
        <PageHeader
          icon={HiUsers}
          title="My Research Group"
          description="View your assigned research group and team members."
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

  // 2. EMPTY STATE: Student has a section, but has NOT joined or created a group yet
  if (!group) {
    return (
      <div className="space-y-6 font-inter">
        {toast.message && (
          <Toast
            message={toast.message}
            variant={toast.variant}
            onClose={() => setToast({ message: "", variant: "success" })}
          />
        )}

        <PageHeader
          icon={HiUsers}
          title="My Research Group"
          description="Create your research team or join classmates from your section."
        />

        <Card className="p-10 text-center bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433] rounded-2xl shadow-sm">
          <div className="w-16 h-16 bg-gray-100 dark:bg-[#1c1d28] rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400 dark:text-[#6b6f84]">
            <HiUsers className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            You are not in a Research Group
          </h3>
          <p className="text-gray-500 dark:text-[#9396a8] max-w-md mx-auto text-sm leading-relaxed mb-6">
            You are registered in <strong className="text-gray-900 dark:text-white">{course?.name || "Your Program"}</strong> — <strong className="text-gray-900 dark:text-white">{section?.name || "Your Section"}</strong>. Create your research group now to start inviting eligible classmates and collaborate on your manuscript.
          </p>
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 shadow-md shadow-blue-600/20"
          >
            <HiUserPlus className="w-5 h-5" />
            Create Research Group
          </Button>
        </Card>

        {/* Modal: Create Research Group */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create Research Group"
          icon={HiUsers}
        >
          <form onSubmit={handleCreateGroup} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-[#9396a8] uppercase mb-1">
                Academic Grouping (Auto-Assigned)
              </label>
              <div className="p-3 bg-gray-50 dark:bg-[#1a1b26] rounded-xl border border-gray-200 dark:border-[#222433] text-sm text-gray-700 dark:text-gray-300 flex flex-wrap gap-2">
                <span><strong>Program:</strong> {course?.name || "N/A"}</span>
                <span>•</span>
                <span><strong>Year:</strong> {userProfile?.yearLevel || 4}th Year</span>
                <span>•</span>
                <span><strong>Section:</strong> {section?.name || "N/A"}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Group Name (Optional)
              </label>
              <Input
                placeholder="e.g. Group Alpha (leave blank to auto-generate)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                You will automatically become the initial member. You can invite your classmates right after creation.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#222433]">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={creatingGroup}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={creatingGroup}
                className="flex items-center gap-2"
              >
                {creatingGroup ? "Creating Group..." : "Confirm & Create"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // 3. ACTIVE GROUP VIEW
  return (
    <div className="space-y-6 font-inter">
      {toast.message && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast({ message: "", variant: "success" })}
        />
      )}

      <PageHeader
        icon={HiUsers}
        title="My Research Group"
        description="View your research group members, assigned adviser, and oral defense schedule."
      />

      {/* Main Group Card */}
      <Card className="overflow-hidden border border-gray-200/90 dark:border-[#222433] shadow-sm bg-white dark:bg-[#15161e] rounded-2xl">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-50/70 to-transparent dark:from-blue-950/20 p-6 md:p-8 border-b border-gray-100 dark:border-[#222433]">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {group.name}
                </h2>
                <Badge variant="blue" className="text-xs font-mono">
                  ID: {group.id.slice(0, 8)}
                </Badge>
              </div>
              <p className="text-gray-500 dark:text-[#9396a8] font-medium text-sm">
                {course?.name || "Program"} • {userProfile?.yearLevel || group.yearLevel || 4}th Year • {section?.name || "Section"}
              </p>
              {group.title && (
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                  Title: {group.title}
                </p>
              )}
            </div>

            <div className="flex flex-col items-start md:items-end gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#6b6f84]">
                Group Status
              </span>
              {group.status === "ready" ? (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3.5 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                  <HiCheckCircle className="w-4 h-4" />
                  <span className="font-semibold text-xs">Ready for Defense</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3.5 py-1.5 rounded-xl border border-amber-100 dark:border-amber-500/20">
                  <HiExclamationCircle className="w-4 h-4" />
                  <span className="font-semibold text-xs">Incomplete Group ({group.members.length}/3)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assigned Adviser Banner (if assigned) */}
        <div className="px-6 md:px-8 py-4 bg-gray-50/60 dark:bg-[#1a1b26]/60 border-b border-gray-100 dark:border-[#222433] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm">
            <HiAcademicCap className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-gray-500 dark:text-[#9396a8]">Assigned Research Adviser:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {group.adviserName || "Pending Assignment by Coordinator"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeaveGroup}
            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <HiArrowRightOnRectangle className="w-4 h-4 mr-1" />
            Leave Group
          </Button>
        </div>

        {/* Defense Schedule Banner (if scheduled) */}
        {defenseSchedule && (
          <div className="p-6 md:p-8 bg-blue-50/30 dark:bg-blue-950/10 border-b border-gray-100 dark:border-[#222433]">
            <div className="flex items-center gap-2 mb-3">
              <HiCalendarDays className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                Official Defense Schedule
              </h3>
              <Badge variant="emerald" className="capitalize text-[10px] ml-2">
                {defenseSchedule.status || "Scheduled"}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white dark:bg-[#111218] rounded-xl border border-gray-200/80 dark:border-[#222433]">
              <div>
                <span className="text-[11px] text-gray-400 uppercase font-semibold block">Defense Type</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                  {(defenseSchedule.defenseType || "Proposal").replace("_", " ")}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 uppercase font-semibold block">Date</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {defenseSchedule.date}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 uppercase font-semibold block">Time</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1">
                  <HiClock className="w-3.5 h-3.5 text-gray-400" />
                  {defenseSchedule.startTime} – {defenseSchedule.endTime}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 uppercase font-semibold block">Venue</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1">
                  <HiMapPin className="w-3.5 h-3.5 text-gray-400" />
                  {defenseSchedule.venue || defenseSchedule.location || "Room TBA"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Members Section */}
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 dark:text-[#6b6f84] flex items-center gap-2">
              <HiUsers className="w-4 h-4 text-blue-500" />
              Group Members ({group.members.length}/3)
            </h3>

            {group.members.length < 5 && (
              <Button
                variant="outline"
                size="sm"
                onClick={openAddClassmateModal}
                className="flex items-center gap-1.5 text-xs font-semibold"
              >
                <HiUserPlus className="w-4 h-4" />
                Add Classmate
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.members.map((member) => (
              <div
                key={member.uid}
                className={`flex items-start p-4 rounded-xl border transition-all ${
                  member.uid === userProfile.uid
                    ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40"
                    : "bg-gray-50/70 dark:bg-[#1c1d28] border-gray-100 dark:border-[#222433]"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base mr-3.5 shrink-0 ${
                    member.uid === userProfile.uid
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                      : "bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-700 dark:text-[#9396a8]"
                  }`}
                >
                  {member.fullName.charAt(0)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                      {member.fullName}
                    </h4>
                    {member.uid === userProfile.uid && (
                      <Badge variant="blue" className="text-[10px] px-1.5 py-0">
                        YOU
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-mono text-gray-500 dark:text-[#9396a8] mt-0.5">
                    ID: {member.studentNumber || member.studentIdOrEmployeeId || "Not Set"}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-[#6b6f84] truncate mt-0.5">
                    {member.email}
                  </p>
                </div>
              </div>
            ))}

            {/* Render empty slots if less than 3 members */}
            {group.members.length < 3 &&
              Array.from({ length: 3 - group.members.length }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  onClick={openAddClassmateModal}
                  className="flex items-center p-4 rounded-xl border border-dashed border-gray-200 dark:border-[#222433] bg-transparent hover:bg-gray-50/50 dark:hover:bg-[#1c1d28]/30 transition cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-full border-2 border-dashed border-gray-200 dark:border-[#333649] flex items-center justify-center mr-3.5 shrink-0 text-gray-400">
                    <HiUserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-400 dark:text-gray-500 text-sm">
                      Empty Slot ({group.members.length + idx + 1}/3)
                    </h4>
                    <p className="text-xs text-blue-500 hover:underline">Click to invite classmate</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </Card>

      {/* Modal: Add Classmate */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Classmate to Group"
        icon={HiUserPlus}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-[#9396a8]">
            Only eligible classmates in your section (<strong className="text-gray-900 dark:text-white">{section?.name}</strong>) who are not yet in a research group can be added.
          </p>

          {loadingClassmates ? (
            <div className="py-8 text-center text-gray-400">Loading available classmates...</div>
          ) : availableClassmates.length === 0 ? (
            <div className="p-6 text-center bg-gray-50 dark:bg-[#1a1b26] rounded-xl border border-gray-200 dark:border-[#222433]">
              <HiUser className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                No Available Classmates Found
              </p>
              <p className="text-xs text-gray-400 mt-1">
                All registered students in your section have already joined research groups.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {availableClassmates.map((student) => (
                <label
                  key={student.uid}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                    selectedClassmateId === student.uid
                      ? "bg-blue-50 dark:bg-blue-950/30 border-blue-500"
                      : "bg-white dark:bg-[#0e0f15] border-gray-200 dark:border-[#222433] hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="selectedClassmate"
                      value={student.uid}
                      checked={selectedClassmateId === student.uid}
                      onChange={() => setSelectedClassmateId(student.uid)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {student.fullName || `${student.first_name || ""} ${student.last_name || ""}`}
                      </div>
                      <div className="text-xs font-mono text-gray-400">
                        {student.studentIdOrEmployeeId || "No Student Number"} • {student.email}
                      </div>
                    </div>
                  </div>
                  <Badge variant="blue" className="text-[10px]">
                    Available
                  </Badge>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#222433]">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={addingMember}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddClassmate}
              disabled={!selectedClassmateId || addingMember}
            >
              {addingMember ? "Adding..." : "Add to Group"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyGroup;
