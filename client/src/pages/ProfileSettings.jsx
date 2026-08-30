// src/pages/ProfileSettings.jsx
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HiUser,
  HiLockClosed,
  HiBell,
  HiShieldCheck,
  HiCamera,
  HiCheckCircle,
  HiExclamationCircle,
  HiEye,
  HiEyeSlash,
  HiTrash,
  HiArrowUpTray,
  HiBuildingOffice2,
  HiAcademicCap,
  HiEnvelope,
  HiKey,
  HiCheck,
  HiSparkles,
} from "react-icons/hi2";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "../services/firebase";
import api from "../services/api";
import { ImageCropModal } from "../components/ui/ImageCropModal";

const COLLEGES_DATA = {
  "College of Computer Studies": [
    "Department of Computer Science",
    "Department of Information Technology",]
};

const EXPERTISE_CATEGORIES = {
  "Information Technology": [
    "Web Development", "Mobile Application Development", "Database Management", 
    "Cloud Computing", "Networking", "Cybersecurity", 
    "Software Engineering", "Information Systems", "IT Project Management"
  ],
  "Computer Science": [
    "Machine Learning", "Algorithms & Data Structures", "Computer Vision", 
    "Natural Language Processing", "Human-Computer Interaction", 
    "Computer Graphics", "Distributed Computing", "Artificial Intelligence", 
    "Data Science", "Deep Learning"
  ],
  "Information Systems": [
    "Enterprise Systems", "Business Intelligence", "Data Mining",
    "Information Security Management", "E-Commerce", "Digital Transformation"
  ]
};

