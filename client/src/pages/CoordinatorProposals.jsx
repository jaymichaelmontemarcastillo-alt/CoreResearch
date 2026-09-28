// src/pages/CoordinatorProposals.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import {
  HiClipboardDocumentList,
  HiMagnifyingGlass,
  HiFunnel,
  HiClock,
  HiExclamationTriangle,
  HiCheckCircle,
  HiDocumentDuplicate,
  HiUsers,
  HiBookOpen,
  HiCalendarDays,
  HiShieldCheck,
  HiArrowRight,
  HiEye,
} from "react-icons/hi2";
import useTitleProposal from "../hooks/useTitleProposal";
import { PROPOSAL_STATUS_CONFIG } from "../types/proposal.types";

const STATUS_ICONS = {
  submitted: HiClock,
  needs_revision: HiExclamationTriangle,
  approved: HiCheckCircle,
  draft: HiDocumentDuplicate,
};

export const CoordinatorProposals = () => {
  const navigate = useNavigate();
  const { proposals, loading, error } = useTitleProposal({ coordinatorMode: true });

  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProposals = proposals.filter((p) => {
    const matchesStatus =
      filterStatus === "all" || p.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.groupName && p.groupName.toLowerCase().includes(q)) ||
      (p.courseName && p.courseName.toLowerCase().includes(q)) ||
      (p.sectionName && p.sectionName.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const counts = {
    submitted: proposals.filter((p) => p.status === "submitted").length,
    needs_revision: proposals.filter((p) => p.status === "needs_revision").length,
    approved: proposals.filter((p) => p.status === "approved").length,
  };

  const filterTabs = [
    { id: "all", label: `All (${proposals.length})` },
    { id: "submitted", label: `Submitted (${counts.submitted})` },
    { id: "needs_revision", label: `Needs Revision (${counts.needs_revision})` },
    { id: "approved", label: `Approved (${counts.approved})` },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        icon={HiClipboardDocumentList}
        title="Title Proposal Review"
        description="Review and evaluate research title proposals submitted by student groups."
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          {
            label: "Awaiting Review",
            count: counts.submitted,
            color: "amber",
            icon: HiClock,
          },
          {
            label: "Needs Revision",
            count: counts.needs_revision,
            color: "blue",
            icon: HiExclamationTriangle,
          },
          {
            label: "Approved",
            count: counts.approved,
            color: "emerald",
            icon: HiCheckCircle,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="p-5 flex items-start gap-4 rounded-2xl border border-gray-200/80 dark:border-[#222433] bg-white dark:bg-[#15161e] transition hover:border-gray-300 dark:hover:border-gray-700">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${stat.color}-100/50 dark:bg-${stat.color}-900/20 shrink-0`}>
                <Icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white leading-none mb-1">
                  {stat.count}
                </p>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-semibold flex items-center gap-2">
          <HiExclamationTriangle className="w-5 h-5" /> {error}
        </div>
      )}

      <div className="bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200/80 dark:border-[#222433] p-6 space-y-6">
        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full max-w-md">
            <Input
              placeholder="Search by title, group, course, or section..."
              icon={HiMagnifyingGlass}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <HiFunnel className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  filterStatus === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-[#1c1d28] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#222433]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4 text-gray-500">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Loading proposals...</span>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-[#1a1b26] flex items-center justify-center mx-auto mb-4">
              <HiClipboardDocumentList className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Proposals Found</h3>
            <p className="text-sm text-gray-500 dark:text-[#9396a8] mt-2 max-w-sm mx-auto">
              No proposals match the current filter. Proposals will appear here once students submit them.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-100 dark:border-[#222433] rounded-xl bg-gray-50/30 dark:bg-[#15161e]">
            <table className="w-full table-fixed text-left">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-[#1a1b26]/80 border-b border-gray-100 dark:border-[#222433]">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-[#9396a8] w-[35%]">
                  Proposal
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-[#9396a8] w-[25%]">
                  Group & Course
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-[#9396a8] w-[15%] text-center">
                  Section
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-[#9396a8] w-[15%] text-center">
                  Submitted
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-[#9396a8] w-[10%] text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#222433]/60">
              {filteredProposals.map((p) => {
                const cfg = PROPOSAL_STATUS_CONFIG[p.status] ?? {
                  label: p.status,
                  variant: "gray",
                };
                const StatusIcon = STATUS_ICONS[p.status] ?? HiClock;
                const canReview = p.status === "submitted";
                const dateToShow = p.lastSubmittedAt ?? p.submittedAt;

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-[#1a1b26]/50 transition-colors group"
                  >
                    <td className="px-6 py-5 align-top">
                      <div className="space-y-2">
                        <Badge variant={cfg.variant} className="flex items-center gap-1.5 w-fit">
                          <StatusIcon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </Badge>
                        <Link
                          to={`/proposals/${p.id}`}
                          className="font-bold text-base text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition line-clamp-2 block leading-snug"
                        >
                          {p.title}
                        </Link>
                        {p.researchCategory && (
                          <p className="text-sm text-gray-500 dark:text-[#9396a8] font-medium">
                            {p.researchCategory}
                          </p>
                        )}
                        {p.revisionCount > 0 && (
                          <span className="text-xs text-amber-500 font-bold tracking-wide">
                            Revision #{p.revisionCount}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="flex items-start gap-2 text-sm text-gray-900 dark:text-gray-200 font-semibold leading-snug">
                          <HiUsers className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          {p.groupName || "—"}
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-[#9396a8] font-medium leading-snug">
                          <HiBookOpen className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
                          {p.courseName || "—"}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 align-top text-center">
                      <span className="inline-block mt-1 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#1c1d28] px-2.5 py-1 rounded-md">
                        {p.sectionName || "—"}
                      </span>
                    </td>

                    <td className="px-6 py-5 align-top text-center">
                      <span className="inline-block mt-1 text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {dateToShow
                          ? new Date(dateToShow).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })
                          : "—"}
                      </span>
                    </td>

                    <td className="px-6 py-5 align-top text-center">
                      <div className="flex flex-col items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canReview ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              navigate(`/coordinator/proposals/${p.id}`)
                            }
                            className="w-full justify-center"
                          >
                            Review
                          </Button>
                        ) : (
                          <Link
                            to={`/coordinator/proposals/${p.id}`}
                            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1 w-full py-1.5"
                          >
                            View <HiArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoordinatorProposals;
