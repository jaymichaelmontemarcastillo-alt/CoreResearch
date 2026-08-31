// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { HiLockClosed, HiEnvelope, HiEye, HiEyeSlash } from "react-icons/hi2";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Extract returnTo from URL if present
  const queryParams = new URLSearchParams(window.location.search);
  const returnTo = queryParams.get("returnTo") || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate(returnTo);
    } catch (err) {
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-email" ||
        err.message?.includes("invalid-credential")
      ) {
        setError("Invalid email or password. If you haven't registered an account yet, please sign up or use Google Sign-In.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Access is temporarily disabled. Try again later or reset your password.");
      } else if (err.code === "auth/user-disabled") {
        setError("This account has been deactivated. Please contact support or your administrator.");
      } else {
        setError(
          err.message || "Failed to sign in. Please check your credentials.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const res = await loginWithGoogle();
      if (res?.needsOnboarding) {
        navigate(`/onboarding?returnTo=${encodeURIComponent(returnTo)}`);
      } else {
        navigate(returnTo);
      }
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Google Sign-In failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Login"
      subtitle="Login to your account to continue"
    >
      {error && (
        <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs sm:text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
            Email
          </label>
          <div className="relative">
            <HiEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
            <input
              type="email"
              placeholder="name@company.com"
              className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:dark:border-blue-500 rounded-xl text-sm pl-10 pr-3.5 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-[#9396a8]">
            Password
          </label>
          <div className="relative">
            <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full h-11 sm:h-12 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:dark:border-blue-500 rounded-xl text-sm pl-10 pr-10 transition"
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

        {/* Remember Me & Forgot Password Row */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-[#333649] text-blue-600 focus:ring-blue-500/20 dark:bg-[#0e0f15]"
            />
            <span>Remember Me</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-xs text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition font-medium"
          >
            Forgot Password?
          </Link>
        </div>

        {/* Submit / Login Button (Vibrant Blue) */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 sm:h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md shadow-blue-500/20 active:scale-[0.99] mt-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Logging in...
            </span>
          ) : (
            "Login"
          )}
        </button>

        {/* Divider */}
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-200 dark:border-[#222433]" />
          <span className="flex-shrink mx-3 text-xs text-gray-400 dark:text-[#6b6f84] font-normal">
            Or continue with:
          </span>
          <div className="flex-grow border-t border-gray-200 dark:border-[#222433]" />
        </div>

        {/* Google Sign In — Direct Log In */}
        <button
          type="button"
          disabled={googleLoading || loading}
          onClick={handleGoogleSignIn}
          className="w-full h-11 sm:h-12 px-4 rounded-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium flex items-center justify-center gap-3 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          {googleLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing in...
            </span>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>
      </form>

      {/* Register link */}
      <div className="mt-5 text-center text-xs sm:text-sm text-gray-500 dark:text-[#9396a8]">
        Don't have an account?{" "}
        <Link to="/register" className="text-gray-900 dark:text-white font-bold hover:underline">
          Sign up here
        </Link>
      </div>
    </AuthLayout>
  );
};


