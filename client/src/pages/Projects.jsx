// src/pages/Projects.jsx
import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Toast } from "../components/ui/Toast";
import { Select } from "../components/ui/Select";
import { FolderGit2, UserCheck, User, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export const Projects = () => {
  const { role } = useAuth();
  const [projects, setProjects] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [selectedAdviserId, setSelectedAdviserId] = useState("");
  const [toast, setToast] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const projRes = await api.get("/projects");
      if (projRes.data && projRes.data.data) {
        setProjects(projRes.data.data);
      }

      if (role === "admin") {
        const advRes = await api.get("/users", { params: { role: "adviser" } });
        if (advRes.data && advRes.data.data) {
          setAdvisers(advRes.data.data);
        }
      }
    } catch (err) {
      console.error("[Projects] fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [role]);

  const handleAssignAdviserSubmit = async (projectId) => {
    if (!selectedAdviserId) return alert("Please select an adviser from the list.");

    try {
      await api.patch(`/projects/${projectId}/adviser`, { adviserId: selectedAdviserId });
      setToast("Adviser assigned successfully!");
      setAssigningId(null);
      await fetchData();
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FolderGit2}
        title="Research Projects & Adviser Assignment"
        description="Manage active research projects, assign faculty advisers, and monitor research progress."
      />

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast("")} />
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-400 dark:text-gray-500">
          Loading research projects...
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={FolderGit2}
            title="No Active Research Projects"
            description="Once a title proposal is approved, a research project lifecycle is initiated."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((p) => (
            <Card key={p.id} className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="emerald">IN PROGRESS</Badge>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{p.department}</span>
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                  {p.title}
                </h3>

                {/* Team & Adviser Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                    <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3 text-primary" /> Student Researcher
                    </div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{p.studentName}</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                    <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-emerald-500" /> Assigned Adviser
                    </div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {p.adviserName || "Unassigned"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Adviser Assignment Bar */}
              {role === "admin" && (
                <div className="pt-3 border-t border-gray-200 dark:border-slate-800">
                  {assigningId === p.id ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Select
                          value={selectedAdviserId}
                          onChange={(e) => setSelectedAdviserId(e.target.value)}
                        >
                          <option value="">Select Faculty Adviser...</option>
                          {advisers.map((adv) => (
                            <option key={adv.uid} value={adv.uid}>
                              {adv.fullName} ({adv.department})
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Button size="sm" variant="success" onClick={() => handleAssignAdviserSubmit(p.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAssigningId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Adviser: <strong className="text-gray-800 dark:text-gray-200">{p.adviserName || "None"}</strong>
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setAssigningId(p.id);
                          setSelectedAdviserId(p.adviserId || "");
                        }}
                      >
                        Assign / Change Adviser
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Link
                  to="/manuscripts"
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
                >
                  View Manuscripts & Files <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
