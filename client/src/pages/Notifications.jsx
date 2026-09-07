// src/pages/Notifications.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../hooks/useNotifications";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { useNavigate } from "react-router-dom";
import {
  HiBell,
  HiCheck,
  HiCheckCircle,
  HiEnvelopeOpen,
  HiCalendarDays,
  HiDocumentText,
  HiChatBubbleLeftRight,
  HiExclamationCircle,
  HiInformationCircle,
} from "react-icons/hi2";

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const Notifications = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications(currentUser?.uid);

  const [filter, setFilter] = useState("all"); // 'all' | 'unread'
  const [markingAll, setMarkingAll] = useState(false);

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllAsRead();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }

    // Contextual routing based on notification content/type
    const titleLower = (notif.title || "").toLowerCase();
    const typeLower = (notif.type || "").toLowerCase();

    if (typeLower === "schedule" || titleLower.includes("defense") || titleLower.includes("schedule")) {
      navigate("/schedules");
    } else if (titleLower.includes("adviser request")) {
      if (userProfile?.role === "adviser") {
        navigate("/dashboard");
      } else {
        navigate("/research/workspace");
      }
    } else if (typeLower === "proposal" || titleLower.includes("proposal") || titleLower.includes("title")) {
      if (userProfile?.role === "student") {
        navigate("/submit-title");
      } else {
        navigate("/proposals");
      }
    } else if (typeLower === "comment" || titleLower.includes("review") || titleLower.includes("feedback")) {
      navigate("/reviews");
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "unread") return !notif.read;
    return true;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case "schedule":
        return <HiCalendarDays className="w-5 h-5 text-purple-500" />;
      case "proposal":
        return <HiDocumentText className="w-5 h-5 text-emerald-500" />;
      case "comment":
        return <HiChatBubbleLeftRight className="w-5 h-5 text-amber-500" />;
      case "warning":
        return <HiExclamationCircle className="w-5 h-5 text-rose-500" />;
      default:
        return <HiInformationCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBadgeVariant = (type) => {
    switch (type) {
      case "schedule":
        return "purple";
      case "proposal":
        return "emerald";
      case "comment":
        return "amber";
      case "warning":
        return "rose";
      default:
        return "blue";
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Notifications"
          subtitle={`Stay updated with proposal changes, defenses, adviser requests, and team activities.`}
        />

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="self-start sm:self-center gap-2 border-gray-200 dark:border-[#222433] hover:bg-gray-100 dark:hover:bg-[#1a1b26]"
          >
            <HiCheck className="w-4 h-4 text-emerald-500" />
            <span>{markingAll ? "Marking..." : "Mark all as read"}</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-[#1c1d28] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 dark:text-[#9396a8] hover:bg-gray-100 dark:hover:bg-[#1a1b26]"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filter === "unread"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 dark:text-[#9396a8] hover:bg-gray-100 dark:hover:bg-[#1a1b26]"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  filter === "unread"
                    ? "bg-white text-blue-600"
                    : "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {unreadCount > 0 && (
          <span className="text-xs text-gray-500 dark:text-[#9396a8]">
            {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Main Content */}
      {loading && notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-7 h-7 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-[#9396a8]">Loading your notifications...</p>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-12 text-center">
          <EmptyState
            icon={filter === "unread" ? HiEnvelopeOpen : HiBell}
            title={filter === "unread" ? "You're all caught up!" : "No notifications yet"}
            description={
              filter === "unread"
                ? "There are no unread notifications right now. Check back later for system updates."
                : "When you receive requests, feedback, or defense schedules, they will appear here."
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const isUnread = !notif.read;
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                  isUnread
                    ? "bg-white dark:bg-[#13141c] border-blue-200 dark:border-blue-900/40 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800"
                    : "bg-white dark:bg-[#101117] border-gray-200/80 dark:border-[#1c1d28]/70 hover:bg-gray-50/70 dark:hover:bg-[#151620]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Status Indicator Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isUnread
                        ? "bg-blue-50 dark:bg-blue-950/40"
                        : "bg-gray-100 dark:bg-[#1a1b26]"
                    }`}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                        <h4
                          className={`text-sm tracking-tight ${
                            isUnread
                              ? "font-bold text-gray-900 dark:text-white"
                              : "font-medium text-gray-800 dark:text-[#c4c7d7]"
                          }`}
                        >
                          {notif.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {notif.type && (
                          <Badge variant={getBadgeVariant(notif.type)}>
                            {notif.type.toUpperCase()}
                          </Badge>
                        )}
                        <span className="text-[11px] text-gray-400 dark:text-[#6b6f84]">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                    </div>

                    <p
                      className={`text-xs sm:text-sm leading-relaxed ${
                        isUnread
                          ? "text-gray-700 dark:text-[#a0a4b8]"
                          : "text-gray-500 dark:text-[#7f8397]"
                      }`}
                    >
                      {notif.message}
                    </p>

                    {/* Footer Actions */}
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1">
                        View details →
                      </span>

                      {isUnread && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif.id);
                          }}
                          className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:underline"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
