// src/pages/MyGroup.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
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
  HiPlus,
} from "react-icons/hi2";
import { groupService } from "../services/group.service";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import { studentService } from "../services/student.service";
import { scheduleService } from "../services/schedule.service";

export const MyGroup = () => {
  const { userProfile, role } = useAuth();
  const { confirm } = useConfirm();

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
        // Ensure student profile and assets are synced to this group project
        groupService.syncMemberToGroupProject(myGroup.id, userProfile.uid, userProfile).catch(() => {});

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
        courseId: userProfile.courseId || "bsit",
        courseName: course?.name || course?.code || userProfile?.program || "BSIT",
        sectionId: userProfile.sectionId || "section-a",
        sectionName: section?.name || userProfile?.sectionName || "A",
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

  const handleAddClassmate = async (uid) => {
    if (!uid || !group) return;

    const candidate = availableClassmates.find((s) => s.uid === uid);
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
      const titleNotice = updated.title ? ` and automatically assigned to "${updated.title}"` : "";
      showToast(`${candidate.fullName} has been added to your group${titleNotice}!`);
    } catch (err) {
      console.error("[MyGroup] Add member error:", err);
      showToast(err.message || "Failed to add member to group.", "error");
    } finally {
      setAddingMember(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!group) return;
    
    const isConfirmed = await confirm({
      title: "Leave Group",
      message: "Are you sure you want to leave this research group?",
      confirmText: "Leave Group",
      variant: "danger"
    });
    
    if (!isConfirmed) return;

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
                <span><strong>Program:</strong> {course?.code || userProfile?.programCode || "BSIT"}</span>
                <span>•</span>
                <span><strong>Major:</strong> {userProfile?.majorCode || (userProfile?.programSpecialization?.includes("WMAD") ? "WMAD" : userProfile?.programSpecialization?.includes("AMG") ? "AMG" : userProfile?.programSpecialization?.includes("SMP") ? "SMP" : userProfile?.programSpecialization) || "N/A"}</span>
                <span>•</span>
                <span><strong>Section:</strong> {section?.name || userProfile?.sectionName || "A"}</span>
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
    <div className="space-y-4 w-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {toast.message && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast({ message: "", variant: "success" })}
        />
      )}

      {/* Main Group Card */}
      <Card className="p-5 md:p-6 bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200/50 dark:border-[#222433] shadow-sm">
        {/* Top: Group Info */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
          <div className="space-y-2">
            <span className="text-[10px] md:text-[11px] font-medium tracking-widest text-gray-400 uppercase">
              Group
            </span>
            <h2 className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-100">
              {group.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-[#9396a8] font-medium">
              {course?.code || userProfile?.programCode || "BSIT"} · {(userProfile?.majorCode || (userProfile?.programSpecialization?.includes("WMAD") ? "WMAD" : userProfile?.programSpecialization?.includes("AMG") ? "AMG" : userProfile?.programSpecialization?.includes("SMP") ? "SMP" : userProfile?.programSpecialization) || "Major")} · Section {section?.name || userProfile?.sectionName || group.sectionName || "A"}
            </p>
            {group.title && (
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-2">
                {group.title}
              </p>
            )}
          </div>
          <div className="flex flex-col md:items-end gap-1.5 text-right">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${group.status === "ready" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {group.status === "ready" ? "Ready" : "Incomplete"}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {group.members.length} of 3 members
            </span>
          </div>
        </div>

        <div className="w-full h-px bg-gray-100 dark:bg-[#222433] my-5"></div>

        {/* Middle: Adviser Info */}
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-[10px] md:text-[11px] font-medium tracking-widest text-gray-400 uppercase">
                Adviser
              </span>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                  {group.adviserName ? group.adviserName.charAt(0) : "?"}
                </div>
                <span className="text-base font-medium text-gray-800 dark:text-gray-100">
                  {group.adviserName || "Pending Assignment"}
                </span>
              </div>
            </div>
            <div>
              <Badge variant={group.adviserName ? "blue" : "gray"} className="text-xs font-medium px-3 py-1">
                {group.adviserName ? "Assigned" : "Pending"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-gray-100 dark:bg-[#222433] my-5"></div>

        {/* Bottom: Members */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] md:text-[11px] font-medium tracking-widest text-gray-400 uppercase block mb-1">
                Members
              </span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {group.members.length} of 3
              </span>
            </div>
            {group.members.length < 5 && (
              <button
                onClick={openAddClassmateModal}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition"
              >
                <HiPlus className="w-4 h-4" />
                Add Classmate
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {group.members.map((member) => (
              <div
                key={member.uid}
                className="flex flex-col p-4 rounded-2xl border border-gray-200/60 dark:border-[#222433] bg-transparent"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-3 ${
                    member.uid === userProfile.uid
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-gray-100 text-gray-600 dark:bg-[#1c1d28] dark:text-gray-400"
                  }`}
                >
                  {member.fullName.charAt(0)}
                </div>
                
                <h4 className="text-[15px] font-medium text-gray-800 dark:text-gray-100 mb-0.5">
                  {member.fullName}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-3">
                  Group Member
                </p>
                
                {member.uid === userProfile.uid && (
                  <div className="mt-auto">
                    <span className="inline-block text-[10px] font-medium tracking-wider text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                      You
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* Empty Slots */}
            {group.members.length < 3 &&
              Array.from({ length: 3 - group.members.length }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  onClick={openAddClassmateModal}
                  className="flex flex-col p-4 rounded-2xl border border-dashed border-gray-300 dark:border-[#333649] bg-transparent hover:bg-gray-50 dark:hover:bg-[#1a1b26] transition cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 border border-dashed border-gray-300 dark:border-[#42455e] mb-3">
                    <HiPlus className="w-4 h-4" />
                  </div>
                  
                  <h4 className="text-[15px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                    Invite
                  </h4>
                  <p className="text-sm text-gray-400 font-medium">
                    Classmate
                  </p>
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
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {availableClassmates.map((student) => (
                <div
                  key={student.uid}
                  className="flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-[#0e0f15] border-gray-200 dark:border-[#222433] transition hover:border-gray-300"
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {student.fullName || `${student.first_name || ""} ${student.last_name || ""}`}
                    </div>
                    <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5 truncate font-medium">
                      {student.studentIdOrEmployeeId || "No Student Number"} • {student.email}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddClassmate(student.uid)}
                    disabled={addingMember}
                    className="bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 border-green-600 dark:border-green-500/70 hover:text-green-800 dark:hover:text-green-300 shrink-0 shadow-sm font-semibold"
                  >
                    Invite
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#222433]">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={addingMember}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyGroup;
