// src/pages/UserRequests.jsx
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { Avatar } from "../components/ui/Avatar";
import { Pagination } from "../components/ui/Pagination";
import { useConfirm } from "../context/ConfirmContext";
import { useAuth } from "../context/AuthContext";
import {
  HiMagnifyingGlass,
  HiUserPlus,
  HiFunnel,
  HiTrash,
  HiCheck,
  HiXMark,
  HiAcademicCap,
  HiEye,
} from "react-icons/hi2";
import { userService } from "../services/user.service";

export const UserRequests = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "rejected" ? "rejected" : "pending";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRequests, setTotalRequests] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  // Student Academic Filter State (BSIT -> WMAD, SMP, AMG | BSCS -> IS)
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");

  const [actionLoadingUid, setActionLoadingUid] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");

  // View details modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const { confirm } = useConfirm();
  const { currentUser } = useAuth();
  const searchTimeoutRef = useRef(null);

  const fetchTabCounts = async () => {
    try {
      const all = await userService.getAllUsers();
      const pending = all.filter(
        (u) =>
          u.status !== "approved" &&
          u.status !== "rejected" &&
          (u.status === "pending" || u.is_approved === false)
      );
      const rejected = all.filter((u) => u.status === "rejected");
      setPendingCount(pending.length);
      setRejectedCount(rejected.length);
    } catch (e) {
      console.warn("[UserRequests] Failed to load request counts:", e);
    }
  };

  const fetchRequests = async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    try {
      const result = await userService.getPaginatedUsers({
        page: targetPage,
        limit: targetLimit,
        status: selectedTab, // "pending" or "rejected"
        search: search.trim(),
        program: selectedProgram || undefined,
        specialization: selectedSpecialization || undefined,
      });

      setRequests(result.users);
      setTotalRequests(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error("[UserRequests] fetchRequests error:", err);
      showToast("Error loading user requests.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabCounts();
  }, []);

  useEffect(() => {
    fetchRequests(page, limit);
  }, [page, limit, selectedTab, selectedProgram, selectedSpecialization]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam !== selectedTab) {
      setSelectedTab(tabParam);
      setPage(1);
    }
  }, [searchParams]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchRequests(1, limit);
    }, 300);
  };

  const handleProgramFilterChange = (prog) => {
    setSelectedProgram(prog);
    if (prog === "BSIT" && selectedSpecialization === "IS") {
      setSelectedSpecialization("");
    } else if (prog === "BSCS" && ["WMAD", "SMP", "AMG"].includes(selectedSpecialization)) {
      setSelectedSpecialization("");
    }
    setPage(1);
  };

  const handleSpecializationFilterChange = (spec) => {
    setSelectedSpecialization(spec);
    if (spec === "IS" && selectedProgram === "") {
      setSelectedProgram("BSCS");
    } else if (["WMAD", "SMP", "AMG"].includes(spec) && selectedProgram === "") {
      setSelectedProgram("BSIT");
    }
    setPage(1);
  };

  const handleClearFilters = () => {
    setSelectedProgram("");
    setSelectedSpecialization("");
    setSearch("");
    setPage(1);
  };

  const showToast = (message, variant = "success") => {
    setToastMessage(message);
    setToastVariant(variant);
  };

  const handleApprove = async (u) => {
    const confirmed = await confirm({
      title: "Approve User Registration",
      message: `Are you sure you want to approve registration for ${u.fullName || u.email} (${u.studentIdOrEmployeeId})? This will grant them access to CoreResearch.`,
      confirmText: "Approve",
      variant: "primary",
    });

    if (!confirmed) return;

    setActionLoadingUid(u.uid);
    try {
      await userService.approveUser(u.uid, currentUser?.uid || "admin");
      showToast(`User ${u.fullName || u.email} approved successfully.`);
      fetchTabCounts();
      fetchRequests(page, limit);
      if (detailModalOpen && selectedRequest?.uid === u.uid) {
        setDetailModalOpen(false);
      }
    } catch (err) {
      showToast(`Failed to approve user: ${err.message}`, "error");
    } finally {
      setActionLoadingUid(null);
    }
  };

  const handleReject = async (u) => {
    const confirmed = await confirm({
      title: "Reject User Registration",
      message: `Are you sure you want to reject the registration of ${u.fullName || u.email}? They will not be able to log in to CoreResearch.`,
      confirmText: "Reject",
      variant: "danger",
    });

    if (!confirmed) return;

    setActionLoadingUid(u.uid);
    try {
      await userService.rejectUser(u.uid, currentUser?.uid || "admin");
      showToast(`User registration rejected for ${u.fullName || u.email}.`);
      fetchTabCounts();
      fetchRequests(page, limit);
      if (detailModalOpen && selectedRequest?.uid === u.uid) {
        setDetailModalOpen(false);
      }
    } catch (err) {
      showToast(`Failed to reject user: ${err.message}`, "error");
    } finally {
      setActionLoadingUid(null);
    }
  };

  const handleDelete = async (u) => {
    const confirmed = await confirm({
      title: "Confirm Permanent Deletion",
      message: `Are you sure you want to permanently delete this registration record for ${u.fullName || u.email}? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await userService.deleteUser(u.uid);
      showToast("Registration record deleted.");
      fetchTabCounts();
      fetchRequests(page, limit);
      if (detailModalOpen && selectedRequest?.uid === u.uid) {
        setDetailModalOpen(false);
      }
    } catch (err) {
      showToast(`Failed to delete record: ${err.message}`, "error");
    }
  };

  const getProgramDisplay = (u) => {
    if (u.programCode) return u.programCode;
    if (u.program?.includes("Computer Science")) return "BSCS";
    if (u.program?.includes("Information Technology")) return "BSIT";
    return "BSIT";
  };

  const getSpecializationDisplay = (u) => {
    if (u.majorCode) return u.majorCode;
    const specStr = (u.programSpecialization || u.major || "").toUpperCase();
    if (specStr.includes("WMAD")) return "WMAD";
    if (specStr.includes("AMG")) return "AMG";
    if (specStr.includes("SMP")) return "SMP";
    if (specStr.includes("IS")) return "IS";
    return "—";
  };

  const getSectionDisplay = (u) => {
    if (u.sectionName) {
      const clean = u.sectionName.trim();
      return clean.length <= 2 ? `Section ${clean.toUpperCase()}` : clean;
    }
    if (u.sectionId) {
      const match = u.sectionId.match(/-sec-([a-z0-9])$/i);
      if (match) return `Section ${match[1].toUpperCase()}`;
    }
    return "Section A";
  };

  const columns = [
    { label: "Student Name", className: "w-[240px] min-w-[200px]" },
    { label: "Student ID", className: "min-w-[130px]" },
    { label: "Program", className: "min-w-[100px]" },
    { label: "Specialization", className: "min-w-[130px]" },
    { label: "Section", className: "min-w-[100px]" },
    { label: "Actions", className: "text-right min-w-[170px]" },
  ];

  return (
    <div className="space-y-6 font-inter">
      <PageHeader
        icon={HiUserPlus}
        title="User Requests"
        description="Review, verify, and approve or reject student registration requests."
      />

      {toastMessage && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          onClose={() => setToastMessage("")}
        />
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-4 pb-2">
        <div className="w-full md:max-w-md">
          <label className="block text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider mb-1.5">
            Search
          </label>
          <Input
            placeholder="Search by name, email, student ID, program, or section..."
            icon={HiMagnifyingGlass}
            value={search}
            onChange={handleSearchChange}
            className="shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 h-10">
          <div className="hidden md:flex h-10 items-center px-1">
            <HiFunnel className="w-4 h-4 text-gray-300 dark:text-[#6b6f84]" />
          </div>

          {[
            {
              id: "pending",
              label: "Pending",
              badge: pendingCount > 0 ? pendingCount : null,
              badgeColor: "bg-amber-500",
            },
            {
              id: "rejected",
              label: "Rejected",
              badge: rejectedCount > 0 ? rejectedCount : null,
              badgeColor: "bg-red-500",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedTab(tab.id);
                setPage(1);
                setSearchParams({ tab: tab.id });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                selectedTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full text-white font-bold ${
                    tab.badgeColor
                  } ${tab.id === "pending" ? "animate-pulse" : ""}`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Student Academic Filters (Program: BSIT/BSCS -> Specialization: WMAD/SMP/AMG/IS) */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50/80 dark:bg-[#12131c] border border-gray-200/80 dark:border-[#222433] rounded-2xl text-xs shadow-xs">
        <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-gray-300 mr-1">
          <HiFunnel className="w-4 h-4 text-primary" />
          <span>Academic Filters:</span>
        </div>

        {/* Program Filter: All, BSIT, BSCS */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider">
            Program:
          </span>
          <select
            value={selectedProgram}
            onChange={(e) => handleProgramFilterChange(e.target.value)}
            className="h-9 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#2b2d3f] rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 px-3 py-1 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer shadow-xs"
          >
            <option value="">All Programs</option>
            <option value="BSIT">BSIT (Information Technology)</option>
            <option value="BSCS">BSCS (Computer Science)</option>
          </select>
        </div>

        {/* Specialization Filter: BSIT -> WMAD, SMP, AMG | BSCS -> IS */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-[#6b6f84] uppercase tracking-wider">
            Specialization:
          </span>
          <select
            value={selectedSpecialization}
            onChange={(e) => handleSpecializationFilterChange(e.target.value)}
            className="h-9 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#2b2d3f] rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 px-3 py-1 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer shadow-xs"
          >
            <option value="">All Specializations</option>
            {selectedProgram === "BSIT" ? (
              <>
                <option value="WMAD">WMAD - Web & Mobile Apps</option>
                <option value="SMP">SMP - Service Management Program</option>
                <option value="AMG">AMG - Animation & Motion Graphics</option>
              </>
            ) : selectedProgram === "BSCS" ? (
              <>
                <option value="IS">IS - Intelligent Systems</option>
              </>
            ) : (
              <>
                <optgroup label="BSIT Specializations">
                  <option value="WMAD">WMAD - Web & Mobile Apps</option>
                  <option value="SMP">SMP - Service Management</option>
                  <option value="AMG">AMG - Animation & Motion Graphics</option>
                </optgroup>
                <optgroup label="BSCS Specializations">
                  <option value="IS">IS - Intelligent Systems</option>
                </optgroup>
              </>
            )}
          </select>
        </div>

        {/* Clear Filters Button */}
        {(selectedProgram || selectedSpecialization) && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <HiXMark className="w-3.5 h-3.5" />
            <span>Clear Filter</span>
          </button>
        )}
      </div>

      {/* Requests Table */}
      <DataTable columns={columns} className="shadow-sm">
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="py-12 text-center text-gray-400 dark:text-gray-500">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm">Loading registration requests...</span>
              </div>
            </TableCell>
          </TableRow>
        ) : requests.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-16 text-center text-gray-400 dark:text-gray-500 space-y-2">
              <div className="text-base font-bold text-gray-700 dark:text-gray-300">
                {selectedTab === "rejected" ? "No Rejected Registrations" : "No Pending Requests"}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {selectedTab === "rejected"
                  ? "There are currently no rejected student registration records."
                  : "All student registration submissions have been processed."}
              </div>
            </TableCell>
          </TableRow>
        ) : (
          requests.map((u, index) => (
            <TableRow key={u.uid || u.id || index}>
              {/* Student Name */}
              <TableCell className="w-[260px] min-w-[200px]">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={u.profile_image || u.photoURL}
                    name={u.fullName || "User"}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                      {u.fullName || "Unnamed User"}
                    </div>
                    <div className="text-gray-400 dark:text-gray-500 text-[11px] truncate">
                      {u.email}
                    </div>
                  </div>
                </div>
              </TableCell>

              {/* Student ID */}
              <TableCell className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                {u.studentIdOrEmployeeId || "—"}
              </TableCell>

              {/* Program */}
              <TableCell className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                {getProgramDisplay(u)}
              </TableCell>

              {/* Specialization */}
              <TableCell className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                {getSpecializationDisplay(u)}
              </TableCell>

              {/* Section */}
              <TableCell className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                {getSectionDisplay(u)}
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="xs"
                    variant="primary"
                    disabled={actionLoadingUid === u.uid}
                    onClick={() => handleApprove(u)}
                    className="!px-2.5 !py-1 text-xs"
                  >
                    {actionLoadingUid === u.uid ? "Approving..." : "Approve"}
                  </Button>

                  {selectedTab === "pending" ? (
                    <Button
                      size="xs"
                      variant="danger"
                      disabled={actionLoadingUid === u.uid}
                      onClick={() => handleReject(u)}
                      className="!px-2.5 !py-1 text-xs"
                    >
                      Reject
                    </Button>
                  ) : (
                    <button
                      className="text-red-400 hover:text-red-600 transition-colors p-1"
                      title="Permanently Delete Record"
                      onClick={() => handleDelete(u)}
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                  )}

                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      setSelectedRequest(u);
                      setDetailModalOpen(true);
                    }}
                    title="View Request Details"
                    className="!px-2 !py-1 text-xs"
                  >
                    <HiEye className="w-3.5 h-3.5 text-blue-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </DataTable>

      {/* Pagination Controls */}
      <Pagination
        page={page}
        totalPages={totalPages}
        total={totalRequests}
        limit={limit}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
      />

      {/* Request Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Student Registration Details"
        icon={HiAcademicCap}
        maxWidth="max-w-md"
      >
        {selectedRequest && (
          <div className="space-y-4 pt-1 text-xs">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1a1b26] rounded-xl border border-gray-100 dark:border-[#2b2d3f]">
              <Avatar
                src={selectedRequest.profile_image || selectedRequest.photoURL}
                name={selectedRequest.fullName || "User"}
                size="md"
              />
              <div className="min-w-0">
                <div className="font-bold text-gray-900 dark:text-white text-sm">
                  {selectedRequest.fullName || "Unnamed User"}
                </div>
                <div className="text-gray-500 dark:text-gray-400 truncate">
                  {selectedRequest.email}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-[#1a1b26] rounded-xl border border-gray-100 dark:border-[#2b2d3f]">
              <div>
                <span className="text-gray-400 uppercase text-[10px] font-bold block mb-0.5">
                  Student ID Number
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {selectedRequest.studentIdOrEmployeeId || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 uppercase text-[10px] font-bold block mb-0.5">
                  Degree Program
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {getProgramDisplay(selectedRequest)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 uppercase text-[10px] font-bold block mb-0.5">
                  Specialization
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {getSpecializationDisplay(selectedRequest)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 uppercase text-[10px] font-bold block mb-0.5">
                  Assigned Section
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {getSectionDisplay(selectedRequest)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 uppercase text-[10px] font-bold block mb-0.5">
                  Submission Date
                </span>
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {selectedRequest.created_at
                    ? new Date(selectedRequest.created_at).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 uppercase text-[10px] font-bold block mb-0.5">
                  Current Queue
                </span>
                <span className="font-semibold capitalize text-amber-500">
                  {selectedRequest.status || "Pending"}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#222433]">
              {selectedRequest.status !== "approved" && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={actionLoadingUid === selectedRequest.uid}
                    onClick={() => handleApprove(selectedRequest)}
                  >
                    Approve Registration
                  </Button>
                  {selectedRequest.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={actionLoadingUid === selectedRequest.uid}
                      onClick={() => handleReject(selectedRequest)}
                    >
                      Reject
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserRequests;
