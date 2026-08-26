import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { HiCalendar, HiClock, HiMapPin, HiCheck } from 'react-icons/hi2';
import scheduleService from '../../services/schedule.service';

export const GenerateScheduleModal = ({ isOpen, onClose, groups, onSchedulesCreated }) => {
  const [step, setStep] = useState(1); // 1 = Config, 2 = Preview
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [config, setConfig] = useState({
    date: new Date().toISOString().split('T')[0],
    venue: '',
    durationMinutes: 60,
    customDuration: '',
    defenseType: 'proposal_defense',
    startTime: '08:00',
    breakStart: '12:00',
    breakEnd: '13:00',
    endTime: '17:00'
  });

  const [previewData, setPreviewData] = useState({ proposedSchedules: [], errors: [] });

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleGeneratePreview = async () => {
    if (!config.venue.trim()) {
      setError('Venue is required.');
      return;
    }
    
    let duration = config.durationMinutes;
    if (duration === 'custom') {
      duration = parseInt(config.customDuration, 10);
      if (isNaN(duration) || duration <= 0) {
        setError('Valid custom duration is required.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        groups,
        config: {
          ...config,
          durationMinutes: duration
        }
      };
      const result = await scheduleService.generateSchedulePreview(payload);
      setPreviewData(result);
      setStep(2);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await scheduleService.bulkCreateSchedules(previewData.proposedSchedules);
      onSchedulesCreated();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Failed to save schedules');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setPreviewData({ proposedSchedules: [], errors: [] });
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { resetModal(); onClose(); }}
      title={step === 1 ? 'Create Defense Schedule' : 'Schedule Preview'}
      icon={HiCalendar}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 font-inter min-h-[400px]">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-100 dark:border-red-800">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b pb-2">
                Basic Details
              </h3>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Defense Type</label>
                <select
                  value={config.defenseType}
                  onChange={(e) => handleConfigChange('defenseType', e.target.value)}
                  className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="proposal_defense">Proposal Defense</option>
                  <option value="final_defense">Final Defense</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
                <Input
                  type="date"
                  value={config.date}
                  onChange={(e) => handleConfigChange('date', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Venue</label>
                <Input
                  icon={HiMapPin}
                  placeholder="e.g. LSPU Research Defense Room"
                  value={config.venue}
                  onChange={(e) => handleConfigChange('venue', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Duration Per Group</label>
                <div className="flex gap-2 items-center">
                  <select
                    value={config.durationMinutes}
                    onChange={(e) => handleConfigChange('durationMinutes', e.target.value === 'custom' ? 'custom' : Number(e.target.value))}
                    className="flex-1 h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1 hour 30 minutes</option>
                    <option value={120}>2 hours</option>
                    <option value="custom">Custom</option>
                  </select>
                  {config.durationMinutes === 'custom' && (
                    <div className="w-24">
                      <Input
                        type="number"
                        placeholder="Mins"
                        value={config.customDuration}
                        onChange={(e) => handleConfigChange('customDuration', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b pb-2">
                Operating Hours
              </h3>
              <p className="text-xs text-gray-500">
                The scheduling engine will allocate time slots starting from the start time, skipping the break period.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start Time</label>
                  <Input type="time" value={config.startTime} onChange={(e) => handleConfigChange('startTime', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">End Time</label>
                  <Input type="time" value={config.endTime} onChange={(e) => handleConfigChange('endTime', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Break Start</label>
                  <Input type="time" value={config.breakStart} onChange={(e) => handleConfigChange('breakStart', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Break End</label>
                  <Input type="time" value={config.breakEnd} onChange={(e) => handleConfigChange('breakEnd', e.target.value)} />
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                 <p className="text-sm text-gray-600 dark:text-gray-400">
                   You are about to schedule <strong className="text-blue-600 dark:text-blue-400">{groups.length}</strong> research group(s).
                 </p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {previewData.errors && previewData.errors.length > 0 && (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                <h4 className="font-semibold text-orange-800 dark:text-orange-400 text-sm mb-2">Scheduling Conflicts Found</h4>
                <ul className="list-disc pl-5 text-sm text-orange-700 dark:text-orange-300 space-y-1">
                  {previewData.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  <HiMapPin className="inline w-4 h-4 mr-1" /> {config.venue}
                </p>
                <p className="text-sm font-medium text-gray-500 mt-1">
                  <HiCalendar className="inline w-4 h-4 mr-1" /> {new Date(config.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <Badge variant="blue">{previewData.proposedSchedules.length} Schedules Generated</Badge>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {previewData.proposedSchedules.map((schedule, i) => (
                <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row gap-4">
                  <div className="flex-shrink-0 w-32 border-r border-gray-100 dark:border-slate-800 flex flex-col justify-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{schedule.startTime}</span>
                    <span className="text-xs text-gray-400">to {schedule.endTime}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{schedule.projectTitle}</h4>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Adviser</p>
                        <p className="text-gray-700 dark:text-gray-300">{schedule.adviserName || 'None'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Panelists</p>
                        <div className="space-y-0.5">
                          {schedule.panelists.length === 0 ? (
                            <p className="text-gray-500 italic">No panelists assigned</p>
                          ) : (
                            schedule.panelists.map((p, idx) => (
                              <p key={idx} className="text-gray-700 dark:text-gray-300 flex items-center">
                                <span className="text-xs bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-2 uppercase text-gray-500">{p.role}</span>
                                {p.name}
                              </p>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => { resetModal(); onClose(); }}>Cancel</Button>
              <Button variant="primary" onClick={handleGeneratePreview} isLoading={loading} disabled={loading || groups.length === 0}>
                Generate Preview
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>Edit Configuration</Button>
              <Button variant="primary" onClick={handleConfirm} isLoading={loading} disabled={loading || previewData.proposedSchedules.length === 0}>
                <HiCheck className="w-4 h-4 mr-2" />
                Confirm & Create
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
