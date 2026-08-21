import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { enrollmentService } from "../services/enrollment.service";
import { courseService } from "../services/course.service";
import { sectionService } from "../services/section.service";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { HiAcademicCap, HiExclamationCircle, HiCheckCircle } from "react-icons/hi2";
import logoImg from "../assets/logo.png";

export const JoinSection = () => {
  const { inviteId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile, updateProfileLocal } = useAuth();

  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState(null);
  
  const [invite, setInvite] = useState(null);
  const [course, setCourse] = useState(null);
  const [section, setSection] = useState(null);
  const [specializationName, setSpecializationName] = useState("");

  useEffect(() => {
    fetchInviteDetails();
  }, [inviteId]);

  const fetchInviteDetails = async () => {
    try {
      setLoading(true);
      const inv = await enrollmentService.getInvitationById(inviteId);
      
      if (!inv || !inv.active) {
        setError("This invite link is invalid or has expired.");
        setLoading(false);
        return;
      }
      
      setInvite(inv);

      // Fetch course and section details for display
      const c = await courseService.getCourseById(inv.courseId);
      setCourse(c);
      
      if (inv.specializationId && c && c.specializations) {
        const spec = c.specializations.find(s => s.id === inv.specializationId);
        if (spec) setSpecializationName(spec.name);
      }

      // We don't have a getSectionById in sectionService by default, 
      // but we can fetch all sections for the course and find it
      const sections = await sectionService.getSectionsByCourseId(inv.courseId);
      const s = sections.find(sec => sec.id === inv.sectionId);
      setSection(s);

    } catch (err) {
      console.error("Error fetching invite:", err);
      setError("An error occurred while loading the invitation.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!currentUser) return;
    
    setEnrolling(true);
    try {
      await enrollmentService.enrollStudent(currentUser.uid, invite);
      
      // Update local context so Dashboard immediately knows
      updateProfileLocal({
        courseId: invite.courseId,
        specializationId: invite.specializationId,
        sectionId: invite.sectionId
      });
      
      navigate("/dashboard", { 
        state: { 
          successMessage: `Successfully enrolled in ${course.code} - ${section.name}!` 
        } 
      });
    } catch (err) {
      console.error("Failed to enroll:", err);
      setError(err.message || "Failed to join section.");
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin h-8 w-8 text-blue-600 rounded-full border-4 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <HiExclamationCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invitation Not Found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <Button variant="primary" className="w-full mt-4" onClick={() => navigate("/")}>
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  const isAlreadyEnrolled = userProfile?.sectionId === invite.sectionId;
  const isNotStudent = currentUser && userProfile && userProfile.role !== 'student';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 font-sans text-gray-900 dark:text-gray-100">
      
      <div className="w-full max-w-md">
        {/* Branding header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img
            src={logoImg}
            alt="CoreResearch Logo"
            className="w-10 h-10 object-contain"
          />
          <span className="text-2xl tracking-tight">
            <span className="font-normal text-gray-900 dark:text-white">Core</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">Research</span>
          </span>
        </div>

        <Card className="p-8 shadow-xl border border-gray-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden relative">
          
          {/* Decorative Background Blob */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-6 relative z-10">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <HiAcademicCap className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
              Join Section
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You have been invited to join the following academic section.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5 mb-8 space-y-4 border border-gray-100 dark:border-slate-700/50 relative z-10">
            <div>
              <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Course</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {course ? `${course.code} - ${course.name}` : "Loading..."}
              </div>
            </div>

            {specializationName && (
              <div>
                <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Specialization</div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{specializationName}</div>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Section</div>
              <div className="font-medium text-gray-900 dark:text-gray-100 text-lg">
                {section ? section.name : "Loading..."}
              </div>
            </div>
          </div>

          <div className="relative z-10">
            {!currentUser ? (
              <div className="space-y-3">
                <Button 
                  variant="primary" 
                  className="w-full h-12 text-base font-medium rounded-xl shadow-md shadow-blue-500/20"
                  onClick={() => navigate(`/register?returnTo=${encodeURIComponent(`/join/${inviteId}`)}`)}
                >
                  Create Account to Join
                </Button>
                <div className="text-center text-sm text-gray-500">
                  Already have an account? <Link to={`/login?returnTo=${encodeURIComponent(`/join/${inviteId}`)}`} className="text-blue-600 hover:underline">Sign In</Link>
                </div>
              </div>
            ) : isNotStudent ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 justify-center text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-500/10 p-3 rounded-lg">
                  <HiExclamationCircle className="w-5 h-5" />
                  Only student accounts can join sections.
                </div>
                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-xl"
                  onClick={() => navigate("/dashboard")}
                >
                  Go to Dashboard
                </Button>
              </div>
            ) : isAlreadyEnrolled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 justify-center text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-lg">
                  <HiCheckCircle className="w-5 h-5" />
                  You are already enrolled here.
                </div>
                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-xl"
                  onClick={() => navigate("/dashboard")}
                >
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <Button 
                variant="primary" 
                className="w-full h-12 text-base font-medium rounded-xl shadow-md shadow-blue-500/20"
                onClick={handleJoin}
                isLoading={enrolling}
              >
                Confirm & Join Section
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default JoinSection;
