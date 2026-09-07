// src/pages/Panelists.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import {
  HiUsers,
  HiCalendarDays,
  HiClock,
  HiMapPin,
  HiDocumentText,
  HiMagnifyingGlass,
  HiCheckCircle,
  HiExclamationCircle,
  HiEye,
  HiInformationCircle,
} from "react-icons/hi2";
import { scheduleService } from "../services/schedule.service";
import { groupService } from "../services/group.service";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

const formatTime12Hour = (time) => {
  if (!time) return "";
  const parts = time.split(":");
  if (parts.length < 2) return time;
  const h = parseInt(parts[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const formattedHour = h % 12 || 12;
  return `${formattedHour}:${parts[1]} ${ampm}`;
};

export const Panelists = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState({ message: "", variant: "error" });

  // Missing document modal state
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [resolvingDoc, setResolvingDoc] = useState(false);

  const formatRole = (role) => {
    if (!role) return "Panelist";
    const r = role.toLowerCase();
    if (r.includes("subject")) return "Subject Specialist";
    if (r.includes("stat")) return "Statistician";
    if (r.includes("tech")) return "Technical";
    return role;
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchPanelistSchedules();
    } else {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  const fetchPanelistSchedules = async () => {
    setLoading(true);
    try {
      // 1. Fetch all schedules from centralized schedule service
      const allSchedules = await scheduleService.getAllSchedules();

      // 2. Filter schedules where the current user is assigned as a panelist
      const myPanelSchedules = allSchedules.filter((sch) => {
        if (sch.status === "cancelled") return false;

        // Check panelistIds array
        if (Array.isArray(sch.panelistIds) && sch.panelistIds.includes(currentUser.uid)) {
          return true;
        }

        // Check panelists object array
        if (
          Array.isArray(sch.panelists) &&
          sch.panelists.some((p) => (p.id === currentUser.uid || p.uid === currentUser.uid))
        ) {
          return true;
        }

        return false;
      });

      // 3. Enrich with research group metadata if needed
      const enriched = await Promise.all(
        myPanelSchedules.map(async (sch) => {
          const groupId = sch.projectId || sch.groupId;
          let groupData = null;
          if (groupId) {
            try {
              groupData = await groupService.getGroupById(groupId);
            } catch (e) {
              console.warn("Could not fetch group for schedule", sch.id, e);
            }
          }

          // Determine user's specific role in panel if defined
          let userRole = "Panelist";
          if (sch.panelists && Array.isArray(sch.panelists)) {
            const match = sch.panelists.find(
              (p) => p.id === currentUser.uid || p.uid === currentUser.uid
            );
            if (match && match.role) {
              userRole = match.role;
            }
          }

          return {
            ...sch,
            groupName: groupData?.name || sch.projectTitle || "Research Group",
            researchTitle: groupData?.title || sch.projectTitle || "Research Manuscript",
            groupId: groupId,
            groupData: groupData,
            roleInPanel: userRole,
          };
        })
      );

      // Sort by date and start time ASC
      enriched.sort(
        (a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`)
      );

      setSchedules(enriched);
    } catch (err) {
      console.error("[Panelists] Error fetching panelist schedules:", err);
      setToast({ message: "Failed to load panelist defense schedules.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Resolve group's manuscript and navigate in Panelist Review Mode
  const handleViewEditor = async (sch) => {
    setSelectedSchedule(sch);
    setResolvingDoc(true);

    try {
      const groupId = sch.groupId || sch.projectId;
      let documentId = null;

      // Check groupData first
      if (sch.groupData?.manuscriptId) {
        documentId = sch.groupData.manuscriptId;
      }

      // Query documents collection by groupId
      if (!documentId && groupId) {
        const docQuery = query(
          collection(db, "documents"),
          where("groupId", "==", groupId)
        );
        const snap = await getDocs(docQuery);
        if (!snap.empty) {
          documentId = snap.docs[0].id;
        }
      }

      // Query manuscript_workspaces collection by groupId
      if (!documentId && groupId) {
        const wsQuery = query(
          collection(db, "manuscript_workspaces"),
          where("groupId", "==", groupId)
        );
        const snap = await getDocs(wsQuery);
        if (!snap.empty) {
          const wsData = snap.docs[0].data();
          if (wsData.documentId) {
            documentId = wsData.documentId;
          }
        }
      }

      if (documentId) {
        // Navigate in Panelist Review Mode with schedule reference
        navigate(`/documents/${documentId}?scheduleId=${sch.id}&mode=panelist`, {
          state: {
            from: "/panelists",
            scheduleId: sch.id,
            isPanelistReview: true,
            groupId: groupId,
            groupName: sch.groupName,
          },
        });
      } else {
        // Document Not Available modal
        setIsDocModalOpen(true);
      }
    } catch (err) {
      console.error("[Panelists] Error resolving document:", err);
      setToast({ message: "Could not open document editor. Please try again.", variant: "error" });
    } finally {
      setResolvingDoc(false);
    }
  };

  const filteredSchedules = schedules.filter((sch) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    return (
      (sch.groupName && sch.groupName.toLowerCase().includes(q)) ||
      (sch.researchTitle && sch.researchTitle.toLowerCase().includes(q)) ||
      (sch.venue && sch.venue.toLowerCase().includes(q)) ||
      (sch.location && sch.location.toLowerCase().includes(q)) ||
      (sch.defenseType && sch.defenseType.toLowerCase().includes(q))
    );
  });

  const tableColumns = [
    { label: "Research Group", className: "min-w-[150px]" },
    { label: "Research Title", className: "min-w-[220px]" },
    { label: "Defense Type", className: "min-w-[130px]" },
    { label: "Date", className: "min-w-[120px]" },
    { label: "Time", className: "min-w-[140px]" },
    { label: "Role", className: "min-w-[150px]" },
    { label: "Actions", className: "min-w-[180px] text-right" },
  ];

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-gray-400 space-y-3 font-inter">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-sm font-medium">Loading panel assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-inter">
      {toast.message && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast({ message: "", variant: "error" })}
        />
      )}

      <PageHeader
        icon={HiUsers}
        title="Panel Assignments"
        description="Official defense schedules and manuscripts where you are designated as an oral defense committee panelist."
      />

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Input
            icon={HiMagnifyingGlass}
            placeholder="Search by group, title, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="blue" className="text-xs px-3 py-1.5 font-medium">
            {filteredSchedules.length} Assigned Defense{filteredSchedules.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-[#15161e] rounded-2xl border border-gray-200/90 dark:border-[#222433] shadow-sm overflow-hidden">
        <DataTable columns={tableColumns} className="shadow-none">
          {filteredSchedules.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-16 text-center text-gray-400">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <HiCalendarDays className="w-12 h-12 text-gray-300 dark:text-[#6b6f84]" />
                  {schedules.length === 0 ? (
                    <>
                      <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">
                        No Panel Assignments Yet
                      </h4>
                      <p className="text-xs text-gray-400 max-w-sm">
                        You have not been assigned as a panelist to any defense schedules.
                      </p>
                    </>
                  ) : (
                    <>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        No Matching Schedules Found
                      </h4>
                      <p className="text-xs text-gray-400">Try adjusting your search criteria.</p>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredSchedules.map((sch) => {
              const defenseTypeLabel = (sch.defenseType || "proposal_defense")
                .replace("_", " ")
                .toUpperCase();
              const timeDisplay = `${formatTime12Hour(sch.startTime)} – ${formatTime12Hour(sch.endTime)}`;

              return (
                <TableRow
                  key={sch.id}
                  className="hover:bg-gray-50/70 dark:hover:bg-[#1a1b26]/50 transition-colors"
                >
                  {/* Research Group */}
                  <TableCell>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      {sch.groupName}
                    </div>
                    {sch.groupId && (
                      <span className="text-[10px] font-mono text-gray-400">
                        ID: {sch.groupId.slice(0, 8)}
                      </span>
                    )}
                  </TableCell>

                  {/* Research Title */}
                  <TableCell>
                    <div className="font-medium text-gray-800 dark:text-gray-200 text-sm line-clamp-2 max-w-xs">
                      {sch.researchTitle}
                    </div>
                  </TableCell>

                  {/* Defense Type */}
                  <TableCell>
                    <Badge variant={sch.defenseType === "final_defense" ? "purple" : "blue"} className="text-[10px]">
                      {defenseTypeLabel}
                    </Badge>
                  </TableCell>

                  {/* Date */}
                  <TableCell>
                    <div className="text-xs font-semibold text-gray-900 dark:text-white">
                      {sch.date ? new Date(sch.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      }) : "TBA"}
                    </div>
                  </TableCell>

                  {/* Time */}
                  <TableCell>
                    <div className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <HiClock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{timeDisplay}</span>
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {formatRole(sch.roleInPanel)}
                    </span>
                  </TableCell>

                  {/* Actions — Details + View Editor */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSchedule(sch);
                          setIsDetailsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium"
                        title="View Defense Details"
                      >
                        <HiInformationCircle className="w-4 h-4 text-gray-500" />
                        Details
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewEditor(sch)}
                        disabled={resolvingDoc}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <HiEye className="w-4 h-4" />
                        View Editor
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </DataTable>
      </div>

      {/* Modal: Defense Details (including prominent Venue) */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Defense Schedule Details"
        icon={HiCalendarDays}
      >
        {selectedSchedule && (
          <div className="p-5 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge
                  variant={
                    selectedSchedule.defenseType === "final_defense"
                      ? "purple"
                      : "blue"
                  }
                  className="text-xs uppercase"
                >
                  {(selectedSchedule.defenseType || "proposal_defense")
                    .replace("_", " ")}
                </Badge>
                <span className="text-xs text-gray-400">
                  Group: {selectedSchedule.groupName}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                {selectedSchedule.researchTitle}
              </h3>
            </div>

            {/* Prominent Venue Box */}
            <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shrink-0">
                <HiMapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                  Assigned Venue / Location
                </span>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                  {selectedSchedule.venue || selectedSchedule.location || "Room TBA"}
                </p>
              </div>
            </div>

            {/* Date & Time Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1a1b26] border border-gray-200/80 dark:border-[#222433]">
                <span className="text-gray-400 block mb-1">Defense Date</span>
                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                  {selectedSchedule.date
                    ? new Date(selectedSchedule.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Not scheduled"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1a1b26] border border-gray-200/80 dark:border-[#222433]">
                <span className="text-gray-400 block mb-1">Defense Time</span>
                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                  {selectedSchedule.startTime
                    ? `${formatTime12Hour(selectedSchedule.startTime)} – ${formatTime12Hour(selectedSchedule.endTime)}`
                    : "TBA"}
                </span>
              </div>
            </div>

            {/* Panel Committee Roles */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#1a1b26] border border-gray-200/80 dark:border-[#222433] space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#6b6f84]">
                Evaluation Committee
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 block">Your Role:</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {formatRole(selectedSchedule.roleInPanel)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Adviser:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {selectedSchedule.adviserName || selectedSchedule.groupData?.adviserName || "Not assigned"}
                  </span>
                </div>
              </div>

              {selectedSchedule.panelists && selectedSchedule.panelists.length > 0 && (
                <div className="pt-2 border-t border-gray-200 dark:border-[#222433] space-y-1.5">
                  <span className="text-[11px] font-semibold text-gray-400 block">
                    Assigned Panelists:
                  </span>
                  <div className="space-y-1">
                    {selectedSchedule.panelists.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-0.5"
                      >
                        <span className="text-gray-700 dark:text-gray-300">
                          {p.name || p.fullName}
                        </span>
                        <Badge variant="purple" className="text-[10px]">
                          {formatRole(p.role)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsDetailsModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  handleViewEditor(selectedSchedule);
                }}
                disabled={resolvingDoc}
                className="inline-flex items-center gap-1.5"
              >
                <HiEye className="w-4 h-4" />
                View Editor
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Document Not Available Empty State (Prompt Section 24) */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title="Document Not Available"
        icon={HiDocumentText}
      >
        <div className="p-4 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-100 dark:border-amber-900/40">
            <HiExclamationCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Document Not Available
            </h3>
            <p className="text-sm text-gray-500 dark:text-[#9396a8] mt-2 max-w-sm mx-auto leading-relaxed">
              This research group has not uploaded or created a manuscript yet.
            </p>
            {selectedSchedule && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-[#1a1b26] rounded-xl text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#222433]">
                Group: <strong>{selectedSchedule.groupName}</strong>
              </div>
            )}
          </div>
          <div className="pt-2">
            <Button variant="primary" onClick={() => setIsDocModalOpen(false)}>
              Understood
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Panelists;
