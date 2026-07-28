import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FolderGit2, UserCheck, User, PlusCircle, CheckCircle2, Search, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const Projects = () => {
  const { role } = useAuth();
  const [projects, setProjects] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);
  const [selectedAdviserId, setSelectedAdviserId] = useState('');
  const [toast, setToast] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const projRes = await api.get('/projects');
      if (projRes.data && projRes.data.data) {
        setProjects(projRes.data.data);
      }

      if (role === 'admin') {
        const advRes = await api.get('/users', { params: { role: 'adviser' } });
        if (advRes.data && advRes.data.data) {
          setAdvisers(advRes.data.data);
        }
      }
    } catch (err) {
      console.error('[Projects] fetch data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [role]);

  const handleAssignAdviserSubmit = async (projectId) => {
    if (!selectedAdviserId) return alert('Please select an adviser from the list.');

    try {
      await api.patch(`/projects/${projectId}/adviser`, { adviserId: selectedAdviserId });
      setToast('Adviser assigned successfully!');
      setTimeout(() => setToast(''), 3500);
      setAssigningId(null);
      await fetchData();
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <FolderGit2 className="w-6 h-6 text-emerald-400" /> Research Projects & Adviser Assignment
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage active research projects, assign faculty advisers, and monitor research progress.</p>
        </div>
      </div>

      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading research projects...</div>
      ) : projects.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <FolderGit2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Active Research Projects</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Once a title proposal is approved, a research project lifecycle is initiated.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((p) => (
            <Card key={p.id} className="border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="emerald">IN PROGRESS</Badge>
                  <span className="text-[11px] text-slate-500">{p.department}</span>
                </div>

                <h3 className="text-base font-bold text-white leading-snug">{p.title}</h3>

                {/* Team & Adviser Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <User className="w-3 h-3 text-blue-400" /> Student Researcher
                    </div>
                    <div className="font-semibold text-slate-200 mt-0.5">{p.studentName}</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-emerald-400" /> Assigned Adviser
                    </div>
                    <div className="font-semibold text-slate-200 mt-0.5">{p.adviserName || 'Unassigned'}</div>
                  </div>
                </div>
              </div>

              {/* Admin Adviser Assignment Bar */}
              {role === 'admin' && (
                <div className="pt-3 border-t border-slate-800/80">
                  {assigningId === p.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedAdviserId}
                        onChange={(e) => setSelectedAdviserId(e.target.value)}
                        className="glass-input flex-1 text-xs py-1.5 px-2 rounded-lg bg-slate-900"
                      >
                        <option value="">Select Faculty Adviser...</option>
                        {advisers.map((adv) => (
                          <option key={adv.uid} value={adv.uid}>
                            {adv.fullName} ({adv.department})
                          </option>
                        ))}
                      </select>
                      <Button size="sm" variant="success" onClick={() => handleAssignAdviserSubmit(p.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAssigningId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Adviser: <strong className="text-white">{p.adviserName || 'None'}</strong></span>
                      <Button size="sm" variant="secondary" onClick={() => { setAssigningId(p.id); setSelectedAdviserId(p.adviserId || ''); }}>
                        Assign / Change Adviser
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Link to="/manuscripts" className="text-xs font-bold text-emerald-400 flex items-center gap-1 hover:underline">
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
