// src/pages/Schedules.jsx
import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Toast } from "../components/ui/Toast";
import {
  HiCalendarDays,
  HiClock,
  HiMapPin,
  HiUsers,
  HiPlusCircle,
  HiAcademicCap,
} from "react-icons/hi2";
import { useAuth } from "../context/AuthContext";
import { scheduleService } from "../services/schedule.service";
import { userService } from "../services/user.service";

export const Schedules = () => {
  const { role } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [panelists, setPanelists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Schedule Form State
  const [projectTitle, setProjectTitle] = useState("");
  const [studentName, setStudentName] = useState("");
  const [defenseType, setDefenseType] = useState("proposal_defense");
  const [date, setDate] = useState("2026-08-14");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:30");
  const [venue, setVenue] = useState("Room 402, Engineering Hall");
  const [selectedPanelistIds, setSelectedPanelistIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const data = await scheduleService.getAllSchedules();
      setSchedules(data);
    } catch (err) {
      console.error("[Schedules] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPanelists = async () => {
    try {
      const allUsers = await userService.getAllUsers();
      const eligible = allUsers.filter((u) => u.role === "panelist" || u.role === "adviser");
      setPanelists(eligible);
    } catch (err) {
      console.error("[Schedules] fetch panelists error:", err);
    }
  };

  useEffect(() => {
    fetchSchedules();
    if (role === "admin") {
      fetchPanelists();
    }
  }, [role]);

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!projectTitle || !studentName) return alert("Please fill all required fields.");

    setSubmitting(true);
    try {
      const panelistNames = panelists
        .filter((p) => selectedPanelistIds.includes(p.uid))
        .map((p) => p.fullName);

      await scheduleService.createSchedule({
        projectTitle,
        studentName,
        defenseType,
        date,
        startTime,
        endTime,
        venue,
        panelistIds: selectedPanelistIds,
        panelistNames,
        status: "scheduled",
      });

      setToast("Defense schedule published successfully!");
      setModalOpen(false);
      setProjectTitle("");
      setStudentName("");
      setSelectedPanelistIds([]);
      await fetchSchedules();
    } catch (err) {
      alert(`Scheduling failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const togglePanelist = (uid) => {
    if (selectedPanelistIds.includes(uid)) {
      setSelectedPanelistIds(selectedPanelistIds.filter((id) => id !== uid));
    } else {
      setSelectedPanelistIds([...selectedPanelistIds, uid]);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={HiCalendarDays}
        title="Oral Defense Schedules"
        description="Public schedule for proposal defenses, final oral presentations, panel venues, and committee assignments."
        actions={
          role === "admin" && (
            <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
              <HiPlusCircle className="w-4 h-4 mr-2" /> Schedule Defense
            </Button>
          )
        }
      />

      {toast && (
        <Toast message={toast} variant="success" onClose={() => setToast("")} />
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-400 dark:text-gray-500">
          Loading defense schedule...
        </div>
      ) : schedules.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={HiCalendarDays}
            title="No Defenses Scheduled"
            description="Upcoming proposal and final defense presentations will be displayed on this calendar."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schedules.map((sch) => (
            <Card key={sch.id} className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={sch.defenseType === "final_defense" ? "emerald" : "purple"}>
                    {sch.defenseType === "final_defense" ? "FINAL DEFENSE" : "PROPOSAL DEFENSE"}
                  </Badge>
                  <Badge variant="blue">{(sch.status || "SCHEDULED").toUpperCase()}</Badge>
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">{sch.projectTitle}</h3>

                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <HiAcademicCap className="w-4 h-4 text-primary shrink-0" />
                    <span>Candidate: <strong className="text-gray-800 dark:text-gray-200">{sch.studentName}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <HiClock className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>{sch.date} ({sch.startTime} - {sch.endTime})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <HiMapPin className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="truncate">{sch.venue}</span>
                  </div>
                </div>

                {sch.panelistNames && sch.panelistNames.length > 0 && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <HiUsers className="w-3.5 h-3.5 text-purple-500" /> Defense Panel Committee:
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {sch.panelistNames.map((pname, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] font-medium"
                        >
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
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Defense Event"
        icon={HiCalendarDays}
      >
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
            <Select
              label="Defense Stage"
              value={defenseType}
              onChange={(e) => setDefenseType(e.target.value)}
            >
              <option value="proposal_defense">Proposal Defense</option>
              <option value="final_defense">Final Defense</option>
            </Select>

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
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Assign Panelists (Select 2-3)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                {panelists.map((pan) => (
                  <label
                    key={pan.uid}
                    className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPanelistIds.includes(pan.uid)}
                      onChange={() => togglePanelistSelection(pan.uid)}
                      className="rounded border-gray-300 dark:border-slate-700 text-primary focus:ring-primary"
                    />
                    <span>{pan.fullName}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Confirm Defense Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Schedules;
