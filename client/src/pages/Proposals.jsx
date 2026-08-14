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
  const isCoordinator =
    role === "research_coordinator" || role === "admin";

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
      : {}
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
          role === "student" && (
            <Link to="/proposals/new">
              <Button variant="primary" size="md">
                <PlusCircle className="w-4 h-4 mr-2" />
                New Proposal
              </Button>
            </Link>
          )
        }
      />

      {/* Group Context Banner */}
      {role === "student" && !groupLoading && (
        <Card className="p-4">
          {group ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Your Research Group
                </p>
                <p className="font-bold text-gray-900 dark:text-white text-sm">
                  {group.name}
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    · {group.members?.length ?? group.memberIds?.length ?? 0} members
                  </span>
                </p>
              </div>
              <Link
                to="/my-group"
                className="ml-auto text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                View Group <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">
                You are not assigned to a research group yet. Please contact your
                Research Coordinator.
              </p>
            </div>
          )}
        </Card>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Search + Filter Bar */}
      <Card className="p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by title or category..."
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

      {/* Proposal List */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
          Loading proposals...
        </div>
      ) : filteredProposals.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={FileText}
            title={filterStatus === "all" ? "No Proposals Yet" : `No ${PROPOSAL_STATUS_CONFIG[filterStatus]?.label ?? filterStatus} Proposals`}
            description={
              role === "student" && !group
                ? "Join a research group first before submitting a proposal."
                : role === "student"
                ? "Create your first title proposal for your research group."
                : "No proposals match the current filters."
            }
            action={
              role === "student" && group && filterStatus === "all" ? (
                <Link to="/proposals/new">
                  <Button variant="primary" size="sm">
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    Create Proposal
                  </Button>
                </Link>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProposals.map((p) => {
            const cfg = PROPOSAL_STATUS_CONFIG[p.status] ?? {
              label: p.status,
              variant: "gray",
            };
            const StatusIcon = STATUS_ICON[p.status] ?? Clock;
            const editable = canStudentEdit(p.status);
            const deletable = canStudentDelete(p.status);

            return (
              <Card key={p.id} hover className="flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Status + Category row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge
                      variant={cfg.variant}
                      className="flex items-center gap-1"
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </Badge>
                    {p.researchCategory && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                        {p.researchCategory}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-2 hover:text-primary dark:hover:text-blue-400 transition">
                    <Link to={`/proposals/${p.id}`}>{p.title}</Link>
                  </h3>

                  {/* Rationale preview */}
                  {p.rationale && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {p.rationale}
                    </p>
                  )}

                  {/* Needs Revision feedback snippet */}
                  {p.status === "needs_revision" && p.coordinatorFeedback && (
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-0.5">
                        Coordinator Feedback:
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 line-clamp-2">
                        {p.coordinatorFeedback}
                      </p>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>
                        Created:{" "}
                        <strong>{new Date(p.createdAt).toLocaleDateString()}</strong>
                      </span>
                    </div>
                    {p.revisionCount > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Rev: <strong>#{p.revisionCount}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions row */}
                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {p.groupName || "—"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View */}
                    <Link
                      to={`/proposals/${p.id}`}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>

                    {/* Edit — only for student + editable status */}
                    {role === "student" && editable && (
                      <button
                        onClick={() => navigate(`/proposals/new?edit=${p.id}`)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                        title="Edit Proposal"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete — only for student + draft */}
                    {role === "student" && deletable && (
                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        disabled={deletingId === p.id}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        title="Delete Draft"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <Link
                      to={`/proposals/${p.id}`}
                      className="text-xs font-bold text-primary dark:text-blue-400 flex items-center gap-1 hover:underline ml-1"
                    >
                      Details <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Proposals;
