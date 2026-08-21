// src/pages/Unauthorized.jsx
import React from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/ui/Button";
import { HiShieldExclamation, HiArrowLeft } from "react-icons/hi2";
import { useAuth } from "../context/AuthContext";

export const Unauthorized = () => {
  const { role } = useAuth();

  return (
    <AuthLayout title="Access Denied">
      <div className="text-center space-y-5 py-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center mx-auto">
          <HiShieldExclamation className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Permission Required</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
            Your account role (
            <span className="text-red-500 dark:text-red-400 font-semibold">
              {role || "Guest"}
            </span>
            ) does not have permission to access this portal.
          </p>
        </div>

        <Link to="/dashboard">
          <Button variant="outline" className="w-full">
            <HiArrowLeft className="w-4 h-4 mr-2" /> Return to Dashboard
          </Button>
        </Link>
      </div>
    </AuthLayout>
  );
};
