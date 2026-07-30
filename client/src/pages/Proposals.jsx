// src/pages/Proposals.jsx
import React, { useState } from "react";
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
  XCircle,
  User,
  ArrowRight,
  Filter,
  Edit,
  Trash2,
  Eye,
  Calendar,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTitleProposal } from "../hooks/useTitleProposal";

export const Proposals = () => {
  const { currentUser, userProfile, role } = useAuth();
  const studentId = currentUser?.uid || userProfile?.uid;
  const groupId = userProfile?.groupId || studentId;

  // Use Firestore Service Layer via custom hook
  const {
    proposals,
    loading,
    error,
    deleteProposal,
    canEdit,
    canDelete,
  } = useTitleProposal(studentId, undefined, groupId);

  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState("");

  const statusConfig = {
    pending: { label: "Pending Review", variant: "amber", icon: Clock },
    approved: { label: "Approved", variant: "emerald", icon: CheckCircle2 },
    revisions_required: { label: "Revisions Required", variant: "blue", icon: AlertTriangle },
    rejected: { label: "Rejected", variant: "rose", icon: XCircle },
  };

  const filteredProposals = proposals.filter((p) => {
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.researchCategory && p.researchCategory.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.studentName && p.studentName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete proposal: "${title}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteProposal(id);
      setToast("Title proposal deleted successfully.");
    } catch (err) {
      alert(`Error deleting proposal: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast("")} />
      )}

      {/* Page Header */}
      <PageHeader
        icon={FileText}
        title="Student Title Proposals"
        description="Manage and submit research title proposals for your research group."
        actions={
          role === "student" && (
            <Link to="/proposals/new">
              <Button variant="primary" size="md">
                <PlusCircle className="w-4 h-4 mr-2" /> Submit New Proposal
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

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by title, category, or student name..."
            icon={Search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          {[
            { id: "all", label: "All" },
            { id: "pending", label: "Pending" },
            { id: "approved", label: "Approved" },
            { id: "revisions_required", label: "Revisions Required" },
            { id: "rejected", label: "Rejected" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition ${
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

      {/* Proposals List Grid */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 dark:text-gray-500">
          Loading title proposals...
        </div>
      ) : filteredProposals.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={FileText}
            title="No Proposals Found"
            description={
              role === "student"
                ? "You have not submitted any title proposals yet."
                : "No proposals match the selected filters."
            }
            action={
              role === "student" && (
                <Link to="/proposals/new">
                  <Button variant="primary" size="sm">
                    Submit Title Proposal
                  </Button>
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProposals.map((p) => {
            const StatusIcon = statusConfig[p.status]?.icon || Clock;
            const editable = canEdit(p);
            const deletable = canDelete(p);

            return (
              <Card key={p.id} hover className="flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={statusConfig[p.status]?.variant || "amber"} className="flex items-center gap-1">
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig[p.status]?.label || p.status}
                    </Badge>
                    {p.researchCategory && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
                        {p.researchCategory}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-2 hover:text-primary dark:hover:text-blue-400 transition">
                    <Link to={`/proposals/${p.id}`}>{p.title}</Link>
                  </h3>

                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                    {p.rationale || p.abstract}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>Submitted: <strong>{new Date(p.submittedAt).toLocaleDateString()}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Updated: <strong>{new Date(p.updatedAt || p.submittedAt).toLocaleDateString()}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {p.studentName || p.submittedBy || "Student"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Button */}
                    <Link
                      to={`/proposals/${p.id}`}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>

                    {/* Edit Button (Only allowed if pending or revisions_required) */}
                    {role === "student" && editable && (
                      <button
                        onClick={() => navigate(`/proposals/new?edit=${p.id}`)}
                        className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                        title="Edit Proposal"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete Button (Only allowed if pending) */}
                    {role === "student" && deletable && (
                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        disabled={deletingId === p.id}
                        className="p-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        title="Delete Proposal"
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
