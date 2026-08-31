// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
} from "react-icons/hi2";

const ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "adviser", label: "Faculty Member" },
];

const PROGRAM_OPTIONS = [
  {
    value: "Bachelor of Science in Information Technology",
    label: "Bachelor of Science in Information Technology",
    department: "Information Technology",
  },
  {
    value: "Bachelor of Science in Computer Science",
    label: "Bachelor of Science in Computer Science",
    department: "Computer Science",
  },
];

const SPECIALIZATION_OPTIONS = [
  { value: "Web and Mobile Development (WMAD)", label: "Web and Mobile Development (WMAD)" },
  { value: "Animation and Motion Graphics (AMG)", label: "Animation and Motion Graphics (AMG)" },
  { value: "Service Management Program (SMP)", label: "Service Management Program (SMP)" },
];

export const Register = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [program, setProgram] = useState("Bachelor of Science in Information Technology");
  const [programSpecialization, setProgramSpecialization] = useState("Web and Mobile Development (WMAD)");
  const [studentIdOrEmployeeId, setStudentIdOrEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, registerWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Extract returnTo from URL if present
  const queryParams = new URLSearchParams(window.location.search);
  const returnTo = queryParams.get("returnTo") || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please provide both your First Name and Last Name.");
      return;
    }

    if (!studentIdOrEmployeeId.trim()) {
      setError(role === "student" ? "Please enter your Student ID Number." : "Please enter your Employee ID Number.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const selectedProgObj = PROGRAM_OPTIONS.find((p) => p.value === program);
    const department = selectedProgObj ? selectedProgObj.department : "Information Technology";

    try {
      await register(
        email,
        password,
        fullName,
        role || "student",
        department,
        studentIdOrEmployeeId.trim(),
        program,
        program === "Bachelor of Science in Information Technology" ? programSpecialization : ""
      );
      
      setSuccess("Successfully signed up! Redirecting to your workspace...");
      setTimeout(() => {
        navigate(returnTo);
      }, 2000);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please log in instead.");
      } else {
        setError(err.message || "Failed to create account.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join CoreResearch and manage your research journey"
    >
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 text-sm">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-[#9396a8]">First Name</label>
              <div className="relative">
                <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  className="w-full h-11 bg-white dark:bg-[#0e0f15] border border-gray-300 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:dark:border-blue-500 rounded-lg text-sm pl-10 pr-3.5 transition"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-[#9396a8]">Last Name</label>
              <div className="relative">
                <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                <input
                  type="text"
                  placeholder="e.g. Rivera"
                  className="w-full h-11 bg-white dark:bg-[#0e0f15] border border-gray-300 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:dark:border-blue-500 rounded-lg text-sm pl-10 pr-3.5 transition"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-[#9396a8]">Institutional email</label>
            <div className="relative">
              <HiEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
              <input
                type="email"
                placeholder="Enter your university email"
                className="w-full h-11 bg-white dark:bg-[#0e0f15] border border-gray-300 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:dark:border-blue-500 rounded-lg text-sm pl-10 pr-3.5 transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Role & Program */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-[#9396a8]">Role</label>
              <div className="relative">
                <HiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84] pointer-events-none" />
                <select
                  className="w-full h-11 bg-white dark:bg-[#0e0f15] border border-gray-300 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:dark:border-blue-500 rounded-lg text-sm pl-10 pr-3 transition appearance-none cursor-pointer"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-[#9396a8]">Program</label>
              <div className="relative">
                <HiAcademicCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84] pointer-events-none" />
                <select
                  className="w-full h-11 bg-white dark:bg-[#0e0f15] border border-gray-300 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:dark:border-blue-500 rounded-lg text-sm pl-10 pr-3 transition appearance-none cursor-pointer"
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

          {/* Conditionally render Specialization for BSIT */}
          {program === "Bachelor of Science in Information Technology" && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-[#9396a8]">Specialization</label>
              <div className="relative">
                <HiAcademicCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84] pointer-events-none" />
                <select
                  className="w-full h-11 bg-white dark:bg-[#0e0f15] border border-gray-300 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:dark:border-blue-500 rounded-lg text-sm pl-10 pr-3 transition appearance-none cursor-pointer"
                  value={programSpecialization}
                  onChange={(e) => setProgramSpecialization(e.target.value)}
                  required
                >
                  {SPECIALIZATION_OPTIONS.map((spec) => (
                    <option key={spec.value} value={spec.value}>{spec.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Student / Employee ID Number */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-[#9396a8]">
              {role === "student" ? "Student ID Number" : "Employee ID Number"}
            </label>
            <div className="relative">
              <HiIdentification className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
              <input
                type="text"
                placeholder={role === "student" ? "e.g. 2024-1002" : "e.g. EMP-2024"}
                className="w-full h-11 bg-white dark:bg-[#0e0f15] border border-gray-300 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:dark:border-blue-500 rounded-lg text-sm pl-10 pr-3.5 transition"
                value={studentIdOrEmployeeId}
                onChange={(e) => setStudentIdOrEmployeeId(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-[#9396a8]">Password</label>
            <div className="relative">
              <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password (min 6 characters)"
                className="w-full h-11 bg-white dark:bg-[#0e0f15] border border-gray-300 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:dark:border-blue-500 rounded-lg text-sm pl-10 pr-10 transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#6b6f84] hover:text-gray-600 dark:hover:text-[#f3f4f8] transition"
              >
                {showPassword ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-[#9396a8]">Confirm password</label>
            <div className="relative">
              <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                className="w-full h-11 bg-white dark:bg-[#0e0f15] border border-gray-300 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:dark:border-blue-500 rounded-lg text-sm pl-10 pr-10 transition"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#6b6f84] hover:text-gray-600 dark:hover:text-[#f3f4f8] transition"
              >
                {showConfirmPassword ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-primary hover:bg-primary-hover text-white font-medium text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-xs"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing up...
              </span>
            ) : (
              "Sign up with Email"
            )}
          </button>

          {/* Divider */}
          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-gray-200 dark:border-[#222433]" />
            <span className="flex-shrink mx-4 text-xs text-gray-400 dark:text-[#6b6f84] font-medium uppercase tracking-wider">or</span>
            <div className="flex-grow border-t border-gray-200 dark:border-[#222433]" />
          </div>

          {/* Google Sign Up */}
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await registerWithGoogle("student");
                if (res?.needsOnboarding) {
                  navigate(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
                } else {
                  navigate(returnTo);
                }
              } catch (err) {
                if (err.code !== "auth/popup-closed-by-user") {
                  setError(err.message || "Google Sign-Up failed.");
                }
              }
            }}
            className="w-full h-11 px-4 rounded-lg bg-white dark:bg-[#0e0f15] hover:bg-gray-50 dark:hover:bg-[#1c1d28] border border-gray-300 dark:border-[#222433] text-gray-700 dark:text-[#f3f4f8] text-sm font-medium flex items-center justify-center gap-3 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign up with Google</span>
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm text-gray-500 dark:text-[#9396a8]">
        Already have an account?{" "}
        <Link to="/login" className="text-primary font-semibold hover:underline">Log in</Link>
      </div>
    </AuthLayout>
  );
};
