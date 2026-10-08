// src/pages/Onboarding.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import {
  HiUser,
  HiIdentification,
  HiArrowRight,
  HiLockClosed,
  HiEye,
  HiEyeSlash,
  HiBriefcase,
  HiAcademicCap,
  HiSquares2X2,
} from "react-icons/hi2";
import { updatePassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { notificationService } from "../services/notification.service";
import { userService } from "../services/user.service";
import { sectionService } from "../services/section.service";
import api from "../services/api";

const ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "adviser", label: "Faculty Member" },
];

const PROGRAM_OPTIONS = [
  {
    value: "Bachelor of Science in Information Technology",
    label: "Bachelor of Science in Information Technology",
    code: "BSIT",
    department: "Information Technology",
  },
  {
    value: "Bachelor of Science in Computer Science",
    label: "Bachelor of Science in Computer Science",
    code: "BSCS",
    department: "Computer Science",
  },
];

const BSIT_MAJOR_OPTIONS = [
  { value: "Web and Mobile Application Development (WMAD)", label: "Web and Mobile Application Development (WMAD)", code: "WMAD" },
  { value: "Animation and Motion Graphics (AMG)", label: "Animation and Motion Graphics (AMG)", code: "AMG" },
  { value: "Service Management Program (SMP)", label: "Service Management Program (SMP)", code: "SMP" },
];

