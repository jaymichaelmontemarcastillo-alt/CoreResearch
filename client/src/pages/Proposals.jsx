// src/pages/Proposals.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Toast } from "../components/ui/Toast";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import {
  FileText,
  PlusCircle,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Users,
  Filter,
  ArrowRight,
  FileEdit,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { groupService } from "../services/group.service";
import useTitleProposal from "../hooks/useTitleProposal";
import { PROPOSAL_STATUS_CONFIG } from "../types/proposal.types";

// Badge variant mapping for our ui/Badge component
const STATUS_ICON = {
  draft: FileEdit,
  submitted: Clock,
  needs_revision: AlertTriangle,
  approved: CheckCircle2,
};

export const Proposals = () => {
  const { currentUser, userProfile, role } = useAuth();
  const navigate = useNavigate();

  // ── Resolve the user's groups (student or adviser) ────────────────────────
  const [group, setGroup] = useState(null); // student's primary group
  const [adviserGroupIds, setAdviserGroupIds] = useState(undefined); // adviser's assigned groups
  const [groupLoading, setGroupLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      const uid = currentUser?.uid || userProfile?.uid;
      if (!uid) {
        setGroupLoading(false);
        return;
      }

      try {
        if (role === "student") {
          const g = await groupService.getGroupByStudentId(uid);
          setGroup(g);
        } else if (role === "adviser") {
          const groups = await groupService.getGroupsByAdviserId(uid);
          setAdviserGroupIds(groups.map((g) => g.id));
        }
      } catch (err) {
        console.error("Failed to load groups:", err);
      } finally {
        setGroupLoading(false);
      }
    };
    fetchGroups();
  }, [role, currentUser, userProfile]);

  // For coordinator/admin, use coordinator mode (see all submitted proposals)
  const isCoordinator = role === "research_coordinator" || role === "admin";
  const isStudent = role === "student";
  const noGroupAssigned = isStudent && !group && !groupLoading;

  const {
    proposals,
    loading,
    error,
    deleteProposal,
    canStudentDelete,
    canStudentEdit,
  } = useTitleProposal(
    isCoordinator
      ? { coordinatorMode: true }
      : role === "adviser"
      ? { adviserGroupIds: adviserGroupIds || [] }
      : group
      ? { groupId: group.id }
      : { fetchNone: noGroupAssigned }
  );

  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState("");

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filteredProposals = proposals.filter((p) => {
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.researchCategory && p.researchCategory.toLowerCase().includes(q)) ||
      (p.groupName && p.groupName.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete proposal: "${title}"?`)) return;
    setDeletingId(id);
    try {
      await deleteProposal(id);
      setToast("Proposal deleted successfully.");
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Filter tabs ─────────────────────────────────────────────────────────────
  const filterTabs = [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "submitted", label: "Submitted" },
    { id: "needs_revision", label: "Needs Revision" },
    { id: "approved", label: "Approved" },
  ];

  const isLoading = groupLoading || loading;

  // Coordinator redirects to dedicated coordinator page
  if (isCoordinator) {
    navigate("/coordinator/proposals", { replace: true });
    return null;
  }

  // Define table columns based on Google Classroom-inspired clean look
  const tableColumns = [
    { label: "Proposal", className: "w-full min-w-[300px]" },
    { label: "Group", className: "min-w-[150px]" },
    { label: "Status", className: "min-w-[140px]" },
    { label: "Created Date", className: "min-w-[130px]" },
    { label: "Action", className: "text-right min-w-[140px]" },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast("")} />
      )}

      {/* Page Header */}
      <PageHeader
        icon={FileText}
        title="My Research Proposals"
        description={
          group
            ? `Proposals submitted by ${group.name}`
            : role === "adviser"
            ? "Proposals submitted by your assigned research groups."
            : "Create and manage your research title proposals."
        }
        actions={
          role === "student" && group && (
            <Link to="/proposals/new">
              <Button variant="primary" size="md">
                <PlusCircle className="w-4 h-4 mr-2" />
                New Proposal
              </Button>
            </Link>
          )
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Empty State for Students without a group */}
      {noGroupAssigned ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 md:p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-20 h-20 bg-blue-50 dark:bg-slate-800/60 rounded-full flex items-center justify-center mb-6">
            <Users className="w-8 h-8 text-blue-500 dark:text-blue-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            You're not in a research group yet
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 text-sm leading-relaxed">
            You must be part of an assigned research group before you can create and manage research title proposals. 
            Please contact your Research Coordinator.
          </p>
          <Link to="/my-group">
            <Button variant="primary" size="md">
              View Group Status
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Search + Filter Bar (Redesigned as independent controls) */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-800">
            <div className="w-full md:max-w-md">
              <Input
                placeholder="Search by title or category..."
                icon={Search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white dark:bg-slate-900 shadow-sm"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              <Filter className="w-4 h-4 text-gray-400 shrink-0 mr-1 hidden sm:block" />
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    filterStatus === tab.id
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Proposal List */}
          {isLoading ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm flex flex-col items-center">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              Loading proposals...
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="py-12 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 border-dashed">
              <EmptyState
                icon={FileText}
                title={filterStatus === "all" ? "No Proposals Yet" : `No ${PROPOSAL_STATUS_CONFIG[filterStatus]?.label ?? filterStatus} Proposals`}
                description={
                  role === "student"
                    ? "Create your first title proposal for your research group."
                    : "No proposals match the current filters."
                }
                action={
                  role === "student" && filterStatus === "all" ? (
                    <Link to="/proposals/new">
                      <Button variant="primary" size="sm">
                        <PlusCircle className="w-4 h-4 mr-1.5" />
                        Create Proposal
                      </Button>
                    </Link>
                  ) : null
                }
              />
            </div>
          ) : (
            <DataTable columns={tableColumns} className="shadow-sm">
              {filteredProposals.map((p) => {
                const cfg = PROPOSAL_STATUS_CONFIG[p.status] ?? {
                  label: p.status,
                  variant: "gray",
                };
                const StatusIcon = STATUS_ICON[p.status] ?? Clock;
                const editable = canStudentEdit(p.status);
                const deletable = canStudentDelete(p.status);

                return (
                  <TableRow key={p.id} className="group">
                    <TableCell className="max-w-[300px]">
                      <div className="space-y-1">
                        <Link 
                          to={`/proposals/${p.id}`}
                          className="text-[14px] font-semibold text-gray-900 dark:text-white line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {p.title}
                        </Link>
                        {p.researchCategory && (
                          <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 mt-1">
                            {p.researchCategory}
                          </span>
                        )}
                        {/* Needs Revision feedback snippet */}
                        {p.status === "needs_revision" && p.coordinatorFeedback && (
                          <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30">
                            <p className="text-[11px] font-medium text-red-600 dark:text-red-400 line-clamp-1">
                              Feedback: {p.coordinatorFeedback}
                            </p>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium truncate max-w-[120px]">
                          {p.groupName || "—"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={cfg.variant}
                        className="flex w-max items-center gap-1 text-[11px] px-2 py-0.5"
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {new Date(p.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      {p.revisionCount > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-500 mt-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>Rev #{p.revisionCount}</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* View */}
                        <Link
                          to={`/proposals/${p.id}`}
                          className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {/* Edit */}
                        {role === "student" && editable && (
                          <button
                            onClick={() => navigate(`/proposals/new?edit=${p.id}`)}
                            className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Proposal"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete */}
                        {role === "student" && deletable && (
                          <button
                            onClick={() => handleDelete(p.id, p.title)}
                            disabled={deletingId === p.id}
                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </DataTable>
          )}
        </>
      )}
    </div>
  );
};

export default Proposals;
