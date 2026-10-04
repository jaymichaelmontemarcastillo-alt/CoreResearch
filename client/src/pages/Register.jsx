// src/pages/Register.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import {
  HiLockClosed,
  HiEnvelope,
  HiEye,
  HiEyeSlash,
  HiBriefcase,
  HiAcademicCap,
  HiUser,
  HiIdentification,
  HiCheckCircle,
  HiBuildingOffice2,
} from "react-icons/hi2";
import { courseService, BSIT_SPECIALIZATIONS, BSCS_SPECIALIZATIONS } from "../services/course.service";
import { sectionService } from "../services/section.service";

export const Register = ({ portal: initialPortal }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isFacultyPath = location.pathname.includes("/faculty");
  const portal = initialPortal || (isFacultyPath ? "faculty" : "student");
  const isStudent = portal === "student";

  // Common Auth Context
  const { registerStudent, registerFaculty } = useAuth();

  // Student Form State
  const [studentId, setStudentId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState("bsit");
  const [availableMajors, setAvailableMajors] = useState(BSIT_SPECIALIZATIONS);
  const [selectedMajorCode, setSelectedMajorCode] = useState("WMAD");
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedSectionName, setSelectedSectionName] = useState("A");

  // Faculty Form State
  const [facultyName, setFacultyName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [facultyEmail, setFacultyEmail] = useState("");
  const [department, setDepartment] = useState("Information Technology");

  // Password & Security State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback State
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);

  // Load programs from DB
  useEffect(() => {
    const loadAcademicData = async () => {
      try {
        const courses = await courseService.getAllCourses();
        if (courses && courses.length > 0) {
          setPrograms(courses);
          const defaultProg = courses.find((c) => c.code?.toUpperCase() === "BSIT" || c.id === "bsit") || courses[0];
          setSelectedProgramId(defaultProg.id);
        }
      } catch (err) {
        console.warn("[Register] Failed to load courses:", err);
      }
    };
    loadAcademicData();
  }, []);

  // Update Majors & Sections when Program changes
  useEffect(() => {
    if (!selectedProgramId) return;

    const prog = programs.find((p) => p.id === selectedProgramId || p.code?.toLowerCase() === selectedProgramId.toLowerCase());
    
    // Majors dependency
    if (prog?.specializations && prog.specializations.length > 0) {
      setAvailableMajors(prog.specializations);
      setSelectedMajorCode(prog.specializations[0].code || prog.specializations[0].id);
    } else if (selectedProgramId === "bsit" || prog?.code?.toUpperCase() === "BSIT") {
      setAvailableMajors(BSIT_SPECIALIZATIONS);
      setSelectedMajorCode("WMAD");
    } else if (selectedProgramId === "bscs" || prog?.code?.toUpperCase() === "BSCS") {
      setAvailableMajors(BSCS_SPECIALIZATIONS);
      setSelectedMajorCode("IS");
    } else {
      setAvailableMajors([]);
      setSelectedMajorCode("");
    }

    // Sections dependency: fetch Admin-controlled sections from DB
    const loadSections = async () => {
      try {
        const sectionsData = await sectionService.getSectionsByCourseId(selectedProgramId, true);
        if (sectionsData && sectionsData.length > 0) {
          setAvailableSections(sectionsData);
          setSelectedSectionName(sectionsData[0].name);
        } else {
          setAvailableSections([
            { id: "sec-a", name: "A" },
            { id: "sec-b", name: "B" },
            { id: "sec-c", name: "C" },
          ]);
          setSelectedSectionName("A");
        }
      } catch (err) {
        console.warn("[Register] Failed to load sections:", err);
        setAvailableSections([
          { id: "sec-a", name: "A" },
          { id: "sec-b", name: "B" },
          { id: "sec-c", name: "C" },
        ]);
        setSelectedSectionName("A");
      }
    };
    loadSections();
  }, [selectedProgramId, programs]);

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!studentId.trim()) {
      setError("Student ID Number is required.");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please provide your Complete Name (First Name and Last Name).");
      return;
    }

    if (!studentEmail.trim()) {
      setError("Gmail / Email is required.");
      return;
    }

    if (availableMajors.length > 0 && !selectedMajorCode) {
      setError("Please select your major.");
      return;
    }

    if (!selectedSectionName) {
      setError("Please select your section.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const selectedProg = programs.find((p) => p.id === selectedProgramId) || {
        id: "bsit",
        code: "BSIT",
        name: "Bachelor of Science in Information Technology",
      };

      const selectedMajorObj = availableMajors.find(
        (m) => (m.code || m.id) === selectedMajorCode
      );
      const majorDisplay = selectedMajorObj
        ? `${selectedMajorObj.name} (${selectedMajorObj.code})`
        : "";

      const selectedSecObj = availableSections.find((s) => s.name === selectedSectionName);

      await registerStudent({
        email: studentEmail.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        studentId: studentId.trim(),
        program: selectedProg.name,
        programCode: selectedProg.code || "BSIT",
        major: majorDisplay,
        majorCode: selectedMajorCode,
        section: selectedSectionName,
        sectionId: selectedSecObj?.id || "",
      });

      setRegistrationSubmitted(true);
    } catch (err) {
      if (err.message?.includes("Student ID Already Registered") || err.code === "auth/student-id-exists") {
        setError("Student ID Already Registered\nThis Student ID Number is already associated with an account.");
      } else if (err.message?.includes("Email Already Registered") || err.code === "auth/email-already-in-use") {
        setError("Email Already Registered\nAn account with this email address already exists.");
      } else {
        setError(err.message || "Failed to create student account.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFacultySubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!facultyName.trim()) {
      setError("Complete Name is required.");
      return;
    }

    if (!employeeId.trim()) {
      setError("Employee ID Number is required.");
      return;
    }

    if (!facultyEmail.trim()) {
      setError("Faculty Email is required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await registerFaculty({
        email: facultyEmail.trim().toLowerCase(),
        password,
        fullName: facultyName.trim(),
        employeeId: employeeId.trim(),
        department,
        role: "adviser",
      });

      navigate("/dashboard");
    } catch (err) {
      if (err.message?.includes("Employee ID Already Registered")) {
        setError("Employee ID Already Registered\nThis Employee ID is already associated with an account.");
      } else if (err.message?.includes("Email Already Registered") || err.code === "auth/email-already-in-use") {
        setError("Email Already Registered\nAn account with this email address already exists.");
      } else {
        setError(err.message || "Failed to register faculty account.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Success State for Student Registration (Pending Approval Notice) ──
  if (registrationSubmitted) {
    return (
      <AuthLayout
        title="REGISTRATION SUBMITTED"
        subtitle="Your student account has been created successfully"
      >
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <HiCheckCircle className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Account Pending Approval
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
              Your account has been successfully registered and is waiting for administrator approval.
              Please wait until an administrator approves your account before logging in.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-left text-xs text-gray-600 dark:text-gray-300 space-y-1.5 max-w-sm mx-auto">
            <div><span className="font-semibold text-gray-700 dark:text-gray-200">Student ID:</span> {studentId}</div>
            <div><span className="font-semibold text-gray-700 dark:text-gray-200">Name:</span> {firstName} {lastName}</div>
            <div><span className="font-semibold text-gray-700 dark:text-gray-200">Email:</span> {studentEmail}</div>
            <div><span className="font-semibold text-gray-700 dark:text-gray-200">Academic:</span> BSIT • {selectedMajorCode || "N/A"} • Section {selectedSectionName}</div>
            <div><span className="font-semibold text-amber-600 dark:text-amber-400">Status:</span> Pending Review</div>
          </div>

          <div className="pt-4">
            <Link
              to="/student/login?pending=1"
              className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-full transition shadow-md shadow-blue-500/20"
            >
              Go to Student Sign In
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={isStudent ? "CREATE STUDENT ACCOUNT" : "FACULTY REGISTRATION"}
      subtitle={
        isStudent
          ? "Register your student research account"
          : "Register your faculty advising account"
      }
    >
      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs sm:text-sm font-medium whitespace-pre-line leading-relaxed">
          {error}
        </div>
      )}

      {isStudent ? (
        // ── STUDENT REGISTRATION FORM ──
        <form onSubmit={handleStudentSubmit} className="space-y-4">
          {/* Student ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
              Student ID Number
            </label>
            <div className="relative">
              <HiIdentification className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
              <input
                type="text"
                placeholder="e.g. 0423-4197"
                className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm pl-10 pr-3.5 transition font-mono"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Name (First Name & Last Name) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
                First Name
              </label>
              <div className="relative">
                <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                <input
                  type="text"
                  placeholder="John Paul"
                  className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm pl-10 pr-3.5 transition"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
                Last Name
              </label>
              <input
                type="text"
                placeholder="Empalmado"
                className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm px-3.5 transition"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Gmail / Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
              Gmail / Email
            </label>
            <div className="relative">
              <HiEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
              <input
                type="email"
                placeholder="example@gmail.com"
                className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm pl-10 pr-3.5 transition"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Program Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
              Program
            </label>
            <div className="relative">
              <HiAcademicCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
              <select
                className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm pl-10 pr-3.5 transition appearance-none cursor-pointer"
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                required
              >
                {programs.length > 0 ? (
                  programs.map((prog) => (
                    <option key={prog.id} value={prog.id}>
                      {prog.name} ({prog.code || prog.id.toUpperCase()})
                    </option>
                  ))
                ) : (
                  <option value="bsit">Bachelor of Science in Information Technology (BSIT)</option>
                )}
              </select>
            </div>
          </div>

          {/* Major Dropdown (Dependent on Program) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
              Major {availableMajors.length > 0 && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <HiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
              {availableMajors.length > 0 ? (
                <select
                  className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm pl-10 pr-3.5 transition appearance-none cursor-pointer"
                  value={selectedMajorCode}
                  onChange={(e) => setSelectedMajorCode(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Major</option>
                  {availableMajors.map((major) => (
                    <option key={major.code || major.id} value={major.code || major.id}>
                      {major.name} ({major.code})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  value="Not Applicable"
                  className="w-full h-11 sm:h-12 bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-[#222433] text-gray-400 dark:text-gray-500 rounded-xl text-sm pl-10 pr-3.5 cursor-not-allowed"
                />
              )}
            </div>
          </div>

          {/* Section Dropdown (Admin Controlled, Simple identifiers A, B, C...) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
              Section
            </label>
            <div className="relative">
              <select
                className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm px-3.5 transition appearance-none cursor-pointer font-semibold"
                value={selectedSectionName}
                onChange={(e) => setSelectedSectionName(e.target.value)}
                required
              >
                <option value="" disabled>Select Section</option>
                {availableSections.map((sec) => (
                  <option key={sec.id || sec.name} value={sec.name}>
                    Section {sec.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
                Password
              </label>
              <div className="relative">
                <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm pl-10 pr-9 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
                Confirm Password
              </label>
              <div className="relative">
                <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm pl-10 pr-9 transition"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showConfirmPassword ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 sm:h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md shadow-blue-500/20 active:scale-[0.99] mt-3"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating Account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>
      ) : (
        // ── FACULTY REGISTRATION FORM ──
        <form onSubmit={handleFacultySubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
              Complete Name
            </label>
            <div className="relative">
              <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
              <input
                type="text"
                placeholder="Dr. Maria Santos"
                className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm pl-10 pr-3.5 transition"
                value={facultyName}
                onChange={(e) => setFacultyName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Employee ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
              Employee ID Number
            </label>
            <div className="relative">
              <HiIdentification className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
              <input
                type="text"
                placeholder="EMP-8821"
                className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm pl-10 pr-3.5 transition font-mono"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Faculty Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
              Faculty Email
            </label>
            <div className="relative">
              <HiEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
              <input
                type="email"
                placeholder="faculty@university.edu"
                className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm pl-10 pr-3.5 transition"
                value={facultyEmail}
                onChange={(e) => setFacultyEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
              Department
            </label>
            <div className="relative">
              <HiBuildingOffice2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
              <select
                className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm pl-10 pr-3.5 transition appearance-none cursor-pointer"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              >
                <option value="Information Technology">Department of Information Technology</option>
                <option value="Computer Science">Department of Computer Science</option>
                <option value="Information Systems">Department of Information Systems</option>
              </select>
            </div>
          </div>

          {/* Password & Confirm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
                Password
              </label>
              <div className="relative">
                <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm pl-10 pr-9 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
                Confirm Password
              </label>
              <div className="relative">
                <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-xl text-sm pl-10 pr-9 transition"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showConfirmPassword ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 sm:h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md shadow-blue-500/20 active:scale-[0.99] mt-3"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Registering Faculty...
              </span>
            ) : (
              "Register as Faculty"
            )}
          </button>
        </form>
      )}

      {/* Login link */}
      <div className="mt-5 text-center text-xs sm:text-sm text-gray-500 dark:text-[#9396a8]">
        Already have an account?{" "}
        <Link
          to={isStudent ? "/student/login" : "/faculty/login"}
          className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
        >
          Sign In
        </Link>
      </div>

      {/* Switch Portal */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#222433] text-center text-xs text-gray-400 dark:text-[#6b6f84]">
        {isStudent ? (
          <>
            Are you a Faculty member?{" "}
            <Link to="/faculty/register" className="text-gray-700 dark:text-gray-300 font-semibold hover:underline">
              Faculty Registration &rarr;
            </Link>
          </>
        ) : (
          <>
            Are you a Student?{" "}
            <Link to="/student/register" className="text-gray-700 dark:text-gray-300 font-semibold hover:underline">
              Student Registration &rarr;
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
};
