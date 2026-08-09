// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { Lock, Mail, Eye, EyeOff, Briefcase, Building2 } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "adviser", label: "Adviser" },
];

const DEPARTMENT_OPTIONS = [
  "Information Technology",
  "Computer Science",
];

export const Register = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Dito hinahandle yung form submission pag nag-sign up via Email/Password.
  // Flow:
  // 1. Validations muna (kung match yung password, etc).
  // 2. Tatawagin yung `register` function mula sa AuthContext.
  // 3. Pag successful (meaning nagawa na yung Firebase Auth at initial Firestore record),
  //    diretso na sa Dashboard. Note: Baka kailangan pa nila mag-onboarding sa Dashboard kung missing ang ibang details.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await register(email, password, "", role || "student", department, "");
      navigate("/dashboard");
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
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Institutional email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input type="email" placeholder="Enter your email" className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3.5 transition" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
                {ROLE_OPTIONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <select className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-lg text-sm pl-10 pr-3 transition appearance-none" value={department} onChange={(e) => setDepartment(e.target.value)} required>
                <option value="" disabled>Select department</option>
                {DEPARTMENT_OPTIONS.map((d) => (<option key={d} value={d}>{d}</option>))}
              </select>
            </div>
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
              Signing up...
            </span>
          ) : "Sign up with Email"}
        </button>

        {/* Divider */}
        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-gray-200 dark:border-slate-700" />
          <span className="flex-shrink mx-4 text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">or</span>
          <div className="flex-grow border-t border-gray-200 dark:border-slate-700" />
        </div>

        {/* Google Sign Up */}
        {/* 
          Pag kinlick ito, tatawagin yung `loginWithGoogle` sa AuthContext.
          Kung bago yung user (walang employee/student ID), yung `needsOnboarding` 
          ay magiging true. Kapag true, ire-redirect sila sa /onboarding para kumpletuhin ang profile.
        */}
        <button type="button" onClick={async () => { try { const res = await loginWithGoogle("student"); if (res?.needsOnboarding) { navigate("/onboarding"); } else { navigate("/dashboard"); } } catch (err) { if (err.code !== "auth/popup-closed-by-user") { setError(err.message || "Google Sign-Up failed."); } } }} className="w-full h-11 px-4 rounded-lg bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium flex items-center justify-center gap-3 transition">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" /></svg>
          <span>Sign up with Google</span>
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{" "}
        <Link to="/login" className="text-primary font-semibold hover:underline">Log in</Link>
      </div>
    </AuthLayout>
  );
};
