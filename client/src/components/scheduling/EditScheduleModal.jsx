import React, { useState, useEffect } from 'react';
import { HiXMark, HiCalendar } from 'react-icons/hi2';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { userService } from '../../services/user.service';
import { scheduleService } from '../../services/schedule.service';
import { groupService } from '../../services/group.service';

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
      const pList = schedule.panelists || [];
      const subj = pList.find(p => (p.role || '').toLowerCase().includes('subject'));
      const stat = pList.find(p => (p.role || '').toLowerCase().includes('stat'));
      const tech = pList.find(p => (p.role || '').toLowerCase().includes('tech'));

      setFormData({
        date: schedule.date || '',
        startTime: schedule.startTime || schedule.time || '',
        endTime: schedule.endTime || '',
        venue: schedule.location || schedule.venue || '',
        adviserId: schedule.adviserId || group?.adviserId || '',
        adviserName: schedule.adviserName || group?.adviserName || '',
        subjectSpecialistId: subj?.id || subj?.uid || '',
        subjectSpecialistName: subj?.name || subj?.fullName || '',
        statId: stat?.id || stat?.uid || '',
        statName: stat?.name || stat?.fullName || '',
        techId: tech?.id || tech?.uid || '',
        techName: tech?.name || tech?.fullName || '',
      });
    } else if (group && !schedule && isOpen) {
      // If creating a schedule manually from scratch using the modal
      const pList = group.panelists || [];
      let subj = pList.find(p => (p.role || '').toLowerCase().includes('subject'));
      let stat = pList.find(p => (p.role || '').toLowerCase().includes('stat'));
      let tech = pList.find(p => (p.role || '').toLowerCase().includes('tech'));

      const unassigned = pList.filter(p => !['subject specialist', 'statistician', 'technical'].some(r => (p.role || '').toLowerCase().includes(r)));
      if (!subj && unassigned.length > 0) subj = unassigned.shift();
      if (!stat && unassigned.length > 0) stat = unassigned.shift();
      if (!tech && unassigned.length > 0) tech = unassigned.shift();

      setFormData({
        date: '',
        startTime: '',
        endTime: '',
        venue: '',
        adviserId: group?.adviserId || '',
        adviserName: group?.adviserName || '',
        subjectSpecialistId: subj?.id || subj?.uid || '',
        subjectSpecialistName: subj?.name || subj?.fullName || '',
        statId: stat?.id || stat?.uid || '',
        statName: stat?.name || stat?.fullName || '',
        techId: tech?.id || tech?.uid || '',
        techName: tech?.name || tech?.fullName || '',
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

      const projectId = group?.id || schedule?.projectId;
      const payload = {
        projectId: projectId,
        projectTitle: group?.title || schedule?.projectTitle,
        defenseType: schedule?.defenseType || 'proposal_defense',
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venue: formData.venue,
        adviserId: formData.adviserId,
        adviserName: formData.adviserName,
        panelists: updatedPanelists
      };

      // Always update group details if we have a group ID
      if (projectId) {
        await groupService.updateGroup(projectId, {
          adviserId: formData.adviserId,
          adviserName: formData.adviserName,
          panelists: updatedPanelists
        });
      }

      // Only create/update schedule if schedule already exists OR if date/time are provided
      const hasScheduleData = formData.date && formData.startTime;
      
      if (schedule && schedule.id) {
        await scheduleService.updateSchedule(schedule.id, payload);
      } else if (hasScheduleData) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#15161e] border border-gray-200 dark:border-[#222433] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#222433] flex justify-between items-center bg-gray-50/50 dark:bg-[#15161e]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HiCalendar className="w-5 h-5 text-blue-500" />
            {schedule ? 'Edit Schedule & Panel' : 'Set Schedule & Panel'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 dark:text-[#9396a8] hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1c1d28] rounded-full transition-colors">
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-[#222433] pb-2">Time & Venue</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-[#9396a8] uppercase mb-1">Date</label>
                <Input type="date" name="date" value={formData.date} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-[#9396a8] uppercase mb-1">Venue</label>
                <Input name="venue" value={formData.venue} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-[#9396a8] uppercase mb-1">Start Time</label>
                <Input type="time" name="startTime" value={formData.startTime} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-[#9396a8] uppercase mb-1">End Time</label>
                <Input type="time" name="endTime" value={formData.endTime} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-[#222433] pb-2">Panel & Adviser</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-[#9396a8] uppercase mb-1">Adviser</label>
                <select 
                  name="adviserId" 
                  value={formData.adviserId} 
                  onChange={handleChange}
                  className="w-full h-10 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-[13px] font-medium text-gray-700 dark:text-[#f3f4f8] px-3 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select Adviser...</option>
                  {advisers.map(a => <option key={a.uid} value={a.uid}>{a.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-[#9396a8] uppercase mb-1">Subject Specialist</label>
                <select 
                  name="subjectSpecialistId" 
                  value={formData.subjectSpecialistId} 
                  onChange={handleChange}
                  className="w-full h-10 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-[13px] font-medium text-gray-700 dark:text-[#f3f4f8] px-3 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select Panelist...</option>
                  {panelists.map(p => <option key={p.uid} value={p.uid}>{p.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-[#9396a8] uppercase mb-1">Statistician</label>
                <select 
                  name="statId" 
                  value={formData.statId} 
                  onChange={handleChange}
                  className="w-full h-10 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-[13px] font-medium text-gray-700 dark:text-[#f3f4f8] px-3 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select Panelist...</option>
                  {panelists.map(p => <option key={p.uid} value={p.uid}>{p.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-[#9396a8] uppercase mb-1">Technical</label>
                <select 
                  name="techId" 
                  value={formData.techId} 
                  onChange={handleChange}
                  className="w-full h-10 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-[13px] font-medium text-gray-700 dark:text-[#f3f4f8] px-3 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all cursor-pointer"
                >
                  <option value="">Select Panelist...</option>
                  {panelists.map(p => <option key={p.uid} value={p.uid}>{p.fullName}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-[#222433] bg-gray-50/50 dark:bg-[#15161e] flex justify-end gap-3">
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
