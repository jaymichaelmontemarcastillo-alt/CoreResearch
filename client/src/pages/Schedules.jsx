import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  PlusCircle, 
  CheckCircle2, 
  GraduationCap, 
  Award,
  Video
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Schedules = () => {
  const { role } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [panelists, setPanelists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Schedule Form State
  const [projectTitle, setProjectTitle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [defenseType, setDefenseType] = useState('proposal_defense');
  const [date, setDate] = useState('2026-08-14');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');
  const [venue, setVenue] = useState('Room 402, Engineering Hall');
  const [selectedPanelistIds, setSelectedPanelistIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await api.get('/schedules');
      if (res.data && res.data.data) {
        setSchedules(res.data.data);
      }

      if (role === 'admin') {
        const panRes = await api.get('/users', { params: { role: 'panelist' } });
        if (panRes.data && panRes.data.data) {
          setPanelists(panRes.data.data);
        }
      }
    } catch (err) {
      console.error('[Schedules] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [role]);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!projectTitle || !date || !startTime) return alert('Please complete required schedule fields.');

    setSubmitting(true);
    try {
      await api.post('/schedules', {
        projectTitle,
        studentName,
        defenseType,
        date,
        startTime,
        endTime,
        venue,
        panelistIds: selectedPanelistIds
      });

      setToast('Defense presentation scheduled successfully!');
      setTimeout(() => setToast(''), 3500);
      setModalOpen(false);
      setProjectTitle('');
      setStudentName('');
      await fetchSchedules();
    } catch (err) {
      alert(`Schedule creation error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const togglePanelistSelection = (pid) => {
    setSelectedPanelistIds(prev => 
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
    );
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-400" /> Defense Presentation Calendar & Schedules
          </h1>
          <p className="text-xs text-slate-400 mt-1">Schedule research defenses, assign panel evaluation committees, and view presentation venues.</p>
        </div>

        {role === 'admin' && (
          <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-2" /> Schedule Defense Presentation
          </Button>
        )}
      </div>

      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading defense schedule...</div>
      ) : schedules.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Defenses Scheduled</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Upcoming proposal and final defense presentations will be displayed on this calendar.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schedules.map((sch) => (
            <Card key={sch.id} className="border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={sch.defenseType === 'final_defense' ? 'emerald' : 'purple'}>
                    {sch.defenseType === 'final_defense' ? 'FINAL DEFENSE' : 'PROPOSAL DEFENSE'}
                  </Badge>
                  <Badge variant="blue">SCHEDULED</Badge>
                </div>

                <h3 className="text-base font-bold text-white leading-snug">{sch.projectTitle}</h3>
                
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-slate-300">
                    <GraduationCap className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Candidate: <strong className="text-white">{sch.studentName}</strong></span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{sch.date} ({sch.startTime} - {sch.endTime})</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">{sch.venue}</span>
                  </div>
                </div>

                {sch.panelistNames && sch.panelistNames.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-purple-400" /> Defense Panel Committee:
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {sch.panelistNames.map((pname, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium">
                          {pname}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Defense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" /> Schedule Defense Event
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <Input
                label="Research Title / Project"
                type="text"
                placeholder="e.g. Smart IoT Moisture Sensing System"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                required
              />

              <Input
                label="Student Candidate Name"
                type="text"
                placeholder="e.g. Alex Rivera"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Defense Stage</label>
                  <select
                    value={defenseType}
                    onChange={(e) => setDefenseType(e.target.value)}
                    className="w-full glass-input rounded-xl text-xs py-2 px-3 bg-slate-900"
                  >
                    <option value="proposal_defense">Proposal Defense</option>
                    <option value="final_defense">Final Defense</option>
                  </select>
                </div>

                <Input
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
                <Input
                  label="End Time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Venue / Hybrid Zoom Link"
                type="text"
                placeholder="e.g. Room 402 or Zoom link..."
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                required
              />

              {/* Panelist Selector Checkboxes */}
              {panelists.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Assign Panelists (Select 2-3)
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-900 rounded-xl border border-slate-800">
                    {panelists.map((pan) => (
                      <label key={pan.uid} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={selectedPanelistIds.includes(pan.uid)}
                          onChange={() => togglePanelistSelection(pan.uid)}
                          className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                        />
                        <span>{pan.fullName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={submitting}>Confirm Defense Schedule</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
