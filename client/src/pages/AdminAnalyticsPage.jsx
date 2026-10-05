// src/pages/AdminAnalyticsPage.jsx
import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { AdminAnalyticsSection } from '../components/admin/analytics/AdminAnalyticsSection';
import { Card } from '../components/ui/Card';
import {
  HiChartBar,
  HiArrowTrendingUp,
  HiDocumentChartBar,
  HiUsers,
  HiAcademicCap,
  HiCheckBadge,
  HiArrowPathRoundedSquare,
} from 'react-icons/hi2';

export const AdminAnalyticsPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={HiChartBar}
        title="Data Analytics & Research Intelligence Flow"
        description="Comprehensive institutional metrics, thesis completion funnel, research status distribution, program comparisons, and faculty workload balance."
      />

      {/* Research Lifecycle Flow Pipeline */}
      <Card className="p-5 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-[#15161e] dark:via-[#1c1d28] dark:to-[#181924] border border-blue-100 dark:border-[#222433]">
        <div className="flex items-center gap-2 mb-3">
          <HiArrowPathRoundedSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            Research Lifecycle Stage Progression Flow
          </h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-[#9396a8] mb-4">
          End-to-end milestone progression tracking student cohorts from title proposal inception to institutional repository publication.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {[
            { step: '01', title: 'Title Proposals', desc: 'Submission & Coordinator Check', color: 'bg-blue-500' },
            { step: '02', title: 'Adviser Matching', desc: 'Faculty Assignment & Acceptance', color: 'bg-indigo-500' },
            { step: '03', title: 'Manuscript Drafts', desc: 'Collaborative Ch. 1-5 Drafting', color: 'bg-cyan-500' },
            { step: '04', title: 'Defense Schedules', desc: 'Oral Presentation Panels', color: 'bg-amber-500' },
            { step: '05', title: 'Digital Rubrics', desc: 'Weighted Multi-Criteria Grading', color: 'bg-emerald-500' },
            { step: '06', title: 'Repository Publish', desc: 'Camera-Ready Archival', color: 'bg-purple-500' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-white/80 dark:bg-[#1c1d28]/80 border border-gray-200/60 dark:border-[#2b2d3f] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  {item.step}
                </span>
                <span className={`w-2 h-2 rounded-full ${item.color}`} />
              </div>
              <div className="mt-2">
                <div className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                  {item.title}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-[#9396a8] mt-0.5 leading-snug">
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Main Analytics Engine (Cards, Filters & Interactive SVG Charts) */}
      <AdminAnalyticsSection />
    </div>
  );
};

export default AdminAnalyticsPage;
