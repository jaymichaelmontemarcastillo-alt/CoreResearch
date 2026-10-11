import React from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { HiUserGroup, HiCheck, HiXMark, HiAcademicCap, HiDocumentText } from "react-icons/hi2";

export const GroupInvitationModal = ({
  isOpen,
  onClose,
  invitation,
  onAccept,
  onDecline,
  loading = false,
}) => {
  if (!invitation) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Research Group Invitation"
      icon={HiUserGroup}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 pt-1">
        {/* Banner */}
        <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-blue-900 dark:text-blue-300 text-sm">
              {invitation.groupName || "Research Group"}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-200/70 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
              Invitation Pending
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            <strong className="text-gray-900 dark:text-white">{invitation.inviterName}</strong> invited you to join their capstone research group.
          </p>
        </div>

        {/* Group & Proposal Details */}
        <div className="space-y-2.5 p-3.5 bg-gray-50 dark:bg-[#12131c] rounded-xl border border-gray-200/80 dark:border-[#222433] text-xs">
          {invitation.groupTitle ? (
            <div>
              <span className="text-gray-400 dark:text-[#6b6f84] font-semibold uppercase tracking-wider text-[10px] block mb-0.5">
                Proposed Research Title
              </span>
              <p className="font-medium text-gray-900 dark:text-gray-100 flex items-start gap-1.5 leading-snug">
                <HiDocumentText className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{invitation.groupTitle}</span>
              </p>
            </div>
          ) : (
            <div>
              <span className="text-gray-400 dark:text-[#6b6f84] font-semibold uppercase tracking-wider text-[10px] block mb-0.5">
                Research Title
              </span>
              <p className="text-gray-500 dark:text-gray-400 italic">
                Title not yet proposed (you can propose and submit together).
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 dark:border-[#1e202c]">
            <div>
              <span className="text-gray-400 dark:text-[#6b6f84] font-semibold uppercase tracking-wider text-[10px] block mb-0.5">
                Invited By
              </span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {invitation.inviterName}
              </span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-[#6b6f84] font-semibold uppercase tracking-wider text-[10px] block mb-0.5">
                Date Sent
              </span>
              <span className="text-gray-600 dark:text-gray-300">
                {invitation.createdAt
                  ? new Date(invitation.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : "Recently"}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-gray-500 dark:text-[#7f8397] leading-relaxed">
          Accepting this invitation will assign you as a team member of this group and grant you full access to collaborate on the manuscript workspace.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-[#222433]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDecline(invitation)}
            disabled={loading}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-xs"
          >
            <HiXMark className="w-4 h-4 mr-1 text-rose-500" />
            Decline
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onAccept(invitation)}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 text-xs"
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                <HiCheck className="w-4 h-4 mr-1" />
                Accept & Join
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
