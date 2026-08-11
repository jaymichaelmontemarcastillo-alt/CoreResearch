import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Badge } from "../components/ui/Badge";
import { Link, Copy, Plus, Users } from "lucide-react";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import { enrollmentService } from "../services/enrollment.service";
import { useAuth } from "../context/AuthContext";

export const EnrollmentManagement = () => {
  const { currentUser } = useAuth();
  
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [invitations, setInvitations] = useState([]);
  
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
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
    if (selectedSection) {
      fetchInvitations(selectedSection);
    } else {
      setInvitations([]);
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

  const fetchInvitations = async (sectionId) => {
    setLoading(true);
    try {
      const invites = await enrollmentService.getInvitationsBySection(sectionId);
      setInvitations(invites);
    } catch (error) {
      console.error("Failed to load invitations", error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, variant = "success") => {
    setToastMessage(msg);
    setToastVariant(variant);
  };

  const handleGenerateLink = async () => {
    if (!selectedCourse || !selectedSection) {
      showToast("Please select a course and section first.", "error");
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        courseId: selectedCourse,
        sectionId: selectedSection,
        createdBy: currentUser.uid,
        active: true,
      };

      if (selectedSpecialization) {
        payload.specializationId = selectedSpecialization;
      }

      await enrollmentService.createInvitation(payload);

      showToast("Join link generated successfully!");
      fetchInvitations(selectedSection);
    } catch (error) {
      console.error("Error generating link:", error);
      showToast(error.message || "Failed to generate link.", "error");
    } finally {
      setGenerating(false);
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
      fetchInvitations(selectedSection);
    } catch (error) {
      showToast("Failed to deactivate invitation.", "error");
    }
  };

  const courseObj = courses.find((c) => c.id === selectedCourse);
  const specializations = courseObj?.specializations || [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Link}
        title="Course & Section Enrollment"
        description="Generate join links for students to self-enroll in their sections."
      />

      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage("")} />
      )}

      <Card className="p-4 flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Select Course</label>
          <select
            className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm px-3"
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setSelectedSpecialization("");
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

        <div className="w-full md:w-1/3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Select Specialization (Optional)</label>
          <select
            className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm px-3 disabled:opacity-50"
            value={selectedSpecialization}
            onChange={(e) => setSelectedSpecialization(e.target.value)}
            disabled={!selectedCourse || specializations.length === 0}
          >
            <option value="">None / Not Applicable</option>
            {specializations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-1/3">
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

      {selectedCourse && selectedSection && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Active Join Links
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateLink}
              isLoading={generating}
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate New Link
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading invitations...</div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm italic">
              No join links generated for this section yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invitations.map((invite) => (
                <Card key={invite.id} className="p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant={invite.active ? "emerald" : "gray"}>
                        {invite.active ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm font-mono bg-gray-100 dark:bg-slate-800 p-2 rounded text-gray-700 dark:text-gray-300 break-all mb-4">
                      {window.location.origin}/join/{invite.id}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleCopyLink(invite.id)}
                    >
                      <Copy className="w-4 h-4 mr-2" /> Copy
                    </Button>
                    {invite.active && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeactivate(invite.id)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnrollmentManagement;
