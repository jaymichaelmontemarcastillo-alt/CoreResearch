// src/components/admin/analytics/AdminQuickNavCards.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const navCards = [
  {
    category: 'Research Hub',
    categoryColor: 'text-blue-600 dark:text-blue-400',
    title: 'Manuscript Management & Workflow',
    description:
      'Review new uploads, ongoing revisions, approve camera-ready copies, award Best Thesis, and edit defense grades.',
    linkText: 'Manage Manuscripts →',
    linkTo: '/admin/manuscripts',
  },
  {
    category: 'Intelligence',
    categoryColor: 'text-purple-600 dark:text-purple-400',
    title: 'Data Analytics & Flow',
    description:
      'Track the institutional research lifecycle flow, completion funnel, program comparisons, and adviser workloads.',
    linkText: 'View Analytics Flow →',
    linkTo: '/admin/analytics',
  },
  {
    category: 'Faculty',
    categoryColor: 'text-indigo-600 dark:text-indigo-400',
    title: 'Adviser & Faculty Profiles',
    description:
      'Supervise adviser research specializations, active advisee quotas, and assigned research cohorts.',
    linkText: 'Manage Advisers →',
    linkTo: '/admin/advisers',
  },
  {
    category: 'Access',
    categoryColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'User & Student Accounts',
    description:
      'Manage institutional accounts, assign roles, approve registrations, and handle department affiliations.',
    linkText: 'Manage Users →',
    linkTo: '/admin/users',
  },
];

export const AdminQuickNavCards = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
      {navCards.map((card, index) => (
        <div
          key={index}
          className="bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200/80 dark:border-[#222433] p-4 sm:p-5 flex flex-col justify-between gap-2.5 hover:border-gray-300 dark:hover:border-gray-600 transition shadow-xs group"
        >
          <div className="space-y-1">
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${card.categoryColor}`}
            >
              {card.category}
            </span>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {card.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#9396a8] leading-relaxed line-clamp-2">
              {card.description}
            </p>
          </div>
          <Link
            to={card.linkTo}
            className={`text-xs font-semibold ${card.categoryColor} hover:underline inline-flex items-center gap-1 pt-1`}
          >
            {card.linkText}
          </Link>
        </div>
      ))}
    </div>
  );
};

export default AdminQuickNavCards;
