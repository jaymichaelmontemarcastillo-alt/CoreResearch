import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FileText, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SubmitProposal = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [objectives, setObjectives] = useState('');
  const [keywords, setKeywords] = useState('');
  const [department, setDepartment] = useState(userProfile?.department || 'Computer Science');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/proposals', {
        title,
        abstract,
        objectives,
        keywords,
        department
      });
      navigate('/proposals');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit proposal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-left">
      <div className="flex items-center justify-between">
        <Link to="/proposals" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to Proposals
        </Link>
      </div>

      <Card className="border-slate-800 space-y-6">
        <div className="border-b border-slate-800/80 pb-4">
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" /> Submit Research Title Proposal
          </h1>
          <p className="text-xs text-slate-400 mt-1">Submit your proposed research topic for department chair and adviser evaluation.</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Research Title"
            type="text"
            placeholder="e.g. Smart IoT Moisture Sensing Platform for Precision Agriculture"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Abstract / Topic Description *
            </label>
            <textarea
              rows={5}
              className="w-full glass-input rounded-xl text-sm p-3"
              placeholder="Provide a comprehensive summary of your research background, problem statement, proposed methodology, and expected outcomes..."
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Specific Research Objectives
            </label>
            <textarea
              rows={3}
              className="w-full glass-input rounded-xl text-sm p-3"
              placeholder="1. Build hardware prototype&#10;2. Measure latency under load&#10;3. Compare accuracy with manual methods"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Keywords (comma separated)"
              type="text"
              placeholder="e.g. IoT, Agriculture, Sensors, Embedded"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />

            <Input
              label="Department / Program"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Link to="/proposals">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary" isLoading={loading}>
              <Send className="w-4 h-4 mr-2" /> Submit Proposal
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