export const ProfileSettings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { currentUser, userProfile, updateUserProfile, devMode } = useAuth();

  // Profile Form States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [college, setCollege] = useState("College of Computer Studies");
  const [department, setDepartment] = useState("Department of Computer Science");
  const [studentIdOrEmployeeId, setStudentIdOrEmployeeId] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState(null);

  // Academic Profile States (Adviser Only)
  const [selectedExpertise, setSelectedExpertise] = useState([]);
  const [expertiseSearchTerm, setExpertiseSearchTerm] = useState("");

  // Interactive Photo Cropping / Adjusting Modal States
  const [rawImageForCrop, setRawImageForCrop] = useState(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);

  // Notifications Form States
  const [notifyManuscript, setNotifyManuscript] = useState(true);
  const [notifyDefense, setNotifyDefense] = useState(true);
  const [notifyReviews, setNotifyReviews] = useState(true);
  const [notifyAnnouncements, setNotifyAnnouncements] = useState(false);
  const [notificationFeedback, setNotificationFeedback] = useState(null);

  const fileInputRef = useRef(null);

  // Initialize form with user data
  useEffect(() => {
    if (userProfile || currentUser) {
      const full = userProfile?.fullName || currentUser?.displayName || "";
      const parts = full.trim().split(" ");

      const fName = userProfile?.first_name || (parts.length > 0 ? parts[0] : "");
      const lName = userProfile?.last_name || (parts.length > 1 ? parts.slice(1).join(" ") : "");

      setFirstName(fName || "");
      setLastName(lName || "");
      setEmail(userProfile?.email || currentUser?.email || "");

      const userCollege = userProfile?.college || "College of Computer Studies";
      setCollege(userCollege);

      const userDept = userProfile?.department || "Department of Computer Science";
      setDepartment(userDept);

      setStudentIdOrEmployeeId(userProfile?.studentIdOrEmployeeId || "");
      setAvatarPreview(userProfile?.profile_image || currentUser?.photoURL || "");

      // Initialize academic fields (combining old fields for backward compatibility)
      let existingExpertise;
      if (userProfile?.selectedExpertise !== undefined) {
        existingExpertise = new Set(userProfile.selectedExpertise);
      } else {
        existingExpertise = new Set([
          ...(userProfile?.specialization || []),
          ...(userProfile?.expertise || []),
          ...(userProfile?.researchInterests || []),
          ...(userProfile?.keywords || [])
        ]);
      }
      setSelectedExpertise(Array.from(existingExpertise));
    }
  }, [userProfile, currentUser]);

  const toggleExpertise = (tag) => {
    setSelectedExpertise((prev) => 
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Sync tab with URL query
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    setProfileFeedback(null);
    setPasswordFeedback(null);
    setNotificationFeedback(null);
  };

  // Handle College change and update department options
  const handleCollegeChange = (e) => {
    const selectedCollege = e.target.value;
    setCollege(selectedCollege);
    const availableDepts = COLLEGES_DATA[selectedCollege] || [];
    if (availableDepts.length > 0) {
      setDepartment(availableDepts[0]);
    }
  };

  // Avatar file upload handler -> opens crop/adjust modal right after user picks a picture
  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileFeedback({
        type: "error",
        message: "Please select a valid image file (PNG, JPG, WEBP).",
      });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setProfileFeedback({
        type: "error",
        message: "Image size should be less than 8MB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImageForCrop(reader.result);
      setIsCropModalOpen(true);
      // Reset input value so same file can be selected again if cancelled
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  // Callback when crop adjustment is applied in modal
  const handleApplyCrop = (croppedDataUrl) => {
    setAvatarPreview(croppedDataUrl);
    setProfileFeedback({
      type: "success",
      message: "Photo adjusted! Click 'Save Changes' to update your profile.",
    });
  };

  // Delete avatar handler
  const handleDeleteAvatar = () => {
    setAvatarPreview("");
    setRawImageForCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setProfileFeedback({
      type: "success",
      message: "Avatar removed. Click 'Save Changes' to apply.",
    });
  };

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileFeedback(null);

    if (!firstName.trim() || !lastName.trim()) {
      setProfileFeedback({
        type: "error",
        message: "First Name and Last Name are required.",
      });
      return;
    }

    setProfileSaving(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      const updatedFields = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        fullName,
        college,
        department,
        studentIdOrEmployeeId: studentIdOrEmployeeId.trim(),
        profile_image: avatarPreview || "",
      };

      if (userProfile?.role === "adviser") {
        updatedFields.selectedExpertise = selectedExpertise;
      }

      if (updateUserProfile) {
        await updateUserProfile(updatedFields);
      }
      
      await api.put("/users/me", updatedFields);

      setProfileFeedback({
        type: "success",
        message: "Profile updated successfully!",
      });

      // Auto dismiss success toast after 4 seconds
      setTimeout(() => {
        setProfileFeedback(null);
      }, 4000);
    } catch (err) {
      setProfileFeedback({
        type: "error",
        message: err.message || "Failed to update profile. Please try again.",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!currentPassword) {
      setPasswordFeedback({
        type: "error",
        message: "Please enter your current password.",
      });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordFeedback({
        type: "error",
        message: "New password must be at least 6 characters long.",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordFeedback({
        type: "error",
        message: "New password and confirmation do not match.",
      });
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordFeedback({
        type: "error",
        message: "New password must be different from current password.",
      });
      return;
    }

    setPasswordSaving(true);

    try {
      if (devMode || !auth.currentUser) {
        // Dev Mode Simulation & Backend call
        await new Promise((resolve) => setTimeout(resolve, 600));
        try {
          await api.post("/users/me/password", { newPassword });
        } catch (apiErr) {
          // Dev fallback
        }
        setPasswordFeedback({
          type: "success",
          message: "Password changed successfully! (Demo Mode)",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        // Real Firebase Auth flow
        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email, currentPassword);

        try {
          await reauthenticateWithCredential(user, credential);
        } catch (authErr) {
          throw new Error("Current password is incorrect.");
        }

        await updatePassword(user, newPassword);

        setPasswordFeedback({
          type: "success",
          message: "Password has been updated successfully!",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }

      setTimeout(() => {
        setPasswordFeedback(null);
      }, 5000);
    } catch (err) {
      setPasswordFeedback({
        type: "error",
        message: err.message || "Failed to change password. Please check your credentials.",
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  // User Display Initials Helper
  const getInitials = () => {
    const f = firstName.trim();
    const l = lastName.trim();
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f.slice(0, 2).toUpperCase();
    if (userProfile?.fullName) {
      return userProfile.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    return "DE";
  };

  const roleLabel =
    userProfile?.role === "admin"
      ? "System Administrator"
      : userProfile?.role === "research_coordinator"
        ? "Research Coordinator"
        : userProfile?.role === "adviser"
          ? "Research Adviser"
          : userProfile?.role === "panelist"
            ? "Defense Panelist"
            : "Student Researcher";

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Page Title Header */}
      <div>
        <h1 className="text-2xl font-medium text-gray-900 dark:text-white tracking-tight">
          Account settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your personal profile, credentials, and institutional preferences.
        </p>
      </div>

      {/* Main Settings Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Navigation Sidebar Tabs */}
        <div className="md:col-span-4 lg:col-span-3">
          <div className="bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433] rounded-2xl p-2 shadow-sm space-y-1">
            {/* Tab: Profile Settings */}
            <button
              onClick={() => handleTabChange("profile")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "profile"
                  ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                  : "text-gray-600 dark:text-[#9396a8] hover:bg-gray-50 dark:hover:bg-[#1c1d28] hover:text-gray-900 dark:hover:text-white"
                }`}
            >
              <div className="flex items-center gap-3">
                <HiUser className="w-4 h-4 shrink-0" />
                <span>Profile Settings</span>
              </div>
              {activeTab === "profile" && (
                 <div className="w-1.5 h-5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>

            {/* Tab: Password */}
            <button
              onClick={() => handleTabChange("password")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "password"
                  ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                  : "text-gray-600 dark:text-[#9396a8] hover:bg-gray-50 dark:hover:bg-[#1c1d28] hover:text-gray-900 dark:hover:text-white"
                }`}
            >
              <div className="flex items-center gap-3">
                <HiLockClosed className="w-4 h-4 shrink-0" />
                <span>Password</span>
              </div>
              {activeTab === "password" && (
                <div className="w-1.5 h-5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>

            {/* Tab: Notifications */}
            <button
              onClick={() => handleTabChange("notifications")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "notifications"
                  ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                  : "text-gray-600 dark:text-[#9396a8] hover:bg-gray-50 dark:hover:bg-[#1c1d28] hover:text-gray-900 dark:hover:text-white"
                }`}
            >
              <div className="flex items-center gap-3">
                <HiBell className="w-4 h-4 shrink-0" />
                <span>Notifications</span>
              </div>
              {activeTab === "notifications" && (
                <div className="w-1.5 h-5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>

            {/* Tab: Verification */}
            <button
              onClick={() => handleTabChange("verification")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "verification"
                  ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                  : "text-gray-600 dark:text-[#9396a8] hover:bg-gray-50 dark:hover:bg-[#1c1d28] hover:text-gray-900 dark:hover:text-white"
                }`}
            >
              <div className="flex items-center gap-3">
                <HiShieldCheck className="w-4 h-4 shrink-0" />
                <span>Verification</span>
              </div>
              {activeTab === "verification" && (
                <div className="w-1.5 h-5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>

            {/* Tab: Expertise (Adviser Only) */}
            {userProfile?.role === "adviser" && (
              <button
                onClick={() => handleTabChange("expertise")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "expertise"
                    ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                    : "text-gray-600 dark:text-[#9396a8] hover:bg-gray-50 dark:hover:bg-[#1c1d28] hover:text-gray-900 dark:hover:text-white"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <HiSparkles className="w-4 h-4 shrink-0" />
                  <span>Expertise</span>
                </div>
                {activeTab === "expertise" && (
                  <div className="w-1.5 h-5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </button>
            )}
          </div>

          {/* Institutional Badge Card */}
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-[#1c1d28] dark:to-[#15161e] border border-blue-100/80 dark:border-[#222433]">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wider">
              <HiSparkles className="w-3.5 h-3.5" />
              Institutional Account
            </div>
            <p className="text-xs text-gray-700 dark:text-[#f3f4f8] mt-1.5 font-semibold">
              {roleLabel}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-[#9396a8] mt-0.5 truncate">
              {email}
            </p>
          </div>
        </div>

        {/* Right Column: Main Form Card */}
        <div className="md:col-span-8 lg:col-span-9 bg-white dark:bg-[#15161e] border border-gray-200/90 dark:border-[#222433] rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* TAB 1: PROFILE SETTINGS */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-8">
              {/* Feedback Alert */}
              {profileFeedback && (
                <div
                  className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-fade-in ${profileFeedback.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400"
                    }`}
                >
                  {profileFeedback.type === "success" ? (
                    <HiCheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <HiExclamationCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
                  )}
                  <span>{profileFeedback.message}</span>
                </div>
              )}

              {/* Avatar Upload Section (Matches Reference Image) */}
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6 pb-6 border-b border-gray-100 dark:border-[#222433]">
                {/* Circular Avatar with Camera Badge */}
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-gray-100 dark:ring-[#222433] overflow-hidden bg-gray-100 dark:bg-[#1c1d28] flex items-center justify-center shadow-inner">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Profile avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-medium text-3xl flex items-center justify-center tracking-wider">
                        {getInitials()}
                      </div>
                    )}
                  </div>

                  {/* Camera overlay trigger */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-[#15161e] transition transform hover:scale-105"
                    title="Change picture"
                  >
                    <HiCamera className="w-4 h-4" />
                  </button>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {/* Upload & Delete Avatar Action Buttons (Matching Reference Design) */}
                <div className="flex flex-col items-center sm:items-start gap-2.5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition shadow-xs flex items-center gap-2"
                    >
                      <HiArrowUpTray className="w-4 h-4" />
                      Upload New
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteAvatar}
                      disabled={!avatarPreview}
                      className="px-4 py-2 bg-gray-100 dark:bg-[#1c1d28] hover:bg-gray-200 dark:hover:bg-[#252839] border border-transparent dark:border-[#222433] text-gray-700 dark:text-[#9396a8] font-medium text-sm rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <HiTrash className="w-4 h-4 text-gray-500 dark:text-[#6b6f84]" />
                      Delete avatar
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#9396a8]">
                    JPG, PNG, or WebP. Choose a picture to pan and zoom before applying.
                  </p>
                </div>
              </div>

              {/* Profile Details Form Grid */}
              <div className="space-y-6">
                {/* Row 1: First Name & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-[#9396a8] uppercase tracking-wider">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dean Elizabeth"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full h-11 px-4 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-sm text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-[#9396a8] uppercase tracking-wider">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Warren"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full h-11 px-4 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-sm text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                {/* Row 2: Email & Student/Employee ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-[#9396a8] uppercase tracking-wider">
                      Email
                    </label>
                    <div className="relative">
                      <HiEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                      <input
                        type="email"
                        value={email}
                        readOnly
                        disabled
                        className="w-full h-11 pl-10 pr-4 bg-gray-50 dark:bg-[#1c1d28]/70 border border-gray-200 dark:border-[#222433] rounded-xl text-sm text-gray-500 dark:text-[#6b6f84] cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-[#6b6f84]">
                      Institutional email is managed by your university directory.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-[#9396a8] uppercase tracking-wider">
                      {userProfile?.role === "student" ? "Student ID Number" : "Employee ID Number"}
                    </label>
                    <div className="relative">
                      <HiAcademicCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                      <input
                        type="text"
                        placeholder="e.g. 2022-10482 or ADM-0001"
                        value={studentIdOrEmployeeId}
                        onChange={(e) => setStudentIdOrEmployeeId(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-sm text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: College & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-[#9396a8] uppercase tracking-wider">
                      College
                    </label>
                    <div className="relative">
                      <HiBuildingOffice2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84] pointer-events-none" />
                      <select
                        value={college}
                        onChange={handleCollegeChange}
                        className="w-full h-11 pl-10 pr-4 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-sm text-gray-900 dark:text-[#f3f4f8] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition appearance-none cursor-pointer"
                      >
                        {Object.keys(COLLEGES_DATA).map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-[#9396a8] uppercase tracking-wider">
                      Department
                    </label>
                    <div className="relative">
                      <HiBuildingOffice2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84] pointer-events-none" />
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-sm text-gray-900 dark:text-[#f3f4f8] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition appearance-none cursor-pointer"
                      >
                        {(COLLEGES_DATA[college] || [
                          "Department of Computer Science",
                          "Department of Information Technology",
                          "Department of Information Systems",
                        ]).map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-6 border-t border-gray-100 dark:border-[#222433] flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {profileSaving ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <HiCheck className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PASSWORD SETTINGS */}
          {activeTab === "password" && (
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              {/* Section Header */}
              <div className="pb-4 border-b border-gray-100 dark:border-[#222433]">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Change Password
                </h2>
                <p className="text-xs text-gray-500 dark:text-[#9396a8] mt-1">
                  Ensure your account is using a strong, unique password with at least 6 characters.
                </p>
              </div>

              {/* Feedback Alert */}
              {passwordFeedback && (
                <div
                  className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-fade-in ${passwordFeedback.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400"
                    }`}
                >
                  {passwordFeedback.type === "success" ? (
                    <HiCheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <HiExclamationCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
                  )}
                  <span>{passwordFeedback.message}</span>
                </div>
              )}

              {/* Password Fields */}
              <div className="max-w-xl space-y-5">
                {/* Current Password */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-[#9396a8] uppercase tracking-wider">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <HiKey className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full h-11 pl-10 pr-11 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-sm text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-[#6b6f84] dark:hover:text-[#9396a8] transition"
                    >
                      {showCurrentPassword ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-[#9396a8] uppercase tracking-wider">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password (min 6 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full h-11 pl-10 pr-11 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-sm text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-[#6b6f84] dark:hover:text-[#9396a8] transition"
                    >
                      {showNewPassword ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-[#9396a8] uppercase tracking-wider">
                    Confirm New password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      className="w-full h-11 pl-10 pr-11 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-sm text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-[#6b6f84] dark:hover:text-[#9396a8] transition"
                    >
                      {showConfirmPassword ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Real-time Checklist */}
                <div className="p-3.5 bg-gray-50 dark:bg-[#1c1d28]/70 border border-gray-100 dark:border-[#222433] rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${newPassword.length >= 6
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-gray-200 text-gray-400 dark:bg-[#0e0f15] dark:text-[#6b6f84]"
                        }`}
                    >
                      <HiCheck className="w-3 h-3" />
                    </div>
                    <span
                      className={
                        newPassword.length >= 6
                          ? "text-emerald-700 dark:text-emerald-400 font-medium"
                          : "text-gray-500 dark:text-[#9396a8]"
                      }
                    >
                      At least 6 characters long
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${newPassword && confirmNewPassword && newPassword === confirmNewPassword
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-gray-200 text-gray-400 dark:bg-[#0e0f15] dark:text-[#6b6f84]"
                        }`}
                    >
                      <HiCheck className="w-3 h-3" />
                    </div>
                    <span
                      className={
                        newPassword && confirmNewPassword && newPassword === confirmNewPassword
                          ? "text-emerald-700 dark:text-emerald-400 font-medium"
                          : "text-gray-500 dark:text-[#9396a8]"
                      }
                    >
                      Passwords match
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-6 border-t border-gray-100 dark:border-[#222433] flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {passwordSaving ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <HiLockClosed className="w-4 h-4" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: NOTIFICATIONS SETTINGS */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-gray-100 dark:border-[#222433]">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Notification Preferences
                </h2>
                <p className="text-xs text-gray-500 dark:text-[#9396a8] mt-1">
                  Choose which alerts and email updates you want to receive.
                </p>
              </div>

              {notificationFeedback && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-3">
                  <HiCheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{notificationFeedback}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-[#222433] bg-transparent hover:bg-gray-50/50 dark:hover:bg-[#1c1d28]/50 transition">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Manuscript & Proposal Updates
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-[#9396a8] mt-0.5">
                      Receive notifications when titles or chapters are approved or revised.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyManuscript}
                    onChange={(e) => {
                      setNotifyManuscript(e.target.checked);
                      setNotificationFeedback("Preferences updated.");
                      setTimeout(() => setNotificationFeedback(null), 3000);
                    }}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-[#222433] bg-transparent hover:bg-gray-50/50 dark:hover:bg-[#1c1d28]/50 transition">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Defense Schedule Reminders
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-[#9396a8] mt-0.5">
                      Get automated reminders 24 hours and 1 hour before scheduled defenses.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyDefense}
                    onChange={(e) => {
                      setNotifyDefense(e.target.checked);
                      setNotificationFeedback("Preferences updated.");
                      setTimeout(() => setNotificationFeedback(null), 3000);
                    }}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-[#222433] bg-transparent hover:bg-gray-50/50 dark:hover:bg-[#1c1d28]/50 transition">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Adviser & Panel Annotations
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-[#9396a8] mt-0.5">
                      Alerts when comments and inline annotations are added to your document.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyReviews}
                    onChange={(e) => {
                      setNotifyReviews(e.target.checked);
                      setNotificationFeedback("Preferences updated.");
                      setTimeout(() => setNotificationFeedback(null), 3000);
                    }}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-[#222433] bg-transparent hover:bg-gray-50/50 dark:hover:bg-[#1c1d28]/50 transition">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Institutional Announcements
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-[#9396a8] mt-0.5">
                      Research ethics guidelines, deadline announcements, and repository digests.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyAnnouncements}
                    onChange={(e) => {
                      setNotifyAnnouncements(e.target.checked);
                      setNotificationFeedback("Preferences updated.");
                      setTimeout(() => setNotificationFeedback(null), 3000);
                    }}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VERIFICATION SETTINGS */}
          {activeTab === "verification" && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-gray-100 dark:border-[#222433]">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Institutional Verification
                </h2>
                <p className="text-xs text-gray-500 dark:text-[#9396a8] mt-1">
                  View and confirm your institution membership and verification credentials.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 dark:from-[#1c1d28] dark:via-[#15161e] dark:to-[#1c1d28] border border-blue-100 dark:border-[#222433] space-y-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                      <HiShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        Institutional Member
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400">
                          Active & Verified
                        </span>
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-[#9396a8] mt-0.5">
                        University Academic Directory
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200/60 dark:border-[#222433] text-xs">
                  <div>
                    <span className="text-gray-400 dark:text-[#6b6f84] block">Assigned Role</span>
                    <span className="font-semibold text-gray-900 dark:text-white mt-0.5 block">
                      {roleLabel}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 dark:text-[#6b6f84] block">Department</span>
                    <span className="font-semibold text-gray-900 dark:text-white mt-0.5 block truncate">
                      {department}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 dark:text-[#6b6f84] block">ID Reference</span>
                    <span className="font-semibold text-gray-900 dark:text-white mt-0.5 block">
                      {studentIdOrEmployeeId || "Verified by SSO"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: EXPERTISE (Adviser Only) */}
          {activeTab === "expertise" && userProfile?.role === "adviser" && (
            <div className="space-y-8 animate-fade-in">
              {/* Feedback Alert */}
              {profileFeedback && (
                <div
                  className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-fade-in ${profileFeedback.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400"
                    }`}
                >
                  {profileFeedback.type === "success" ? (
                    <HiCheckCircle className="w-5 h-5 shrink-0" />
                  ) : (
                    <HiExclamationCircle className="w-5 h-5 shrink-0" />
                  )}
                  <span className="font-medium">{profileFeedback.message}</span>
                </div>
              )}

              <div className="pb-4 border-b border-gray-100 dark:border-[#222433]">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <HiSparkles className="w-5 h-5 text-blue-500" />
                  Expertise
                </h2>
                <p className="text-xs text-gray-500 dark:text-[#9396a8] mt-1">
                  Manage the areas of research and technology you specialize in.
                  Your expertise helps CoreResearch recommend students whose research topics align with your specialization.
                </p>
              </div>

              {/* Selected Expertise Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Your Expertise</h3>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md">
                    {selectedExpertise.length} areas selected
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-gray-50/50 dark:bg-[#1c1d28]/60 border border-gray-100 dark:border-[#222433] min-h-[80px]">
                  {selectedExpertise.length === 0 ? (
                    <div className="w-full flex items-center justify-center text-sm text-gray-400 dark:text-[#6b6f84] italic">
                      No expertise selected yet.
                    </div>
                  ) : (
                    selectedExpertise.map((tag) => (
                      <div key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 shadow-xs transition-all group">
                        {tag}
                        <button 
                          onClick={() => toggleExpertise(tag)}
                          className="p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-500/40 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Category Browsing */}
              <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-[#222433]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Explore Expertise</h3>
                  <div className="relative w-full sm:w-64">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#6b6f84]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input 
                      type="text"
                      placeholder="Search expertise..."
                      value={expertiseSearchTerm}
                      onChange={(e) => setExpertiseSearchTerm(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 rounded-xl bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] text-sm text-gray-900 dark:text-[#f3f4f8] placeholder:text-gray-400 dark:placeholder:text-[#6b6f84] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  {Object.entries(EXPERTISE_CATEGORIES).map(([category, tags]) => {
                    const filteredTags = tags.filter(t => t.toLowerCase().includes(expertiseSearchTerm.toLowerCase()));
                    if (filteredTags.length === 0) return null;
                    
                    return (
                      <div key={category} className="space-y-3">
                        <h4 className="text-xs font-semibold tracking-wider text-gray-400 dark:text-[#6b6f84] uppercase">
                          {category}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {filteredTags.map((tag) => {
                            const isSelected = selectedExpertise.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleExpertise(tag)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                  isSelected
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : "bg-white dark:bg-[#1c1d28] border border-gray-200 dark:border-[#222433] text-gray-700 dark:text-[#9396a8] hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {Object.values(EXPERTISE_CATEGORIES).every(tags => tags.filter(t => t.toLowerCase().includes(expertiseSearchTerm.toLowerCase())).length === 0) && (
                    <div className="text-center py-8 text-sm text-gray-500 dark:text-[#9396a8]">
                      No expertise found matching "{expertiseSearchTerm}".
                    </div>
                  )}
                </div>
              </div>

              {/* Save Footer */}
              <div className="pt-6 border-t border-gray-100 dark:border-[#222433] flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {profileSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Photo Cropping / Adjusting Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={rawImageForCrop}
        onClose={() => setIsCropModalOpen(false)}
        onApplyCrop={handleApplyCrop}
      />
    </div>
  );
};
