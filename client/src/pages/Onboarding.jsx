// src/pages/Onboarding.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { User, Building2, Contact, ArrowRight, Lock, Eye, EyeOff, Briefcase } from "lucide-react";
import { updatePassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export const Onboarding = () => {
  const { currentUser, userProfile, updateProfileLocal } = useAuth();
  const navigate = useNavigate();

  const initialNameParts = currentUser?.displayName
    ? currentUser.displayName.split(" ")
    : ["", ""];
  const [firstName, setFirstName] = useState(initialNameParts[0] || "");
  const [lastName, setLastName] = useState(initialNameParts.slice(1).join(" ") || "");
  const [role, setRole] = useState(userProfile?.role || "student");
  const [department, setDepartment] = useState(userProfile?.department || "Information Technology");
  const [studentIdOrEmployeeId, setStudentIdOrEmployeeId] = useState(userProfile?.studentIdOrEmployeeId || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Kapag kinumpleto ng user yung form at nag-submit...
  // Dito natin ipapasa yung kumpletong profile details (Name, Role, Department, ID)
  // sa Express backend natin na magse-save nito sa Firestore "users" collection.
  // Kapag naging successful ito, tagged as 'active' na yung user at papasok na sila sa Dashboard.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName || !lastName || !studentIdOrEmployeeId || !password || !confirmPassword) {
      return setError("Please complete all required profile fields.");
    }
    
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    
    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      // Dito natin sine-save yung bagong password na tinype ng user.
      // Dahil via Google Sign In sila pumasok (kaya nasa Onboarding sila), 
      // wala pa silang password. Kaya gagamitin natin yung updatePassword() 
      // para next time, pwede na silang mag-log in gamit ang email at password nila.
      await updatePassword(currentUser, password);
      
      const first_name = firstName.trim();
      const last_name = lastName.trim();

      // Ise-save na natin yung record sa database gamit ang Firestore SDK directly.
      // Dito na binubuo yung "User Profile" document sa Firestore na naka-link sa UID nila.
      // Pagkatapos nito, tapos na ang Onboarding flow.
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        uid: currentUser.uid,
        email: currentUser.email,
        first_name,
        last_name,
        fullName,
        role,
        role_id: role,
        department,
        department_id: department,
        studentIdOrEmployeeId,
        status: "active",
        is_approved: true,
        profile_image: currentUser.photoURL || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { merge: true });

      // Update natin yung local Auth context para mag-reflect agad yung changes 
      // sa UI (tulad ng pangalan at role) nang hindi na kailangan mag-refresh.
      if (updateProfileLocal) {
        updateProfileLocal({
          uid: currentUser.uid,
          email: currentUser.email,
          first_name,
          last_name,
          fullName,
          role,
          role_id: role,
          department,
          department_id: department,
          studentIdOrEmployeeId,
          status: "active",
          is_approved: true,
          profile_image: currentUser.photoURL || "",
          needsOnboarding: false,
        });
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
      subtitle={<>Signed in as <strong className="text-primary">{currentUser?.email}</strong>. Provide your university credentials to finish registration.</>}
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input type="text" placeholder="e.g. Alex" className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3.5 transition" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input type="text" placeholder="e.g. Rivera" className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3.5 transition" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>
        </div>

        {/* Role and Department */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <select className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3 transition appearance-none" value={role} onChange={(e) => setRole(e.target.value)} required>
                <option value="" disabled>Select role</option>
                {["student", "adviser"].map((item) => (
                  <option key={item} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <select className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3 transition appearance-none" value={department} onChange={(e) => setDepartment(e.target.value)} required>
                <option value="" disabled>Select department</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Computer Science">Computer Science</option>
              </select>
            </div>
          </div>
        </div>

        {/* ID Number */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{role === "student" ? "Student ID Number" : "Employee ID Number"}</label>
          <div className="relative">
            <Contact className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input type="text" placeholder="e.g. 2024-1002" className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3.5 transition" value={studentIdOrEmployeeId} onChange={(e) => setStudentIdOrEmployeeId(e.target.value)} required />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input type={showPassword ? "text" : "password"} placeholder="Create a password (min 6 characters)" className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-10 transition" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input type="password" placeholder="Re-enter your password" className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3.5 transition" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} className="w-full h-11 bg-primary hover:bg-primary-hover text-white font-medium text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
              Completing Registration...
            </span>
          ) : (
            <span className="flex items-center">Complete Registration <ArrowRight className="w-4 h-4 ml-2" /></span>
          )}
        </button>
      </form>
    </AuthLayout>
  );
};