export const Onboarding = () => {
  const { currentUser, userProfile, updateProfileLocal } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(userProfile?.firstName || "");
  const [lastName, setLastName] = useState(userProfile?.lastName || "");
  const [role, setRole] = useState(userProfile?.role || "student");
  const [program, setProgram] = useState(
    userProfile?.program || "Bachelor of Science in Information Technology"
  );
  const [programSpecialization, setProgramSpecialization] = useState(
    userProfile?.programSpecialization || "Web and Mobile Application Development (WMAD)"
  );
  const [section, setSection] = useState(userProfile?.sectionName || "A");
  const [availableSections, setAvailableSections] = useState(["A", "B", "C"]);
  const [studentIdOrEmployeeId, setStudentIdOrEmployeeId] = useState(
    userProfile?.studentIdOrEmployeeId || ""
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch sections from database
  useEffect(() => {
    const loadSections = async () => {
      try {
        const secs = await sectionService.getSectionsByCourseId("bsit", true);
        if (secs && secs.length > 0) {
          setAvailableSections(secs.map((s) => s.name));
          setSection(secs[0].name);
        }
      } catch (err) {
        console.warn("[Onboarding] Error loading sections:", err);
      }
    };
    loadSections();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      return setError("Please provide both your First Name and Last Name.");
    }

    if (!studentIdOrEmployeeId.trim()) {
      return setError(
        role === "student"
          ? "Please enter your Student ID Number."
          : "Please enter your Employee ID Number."
      );
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }
    
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const selectedProgObj = PROGRAM_OPTIONS.find((p) => p.value === program);
    const department = selectedProgObj ? selectedProgObj.department : "Information Technology";
    const programCode = selectedProgObj ? selectedProgObj.code : "BSIT";

    try {
      if (currentUser) {
        // Uniqueness check for Student ID
        if (role === "student") {
          const idExists = await userService.checkStudentIdExists(studentIdOrEmployeeId.trim());
          if (idExists && userProfile?.studentIdOrEmployeeId !== studentIdOrEmployeeId.trim()) {
            throw new Error("Student ID Already Registered: This Student ID Number is already associated with an account.");
          }
        }

        await updatePassword(currentUser, password);
        
        const first_name = firstName.trim();
        const last_name = lastName.trim();

        const userRef = doc(db, "users", currentUser.uid);
        const isStudentRole = role === "student";

          const courseId = isStudentRole ? (programCode === "BSCS" ? "bscs" : "bsit") : "";
          const specId = isStudentRole
            ? (programSpecialization?.includes("WMAD") ? "wmad" : programSpecialization?.includes("AMG") ? "amg" : programSpecialization?.includes("SMP") ? "smp" : programSpecialization?.includes("IS") ? "is" : "")
            : "";
          const secName = isStudentRole ? (section || "A") : "";
          const secId = isStudentRole ? `${courseId}-sec-${secName.toLowerCase()}` : "";

          const profileData = {
            uid: currentUser.uid,
            email: currentUser.email,
            first_name,
            last_name,
            fullName,
            role: role || "student",
            role_id: role || "student",
            department,
            department_id: department === "Computer Science" ? "cs" : "it",
            courseId,
            program_id: courseId,
            program,
            programCode,
            specializationId: specId,
            programSpecialization: program === "Bachelor of Science in Information Technology" ? programSpecialization : "",
            major: programSpecialization || "",
            majorCode: programSpecialization?.includes("WMAD") ? "WMAD" : programSpecialization?.includes("AMG") ? "AMG" : programSpecialization?.includes("SMP") ? "SMP" : "",
            section: secName,
            sectionName: secName,
            sectionId: secId,
            enrollmentStatus: isStudentRole ? "enrolled" : undefined,
            studentIdOrEmployeeId: studentIdOrEmployeeId.trim(),
            studentId: studentIdOrEmployeeId.trim(),
            status: "pending",
            is_approved: false,
            profile_image: currentUser.photoURL || "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            needsOnboarding: false,
          };

          await setDoc(userRef, profileData, { merge: true });
          try {
            await api.post('/auth/register', profileData);
          } catch (syncErr) {
            console.warn('[Onboarding] Backend sync warning:', syncErr?.message);
          }

        // Trigger admin notification and sign out pending approval
        if (isStudentRole) {
          await notificationService.notifyAdminsNewStudentRegistration(profileData);
        } else {
          // You could add a faculty specific notification here if desired
          // await notificationService.notifyAdminsNewFacultyRegistration(profileData);
        }
        await signOut(auth);
        navigate("/pending-approval", {
          replace: true,
          state: {
            studentId: studentIdOrEmployeeId.trim(),
            fullName,
            email: currentUser.email,
            program,
            section: isStudentRole ? section : "",
            role: role || "student",
            submittedAt: new Date().toISOString(),
          },
        });
        return;

        if (updateProfileLocal) {
          updateProfileLocal(profileData);
        }
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Complete your profile"
      subtitle={
        <>
          Signed in as <strong className="text-primary">{currentUser?.email}</strong>. Provide your university credentials to finish registration.
        </>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Name & Last Name */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
            <div className="relative">
              <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="e.g. John"
                className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3.5 transition"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
            <div className="relative">
              <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="e.g. Empalmado"
                className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3.5 transition"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Role & Program */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
            <div className="relative">
              <HiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <select
                className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3 transition appearance-none cursor-pointer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Program</label>
            <div className="relative">
              <HiAcademicCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <select
                className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3 transition appearance-none cursor-pointer"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                required
              >
                {PROGRAM_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Conditionally render Major and Section for Students */}
        {role === "student" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Major</label>
              <div className="relative">
                <HiAcademicCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <select
                  className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3 transition appearance-none cursor-pointer"
                  value={programSpecialization}
                  onChange={(e) => setProgramSpecialization(e.target.value)}
                  required
                >
                  {BSIT_MAJOR_OPTIONS.map((spec) => (
                    <option key={spec.value} value={spec.value}>{spec.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section</label>
              <div className="relative">
                <HiSquares2X2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <select
                  className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3 transition appearance-none cursor-pointer font-semibold"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  required
                >
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Student / Employee ID Number */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {role === "student" ? "Student ID Number" : "Employee ID Number"}
          </label>
          <div className="relative">
            <HiIdentification className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder={role === "student" ? "e.g. 0423-4197" : "e.g. EMP-10482"}
              className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3.5 transition font-mono"
              value={studentIdOrEmployeeId}
              onChange={(e) => setStudentIdOrEmployeeId(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Set a Permanent Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
            <div className="relative">
              <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-10 transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                {showPassword ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
            <div className="relative">
              <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-10 transition"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                {showConfirmPassword ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm mt-5"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving Profile...
            </span>
          ) : (
            <>
              <span>Complete Setup</span>
              <HiArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
};
