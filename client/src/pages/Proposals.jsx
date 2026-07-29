// src/pages/Proposals.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Proposals = () => {
  const { role } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const response = await api.get("/proposals");
      if (response.data && response.data.data) {
        setProposals(response.data.data);
      }
    } catch (error) {
      console.error("[Proposals] Error fetching proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

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
      p.abstract.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.studentName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={FileText}
        title="Research Title Proposals"
        description="Submit, evaluate, and track university student research proposal applications."
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

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by title, abstract keyword, or student name..."
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
            { id: "revisions_required", label: "Revisions" },
            { id: "rejected", label: "Rejected" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
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
          Loading proposal directory...
        </div>
      ) : filteredProposals.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={FileText}
            title="No Proposals Found"
            description={
              role === "student"
                ? "You have not submitted any title proposals yet."
                : "No student proposals match the selected filters."
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
            return (
              <Card key={p.id} hover className="flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={statusConfig[p.status]?.variant || "amber"} className="flex items-center gap-1">
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig[p.status]?.label || p.status}
                    </Badge>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(p.submittedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-2 hover:text-primary dark:hover:text-blue-400 transition">
                    {p.title}
                  </h3>

                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                    {p.abstract}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {p.studentName}
                    </span>
                  </div>

                  <Link
                    to={`/proposals/${p.id}`}
                    className="text-xs font-bold text-primary dark:text-blue-400 flex items-center gap-1 hover:underline"
                  >
                    View Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
