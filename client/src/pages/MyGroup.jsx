import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { PageHeader } from "../components/ui/PageHeader";
import { HiUsers, HiExclamationCircle, HiCheckCircle } from "react-icons/hi2";
import { groupService } from "../services/group.service";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";

export const MyGroup = () => {
  const { userProfile, role } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [course, setCourse] = useState(null);
  const [section, setSection] = useState(null);

  useEffect(() => {
    // Make sure we only fetch if the user is a student
    if (role === "student" && userProfile?.uid) {
      fetchMyGroup();
    } else {
      setLoading(false);
    }
  }, [role, userProfile]);

  const fetchMyGroup = async () => {
    setLoading(true);
    try {
      const myGroup = await groupService.getGroupByStudentId(userProfile.uid);
      if (myGroup) {
        setGroup(myGroup);
        // Fetch course and section details
        const [allCourses, allSections] = await Promise.all([
          courseService.getAllCourses(),
          sectionService.getSectionsByCourseId(myGroup.courseId)
        ]);
        
        setCourse(allCourses.find(c => c.id === myGroup.courseId));
        setSection(allSections.find(s => s.id === myGroup.sectionId));
      }
    } catch (error) {
      console.error("Error fetching group:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        Loading group information...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={HiUsers}
          title="My Research Group"
          description="View your assigned research group and members."
        />
        <Card className="p-8 text-center bg-gray-50/50 dark:bg-[#15161e] border-dashed border-2 border-gray-200 dark:border-[#222433]">
          <div className="w-16 h-16 bg-gray-100 dark:bg-[#1c1d28] rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 dark:text-[#6b6f84]">
            <HiUsers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Research Group Assigned</h3>
          <p className="text-gray-500 dark:text-[#9396a8] max-w-sm mx-auto text-sm">
            You have not been assigned to a research group yet. Please contact your Research Coordinator.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={HiUsers}
        title="My Research Group"
        description="View your assigned research group and members."
      />

      <Card className="overflow-hidden border border-gray-200/90 dark:border-[#222433] shadow-sm bg-white dark:bg-[#15161e]">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20 p-6 md:p-8 border-b border-gray-100 dark:border-[#222433]">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                {group.name}
              </h2>
              <p className="text-gray-500 dark:text-[#9396a8] font-medium text-sm">
                {course?.name || "Unknown Course"} • {section?.name || "Unknown Section"}
              </p>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#6b6f84]">Current Status</span>
              {group.status === 'ready' ? (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                  <HiCheckCircle className="w-4 h-4" />
                  <span className="font-semibold text-xs">Ready for Title Proposal</span>
                </div>
              ) : group.status === 'incomplete' ? (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-500/20">
                  <HiExclamationCircle className="w-4 h-4" />
                  <span className="font-semibold text-xs">Incomplete Group</span>
                </div>
              ) : (
                <Badge variant="blue" className="capitalize text-xs px-3 py-1.5">{group.status}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Members Section */}
        <div className="p-6 md:p-8">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-[#6b6f84] mb-4 flex items-center gap-2">
            <HiUsers className="w-4 h-4 text-blue-500" /> 
            Group Members ({group.members.length}/3)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.members.map((member) => (
              <div 
                key={member.uid} 
                className={`flex items-center p-4 rounded-xl border transition-all ${
                  member.uid === userProfile.uid 
                  ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40" 
                  : "bg-gray-50/70 dark:bg-[#1c1d28] border-gray-100 dark:border-[#222433]"
                }`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base mr-3.5 shrink-0 ${
                  member.uid === userProfile.uid
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-700 dark:text-[#9396a8]"
                }`}>
                  {member.fullName.charAt(0)}
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                      {member.fullName}
                    </h4>
                    {member.uid === userProfile.uid && (
                      <Badge variant="blue" className="text-[10px] px-1.5 py-0">YOU</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#9396a8] truncate mt-0.5">
                    {member.email}
                  </p>
                </div>
              </div>
            ))}

            {/* Render empty slots if less than 3 members */}
            {group.members.length < 3 && Array.from({ length: 3 - group.members.length }).map((_, idx) => (
              <div 
                key={`empty-${idx}`} 
                className="flex items-center p-4 rounded-xl border border-dashed border-gray-200 dark:border-[#222433] bg-transparent opacity-50"
              >
                <div className="w-11 h-11 rounded-full border-2 border-dashed border-gray-200 dark:border-[#333649] flex items-center justify-center mr-3.5 shrink-0">
                  <HiUsers className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-400 dark:text-gray-500 text-sm">Empty Slot</h4>
                  <p className="text-xs text-gray-400 dark:text-[#6b6f84]">Awaiting assignment</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MyGroup;
