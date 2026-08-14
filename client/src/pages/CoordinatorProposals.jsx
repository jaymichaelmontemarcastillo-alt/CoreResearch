// src/pages/CoordinatorProposals.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import {
  ClipboardList,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileEdit,
  Users,
  BookOpen,
  Calendar,
  Shield,
  ArrowRight,
  Eye,
} from "lucide-react";
import useTitleProposal from "../hooks/useTitleProposal";
import { PROPOSAL_STATUS_CONFIG } from "../types/proposal.types";

const STATUS_ICONS = {
  submitted: Clock,
  needs_revision: AlertTriangle,
  approved: CheckCircle2,
  draft: FileEdit,
};

export const CoordinatorProposals = () => {
  const navigate = useNavigate();
  const { proposals, loading, error } = useTitleProposal({ coordinatorMode: true });

  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Filter ──────────────────────────────────────────────────────────────────
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

  // Summary counts
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
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={ClipboardList}
        title="Title Proposal Review"
        description="Review and evaluate research title proposals submitted by student groups."
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Awaiting Review",
            count: counts.submitted,
            color: "amber",
            icon: Clock,
          },
          {
            label: "Needs Revision",
            count: counts.needs_revision,
            color: "blue",
            icon: AlertTriangle,
          },
          {
            label: "Approved",
            count: counts.approved,
            color: "emerald",
            icon: CheckCircle2,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4 text-center">
              <div
                className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}
              >
                <Icon
                  className={`w-5 h-5 text-${stat.color}-600 dark:text-${stat.color}-400`}
                />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.count}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {stat.label}
              </p>
            </Card>
          );
        })}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Search + Filter */}
      <Card className="p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by proposal title, group, course, or section..."
            icon={Search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filterStatus === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Proposal Table */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
          Loading proposals...
        </div>
      ) : filteredProposals.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={ClipboardList}
            title="No Proposals Found"
            description="No proposals match the current filter. Proposals will appear here once students submit them."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <span>Proposal</span>
            <span>Group &amp; Course</span>
            <span>Section</span>
            <span>Submitted</span>
            <span>Action</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {filteredProposals.map((p) => {
              const cfg = PROPOSAL_STATUS_CONFIG[p.status] ?? {
                label: p.status,
                variant: "gray",
              };
              const StatusIcon = STATUS_ICONS[p.status] ?? Clock;
              const canReview = p.status === "submitted";
              const dateToShow = p.lastSubmittedAt ?? p.submittedAt;

              return (
                <div
                  key={p.id}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 md:gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition"
                >
                  {/* Proposal title + status */}
                  <div className="space-y-1.5">
                    <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </Badge>
                    <Link
                      to={`/proposals/${p.id}`}
                      className="font-semibold text-sm text-gray-900 dark:text-white hover:text-primary dark:hover:text-blue-400 transition line-clamp-2"
                    >
                      {p.title}
                    </Link>
                    {p.researchCategory && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {p.researchCategory}
                      </p>
                    )}
                    {p.revisionCount > 0 && (
                      <span className="text-xs text-amber-500 font-medium">
                        Revision #{p.revisionCount}
                      </span>
                    )}
                  </div>

                  {/* Group + Course */}
                  <div className="flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 font-medium">
                      <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                      {p.groupName || "—"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      {p.courseName || "—"}
                    </div>
                  </div>

                  {/* Section */}
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {p.sectionName || "—"}
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    {dateToShow
                      ? new Date(dateToShow).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/proposals/${p.id}`}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    {canReview ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          navigate(`/coordinator/proposals/${p.id}`)
                        }
                      >
                        <Shield className="w-3.5 h-3.5 mr-1.5" />
                        Review
                      </Button>
                    ) : (
                      <Link
                        to={`/coordinator/proposals/${p.id}`}
                        className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1 hover:text-primary transition"
                      >
                        View <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default CoordinatorProposals;
