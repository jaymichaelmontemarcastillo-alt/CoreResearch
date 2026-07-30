// src/pages/Onboarding.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { User, Building, Contact, ArrowRight } from "lucide-react";
import api from "../services/api";

export const Onboarding = () => {
  const { currentUser, userProfile, updateProfileLocal } = useAuth();
  const navigate = useNavigate();

  const initialNameParts = currentUser?.displayName
    ? currentUser.displayName.split(" ")
    : ["", ""];
  const [firstName, setFirstName] = useState(initialNameParts[0] || "");
  const [lastName, setLastName] = useState(initialNameParts.slice(1).join(" ") || "");
  const [role, setRole] = useState(userProfile?.role || "student");
  const [department, setDepartment] = useState(userProfile?.department || "Computer Studies");
  const [studentIdOrEmployeeId, setStudentIdOrEmployeeId] = useState(userProfile?.studentIdOrEmployeeId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName || !lastName || !studentIdOrEmployeeId) {
      return setError("Please complete all required profile fields.");
    }

    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      const first_name = firstName.trim();
      const last_name = lastName.trim();

      await api.post("/auth/register", {
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
      });

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="First Name" type="text" placeholder="e.g. Alex" icon={User} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          <Input label="Last Name" type="text" placeholder="e.g. Rivera" icon={User} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>

        {/* Role Picker */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Your Role</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {["student", "adviser", "panelist", "admin"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRole(item)}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                  role === item
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600"
                }`}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Department / College" type="text" placeholder="e.g. Computer Studies" icon={Building} value={department} onChange={(e) => setDepartment(e.target.value)} required />
          <Input label={role === "student" ? "Student ID Number" : "Employee ID Number"} type="text" placeholder="e.g. 2024-1002" icon={Contact} value={studentIdOrEmployeeId} onChange={(e) => setStudentIdOrEmployeeId(e.target.value)} required />
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={loading}>
          Complete Registration <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </form>
    </AuthLayout>
  );
};
