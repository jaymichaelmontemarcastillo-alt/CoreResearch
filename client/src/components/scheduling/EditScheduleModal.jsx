import React, { useState, useEffect } from 'react';
import { HiXMark, HiCalendar } from 'react-icons/hi2';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { userService } from '../../services/user.service';
import { scheduleService } from '../../services/schedule.service';

const EditScheduleModal = ({ isOpen, onClose, schedule, group, onSaved }) => {
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    venue: '',
    adviserId: '',
    adviserName: '',
    subjectSpecialistId: '',
    subjectSpecialistName: '',
    statId: '',
    statName: '',
    techId: '',
    techName: '',
  });

  const [panelists, setPanelists] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const pList = await userService.getUsersByRole('panelist');
        const aList = await userService.getUsersByRole('adviser');
        const fList = await userService.getUsersByRole('faculty');
        
        // Allow anyone (faculty, adviser, panelist) to act as an adviser or panelist
        const combined = [...pList, ...aList, ...fList];
        
        // Deduplicate by uid
        const uniqueUsers = Array.from(new Map(combined.map(u => [u.uid, u])).values());
        
        setPanelists(uniqueUsers);
        setAdvisers(uniqueUsers);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (schedule && isOpen) {
      const subj = schedule.panelists?.find(p => (p.role || '').toLowerCase().includes('subject'));
      const stat = schedule.panelists?.find(p => (p.role || '').toLowerCase().includes('stat'));
      const tech = schedule.panelists?.find(p => (p.role || '').toLowerCase().includes('tech'));

      setFormData({
        date: schedule.date || '',
        startTime: schedule.startTime || '',
        endTime: schedule.endTime || '',
        venue: schedule.location || schedule.venue || '',
        adviserId: schedule.adviserId || group?.adviserId || '',
        adviserName: schedule.adviserName || group?.adviserName || '',
        subjectSpecialistId: subj?.id || '',
        subjectSpecialistName: subj?.name || subj?.fullName || '',
        statId: stat?.id || '',
        statName: stat?.name || stat?.fullName || '',
        techId: tech?.id || '',
        techName: tech?.name || tech?.fullName || '',
      });
    } else if (group && !schedule && isOpen) {
      // If creating a schedule manually from scratch using the modal
      setFormData({
        date: '',
        startTime: '',
        endTime: '',
        venue: '',
        adviserId: group?.adviserId || '',
        adviserName: group?.adviserName || '',
        subjectSpecialistId: '',
        subjectSpecialistName: '',
        statId: '',
        statName: '',
        techId: '',
        techName: '',
      });
    }
  }, [schedule, group, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'adviserId') {
      const adv = advisers.find(a => a.uid === value);
      setFormData(prev => ({ ...prev, adviserId: value, adviserName: adv?.fullName || '' }));
    } else if (name === 'subjectSpecialistId') {
      const pan = panelists.find(p => p.uid === value);
      setFormData(prev => ({ ...prev, subjectSpecialistId: value, subjectSpecialistName: pan?.fullName || '' }));
    } else if (name === 'statId') {
      const pan = panelists.find(p => p.uid === value);
      setFormData(prev => ({ ...prev, statId: value, statName: pan?.fullName || '' }));
    } else if (name === 'techId') {
      const pan = panelists.find(p => p.uid === value);
      setFormData(prev => ({ ...prev, techId: value, techName: pan?.fullName || '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedPanelists = [];
      if (formData.subjectSpecialistId) {
        updatedPanelists.push({ id: formData.subjectSpecialistId, name: formData.subjectSpecialistName, role: 'Subject Specialist' });
      }
      if (formData.statId) {
        updatedPanelists.push({ id: formData.statId, name: formData.statName, role: 'Statistician' });
      }
      if (formData.techId) {
        updatedPanelists.push({ id: formData.techId, name: formData.techName, role: 'Technical' });
      }

      const payload = {
        projectId: group.id,
        projectTitle: group.title,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venue: formData.venue,
        adviserId: formData.adviserId,
        adviserName: formData.adviserName,
        panelists: updatedPanelists
      };

      if (schedule && schedule.id) {
        await scheduleService.updateSchedule(schedule.id, payload);
      } else {
        await scheduleService.bulkCreateSchedules([payload]);
      }
      onSaved();
    } catch (err) {
      console.error(err);
      alert('Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HiCalendar className="w-5 h-5 text-blue-500" />
            {schedule ? 'Edit Schedule & Panel' : 'Set Schedule & Panel'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b pb-2">Time & Venue</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
                <Input type="date" name="date" value={formData.date} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Venue</label>
                <Input name="venue" value={formData.venue} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start Time</label>
                <Input type="time" name="startTime" value={formData.startTime} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">End Time</label>
                <Input type="time" name="endTime" value={formData.endTime} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b pb-2">Panel & Adviser</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Adviser</label>
                <select 
                  name="adviserId" 
                  value={formData.adviserId} 
                  onChange={handleChange}
                  className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-[13px] font-medium text-gray-600 dark:text-gray-300 px-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                >
                  <option value="">Select Adviser...</option>
                  {advisers.map(a => <option key={a.uid} value={a.uid}>{a.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Subject Specialist</label>
                <select 
                  name="subjectSpecialistId" 
                  value={formData.subjectSpecialistId} 
                  onChange={handleChange}
                  className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-[13px] font-medium text-gray-600 dark:text-gray-300 px-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                >
                  <option value="">Select Panelist...</option>
                  {panelists.map(p => <option key={p.uid} value={p.uid}>{p.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Statistician</label>
                <select 
                  name="statId" 
                  value={formData.statId} 
                  onChange={handleChange}
                  className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-[13px] font-medium text-gray-600 dark:text-gray-300 px-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                >
                  <option value="">Select Panelist...</option>
                  {panelists.map(p => <option key={p.uid} value={p.uid}>{p.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Technical</label>
                <select 
                  name="techId" 
                  value={formData.techId} 
                  onChange={handleChange}
                  className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-[13px] font-medium text-gray-600 dark:text-gray-300 px-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                >
                  <option value="">Select Panelist...</option>
                  {panelists.map(p => <option key={p.uid} value={p.uid}>{p.fullName}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="min-w-[120px]">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditScheduleModal;
