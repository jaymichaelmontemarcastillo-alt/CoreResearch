// src/components/AuthLayout.jsx
import React from "react";
import { GraduationCap, UserCheck, Shield, Users } from "lucide-react";

export const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL — Dark Branding */}
      <div className="hidden lg:flex lg:w-[45%] auth-dark-panel relative flex-col justify-between p-10 xl:p-14">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            CoreResearch
          </span>
        </div>

        {/* Center content */}
        <div className="space-y-6">
          {/* Tagline */}
          <div className="space-y-4">
            <p className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight">
              "From the first title proposal to the last published page — all in one workspace."
            </p>
            <p className="text-sm text-gray-400">
              — Office of Graduate Research, prototype demo
            </p>
          </div>
        </div>

        {/* Role Badges */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
            Role-Based Access
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-sm text-gray-300 font-medium truncate">
                Student Portal
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm text-gray-300 font-medium truncate">
                Adviser Desk
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-sm text-gray-300 font-medium truncate">
                Panelist Rubrics
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-sm text-gray-300 font-medium truncate">
                Admin Office
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white dark:bg-slate-950">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              CoreResearch
            </span>
          </div>

          {/* Header */}
          {(title || subtitle) && (
            <div className="mb-8">
              {title && (
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Form content */}
          {children}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-800 text-center text-xs text-gray-400 dark:text-gray-500">
            © 2026 CoreResearch University Edition
          </div>
        </div>
      </div>
    </div>
  );
};
