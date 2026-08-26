import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { X, PlusCircle, AlertCircle } from 'lucide-react';

export const TaskManagementModal = ({
  isOpen,
  onClose,
  workspace,
  onTaskCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [sectionId, setSectionId] = useState('chapter_1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !workspace) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    if (!dueDate) {
      setError('Due date is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const taskInput = {
        workspaceId: workspace.id,
        proposalId: workspace.proposalId,
        projectId: workspace.projectId,
        studentId: workspace.studentId,
        studentName: workspace.studentName,
        adviserId: workspace.adviserId,
        adviserName: workspace.adviserName,
        sectionId,
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate,
      };

      await onTaskCreated(taskInput);
      onClose();
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err.message || 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Create Research Task
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Assign a structured task for <strong className="text-gray-700 dark:text-gray-300">{workspace.studentName}</strong> ({workspace.groupName})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-xs text-rose-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Task Title *
            </label>
            <Input
              type="text"
              placeholder="e.g. Expand Chapter 1 Background with 2024–2026 Citations"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Section & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Target Section
              </label>
              <Select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              >
                {(workspace.sections || []).map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Priority Level
              </label>
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Target Deadline *
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Instructions &amp; Requirements
            </label>
            <textarea
              className="w-full text-xs p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none min-h-[90px]"
              placeholder="Provide specific instructions, expectations, and checklist items for your advisee."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              <PlusCircle className="w-4 h-4 mr-1.5" />
              {isSubmitting ? 'Creating...' : 'Assign Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskManagementModal;
