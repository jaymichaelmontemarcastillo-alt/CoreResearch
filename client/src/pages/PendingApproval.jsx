// src/pages/PendingApproval.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import {
  HiClock,
  HiCheckCircle,
  HiExclamationTriangle,
  HiShieldCheck,
  HiArrowPath,
  HiArrowRight,
  HiIdentification,
  HiEnvelope,
  HiAcademicCap,
  HiUser,
  HiBuildingOffice2,
  HiInformationCircle,
  HiArrowLeft,
  HiMagnifyingGlass,
} from "react-icons/hi2";
import { userService } from "../services/user.service";

const STORAGE_KEY = "core_research_last_pending_reg";

export const PendingApproval = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Load registration data from route state, or fallback to session storage
  const [regData, setRegData] = useState(() => {
    if (location.state && (location.state.email || location.state.studentId)) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(location.state));
      } catch (e) {
        // ignore storage errors
      }
      return location.state;
    }
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return null;
  });

  // Status check states
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null); // 'approved' | 'rejected' | 'pending' | 'not_found' | null
  const [checkMessage, setCheckMessage] = useState("");
  const [lastCheckedTime, setLastCheckedTime] = useState(null);

  // Manual lookup input for direct visitors
  const [showLookupInput, setShowLookupInput] = useState(!regData);
  const [lookupIdentifier, setLookupIdentifier] = useState("");
  const [lookupError, setLookupError] = useState("");

  const email = checkResult?.data?.email || regData?.email || "";
  const studentId = checkResult?.data?.studentId || regData?.studentId || "";
  const fullName = checkResult?.data?.fullName || regData?.fullName || "";
  const program = checkResult?.data?.program || regData?.program || "";
  const major = checkResult?.data?.major || regData?.major || "";
  const section = checkResult?.data?.section || regData?.section || "";
  const role = checkResult?.data?.role || regData?.role || "student";
  const submittedAt = checkResult?.data?.submittedAt || regData?.submittedAt;

  // Format date helper
  const formattedDate = React.useMemo(() => {
    if (!submittedAt) return "Just now";
    try {
      return new Date(submittedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "Recently";
    }
  }, [submittedAt]);

  const handleCheckStatus = async (identifierOverride = null) => {
    const targetEmail = identifierOverride || email;
    const targetId = identifierOverride ? null : studentId;

    if (!targetEmail && !targetId) {
      setShowLookupInput(true);
      return;
    }

    setChecking(true);
    setCheckMessage("");
    setLookupError("");

    try {
      const isEmail = targetEmail && targetEmail.includes("@");
      const res = await userService.checkRegistrationStatus({
        email: isEmail ? targetEmail : undefined,
        id: !isEmail ? (targetEmail || targetId) : targetId,
      });

      setLastCheckedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

      if (!res) {
        setCheckResult("not_found");
        setCheckMessage("No registered record found with this identifier. Please verify your details.");
        return;
      }

      if (res.status === "approved" || res.is_approved) {
        setCheckResult({ type: "approved", data: res });
        setCheckMessage("Your account has been approved by the administrator! You may now sign in.");
      } else if (res.status === "rejected") {
        setCheckResult({ type: "rejected", data: res });
        setCheckMessage(
          res.rejectionReason
            ? `Registration not approved: ${res.rejectionReason}`
            : "Your registration application was not approved by the administrator."
        );
      } else {
        setCheckResult({ type: "pending", data: res });
        setCheckMessage("Your account is still awaiting review by the administrator.");
      }
    } catch (err) {
      console.warn("[PendingApproval] Status check failed:", err);
      setCheckMessage("Could not verify status at this moment. Please try again shortly.");
    } finally {
      setChecking(false);
    }
  };

  const handleLookupSubmit = (e) => {
    e.preventDefault();
    if (!lookupIdentifier.trim()) {
      setLookupError("Please enter your Student ID or Registered Email.");
      return;
    }
    handleCheckStatus(lookupIdentifier.trim());
  };

  const isApproved = checkResult?.type === "approved";
  const isRejected = checkResult?.type === "rejected";

  return (
    <AuthLayout
      title="REGISTRATION SUBMITTED"
      subtitle="Your account is undergoing institutional verification"
      quoteTitle="Institutional integrity starts with verified academic credentials."
      quoteSubtitle="Every research submission, adviser matching, and manuscript archive is safeguarded through authorized registration review."
      cardWidthClass="lg:w-[50%] xl:w-[48%] 2xl:w-[45%] max-w-[680px] xl:max-w-[720px]"
    >
      <div className="space-y-6">
        {/* Dynamic Status Notification Alert */}
        {checkMessage && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-start gap-3 transition-all animate-fadeIn ${
              isApproved
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                : isRejected
                ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300"
                : checkResult === "not_found"
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                : "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300"
            }`}
          >
            {isApproved ? (
              <HiShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : isRejected ? (
              <HiExclamationTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            ) : (
              <HiInformationCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            )}
            <div className="flex-1">
              <p className="font-semibold">
                {isApproved
                  ? "Account Approved!"
                  : isRejected
                  ? "Registration Rejected"
                  : checkResult === "not_found"
                  ? "Record Not Found"
                  : "Approval In Progress"}
              </p>
              <p className="text-xs sm:text-sm mt-0.5 opacity-90">{checkMessage}</p>
              {lastCheckedTime && (
                <p className="text-[11px] opacity-75 mt-1">Checked at {lastCheckedTime}</p>
              )}
            </div>
          </div>
        )}

        {/* Hero Visual Card: State Badge & Icon */}
        <div className="text-center py-2 sm:py-3">
          {isApproved ? (
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/20 animate-bounce-subtle">
                <HiCheckCircle className="w-12 h-12" />
              </div>
            </div>
          ) : isRejected ? (
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center shadow-lg shadow-red-500/20 ring-4 ring-red-500/20">
                <HiExclamationTriangle className="w-12 h-12" />
              </div>
            </div>
          ) : (
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10 ring-4 ring-amber-500/20 relative">
                <HiClock className="w-11 h-11" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                </span>
              </div>
            </div>
          )}

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {isApproved ? "Approved & Ready" : isRejected ? "Application Declined" : "Pending Administrator Approval"}
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {isApproved
              ? "Welcome to CoreResearch!"
              : isRejected
              ? "Application Requires Revision"
              : "Account Awaiting Approval"}
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-lg mx-auto leading-relaxed">
            {isApproved
              ? "Your registration credentials have been verified and activated by the system administrator. You can now access your student research portal."
              : isRejected
              ? "Your registration application was reviewed and could not be approved. Please contact your research coordinator or re-register with verified credentials."
              : "Your account registration has been successfully received. To maintain institutional academic records, an administrator or research coordinator must approve your account before you can log in."}
          </p>
        </div>

        {/* Multi-step Approval Pipeline Progress */}
        <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-slate-900/50 border border-gray-200/80 dark:border-slate-800">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Registration Lifecycle
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20 mb-1.5">
                <HiCheckCircle className="w-5 h-5" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Step 1</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Form Submitted</span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1.5 transition ${
                  isApproved
                    ? "bg-emerald-500 text-white"
                    : isRejected
                    ? "bg-red-500 text-white"
                    : "bg-amber-500 text-white shadow-md shadow-amber-500/20 ring-2 ring-amber-300 dark:ring-amber-800"
                }`}
              >
                {isApproved ? (
                  <HiCheckCircle className="w-5 h-5" />
                ) : (
                  <HiClock className="w-5 h-5 animate-pulse" />
                )}
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Step 2</span>
              <span
                className={`text-[11px] font-medium ${
                  isApproved
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isRejected
                    ? "text-red-500"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {isApproved ? "Approved" : isRejected ? "Rejected" : "In Admin Review"}
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1.5 transition ${
                  isApproved
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-gray-500"
                }`}
              >
                <HiShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Step 3</span>
              <span
                className={`text-[11px] font-medium ${
                  isApproved ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {isApproved ? "Active" : "Workspace Access"}
              </span>
            </div>
          </div>
        </div>

        {/* Registered Profile Breakdown (When state is present) */}
        {(studentId || email || fullName) && (
          <div className="rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/80 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-slate-700/60">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <HiIdentification className="w-4 h-4 text-blue-500" />
                Submitted Account Details
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {formattedDate}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {fullName && (
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900/60 border border-gray-200/70 dark:border-slate-800 flex items-start gap-2.5">
                  <HiUser className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="truncate">
                    <span className="block text-[10px] text-gray-400 uppercase font-semibold">Student Name</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate block">{fullName}</span>
                  </div>
                </div>
              )}

              {studentId && (
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900/60 border border-gray-200/70 dark:border-slate-800 flex items-start gap-2.5">
                  <HiIdentification className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="truncate">
                    <span className="block text-[10px] text-gray-400 uppercase font-semibold">Student ID</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 font-mono">{studentId}</span>
                  </div>
                </div>
              )}

              {email && (
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900/60 border border-gray-200/70 dark:border-slate-800 flex items-start gap-2.5">
                  <HiEnvelope className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="truncate">
                    <span className="block text-[10px] text-gray-400 uppercase font-semibold">Institutional Email</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate block">{email}</span>
                  </div>
                </div>
              )}

              {(program || section) && (
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900/60 border border-gray-200/70 dark:border-slate-800 flex items-start gap-2.5">
                  <HiAcademicCap className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="truncate">
                    <span className="block text-[10px] text-gray-400 uppercase font-semibold">Program & Section</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate block">
                      {program || "BSIT"} {section ? `• Sec ${section}` : ""}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {major && (
              <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                <span className="font-medium text-gray-600 dark:text-gray-300">Specialization:</span> {major}
              </div>
            )}
          </div>
        )}

        {/* Manual Lookup Option (If user came directly or wants to verify another ID) */}
        {showLookupInput && (
          <form onSubmit={handleLookupSubmit} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Check Status by Student ID or Email
              </label>
              {regData && (
                <button
                  type="button"
                  onClick={() => setShowLookupInput(false)}
                  className="text-[11px] text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="relative">
              <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="e.g. 2023-10023 or student@university.edu"
                value={lookupIdentifier}
                onChange={(e) => setLookupIdentifier(e.target.value)}
                className="w-full h-11 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm pl-10 pr-3.5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {lookupError && (
              <p className="text-xs text-red-500">{lookupError}</p>
            )}

            <button
              type="submit"
              disabled={checking}
              className="w-full h-10 bg-gray-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {checking ? (
                <>
                  <HiArrowPath className="w-4 h-4 animate-spin" />
                  Checking approval status...
                </>
              ) : (
                <>
                  <HiMagnifyingGlass className="w-4 h-4" />
                  Look Up Approval Status
                </>
              )}
            </button>
          </form>
        )}

        {/* Helpful Information Notes */}
        <div className="rounded-xl p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs text-gray-600 dark:text-gray-300 space-y-2">
          <div className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
            <HiInformationCircle className="w-4 h-4 text-blue-500" />
            What happens next?
          </div>
          <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
            <li>Administrators review registrations to ensure correct program and section assignments.</li>
            <li>Verification is typically completed within <strong>24 to 48 hours</strong> during regular school days.</li>
            <li>Once approved, you will be able to log in immediately with your registered password.</li>
          </ul>
        </div>

        {/* Action Controls */}
        <div className="space-y-3 pt-2">
          {/* Primary Action Button */}
          {isApproved ? (
            <Link
              to="/student/login"
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              <span>Proceed to Student Sign In</span>
              <HiArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleCheckStatus()}
                disabled={checking}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <HiArrowPath className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
                <span>{checking ? "Checking Status..." : "Check Status Now"}</span>
              </button>

              <Link
                to="/student/login"
                className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 font-semibold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2"
              >
                <HiArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          )}

          {/* Secondary utilities */}
          <div className="flex items-center justify-between pt-2 text-xs text-gray-500 dark:text-gray-400">
            {!showLookupInput && (
              <button
                type="button"
                onClick={() => setShowLookupInput(true)}
                className="hover:text-blue-500 transition cursor-pointer underline underline-offset-4"
              >
                Look up a different ID / email
              </button>
            )}
            <div className="ml-auto">
              Need assistance?{" "}
              <a
                href="mailto:support@coreresearch.edu"
                className="text-blue-500 hover:underline font-medium"
              >
                Contact Administrator
              </a>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default PendingApproval;
