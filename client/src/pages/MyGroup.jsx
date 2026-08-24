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
        <Card className="p-8 text-center bg-gray-50/50 dark:bg-slate-900/50 border-dashed border-2 border-gray-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <HiUsers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Research Group Assigned</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            You have not been assigned to a research group yet. Please contact your Research Coordinator.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        icon={HiUsers}
        title="My Research Group"
        description="View your assigned research group and members."
      />

      <Card className="overflow-hidden border border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 p-6 md:p-8 border-b border-gray-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {group.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {course?.name || "Unknown Course"} • {section?.name || "Unknown Section"}
              </p>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Current Status</span>
              {group.status === 'ready' ? (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                  <HiCheckCircle className="w-4 h-4" />
                  <span className="font-semibold text-sm">Ready for Title Proposal</span>
                </div>
              ) : group.status === 'incomplete' ? (
                <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-orange-800/50">
                  <HiExclamationCircle className="w-4 h-4" />
                  <span className="font-semibold text-sm">Incomplete Group</span>
                </div>
              ) : (
                <Badge variant="blue" className="capitalize text-sm px-3 py-1.5">{group.status}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Members Section */}
        <div className="p-6 md:p-8">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <HiUsers className="w-5 h-5 text-blue-500" /> 
            Group Members ({group.members.length}/3)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.members.map((member) => (
              <div 
                key={member.uid} 
                className={`flex items-center p-4 rounded-xl border ${
                  member.uid === userProfile.uid 
                  ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" 
                  : "bg-gray-50/50 dark:bg-slate-800/30 border-gray-100 dark:border-slate-700"
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mr-4 shrink-0 ${
                  member.uid === userProfile.uid
                  ? "bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300"
                  : "bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 shadow-sm"
                }`}>
                  {member.fullName.charAt(0)}
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">
                      {member.fullName}
                    </h4>
                    {member.uid === userProfile.uid && (
                      <Badge variant="blue" className="text-[10px] px-1.5 py-0">YOU</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {member.email}
                  </p>
                </div>
              </div>
            ))}

            {/* Render empty slots if less than 3 members */}
            {group.members.length < 3 && Array.from({ length: 3 - group.members.length }).map((_, idx) => (
              <div 
                key={`empty-${idx}`} 
                className="flex items-center p-4 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-transparent opacity-50"
              >
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-200 dark:border-slate-600 flex items-center justify-center mr-4 shrink-0">
                  <HiUsers className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-400 dark:text-gray-500">Empty Slot</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-600">Awaiting assignment</p>
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
