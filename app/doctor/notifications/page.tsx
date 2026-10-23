"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DoctorDashboardNav from "@/components/dashboard/DoctorDashboardNav";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/services/notifications";
import type { Notification, NotificationType } from "@/types";

function formatNotificationTimeIST(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

function getDoctorNotificationBadge(type: NotificationType) {
  switch (type) {
    case "appointment_booked":
      return {
        bg: "bg-teal-950/80 text-teal-300 border-teal-700/60",
        icon: (
          <svg className="h-5 w-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      };
    case "appointment_completed":
      return {
        bg: "bg-emerald-950/80 text-emerald-300 border-emerald-700/60",
        icon: (
          <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    case "appointment_no_show":
      return {
        bg: "bg-amber-950/80 text-amber-300 border-amber-700/60",
        icon: (
          <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
      };
    case "appointment_cancelled":
      return {
        bg: "bg-rose-950/80 text-rose-300 border-rose-700/60",
        icon: (
          <svg className="h-5 w-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
      };
    case "system":
    default:
      return {
        bg: "bg-slate-900 text-slate-300 border-slate-700",
        icon: (
          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
  }
}

export default function DoctorNotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getNotifications(50);
      setNotifications(list);
    } catch (err) {
      console.error("[DoctorNotificationsPage] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchList();
    }
  }, [user, fetchList]);

  const handleMarkAsRead = async (id: string) => {
    try {
      setActionInProgress(true);
      const res = await markNotificationAsRead(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        );
      }
    } catch {
      // Silent error
    } finally {
      setActionInProgress(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setActionInProgress(true);
      const res = await markAllNotificationsAsRead();
      if (res.success) {
        const nowIso = new Date().toISOString();
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || nowIso })));
        setActionFeedback("All notifications marked as read.");
        setTimeout(() => setActionFeedback(null), 3000);
      }
    } catch {
      // Silent error
    } finally {
      setActionInProgress(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const readCount = notifications.filter((n) => !!n.read_at).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read_at;
    if (filter === "read") return !!n.read_at;
    return true;
  });

  return (
    <ProtectedRoute allowedRoles={["doctor"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <DoctorDashboardNav />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Practitioner Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500 text-slate-950 animate-pulse">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Real-time booking alerts, schedule changes, and clinic management notices.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={actionInProgress}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 hover:bg-slate-850 text-slate-200 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <svg className="h-3.5 w-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Mark All as Read</span>
                </button>
              )}
              <button
                type="button"
                onClick={fetchList}
                disabled={loading}
                title="Refresh notifications"
                className="p-2 rounded-xl text-slate-400 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-850 transition-colors cursor-pointer"
                aria-label="Refresh notifications"
              >
                <svg className={`h-4 w-4 ${loading ? "animate-spin text-teal-400" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div className="rounded-xl border border-teal-800 bg-teal-950/70 px-4 py-2.5 text-teal-300 text-xs font-semibold flex items-center gap-2">
              <svg className="h-4 w-4 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "all"
                  ? "bg-teal-500 text-slate-950 font-bold"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "unread"
                  ? "bg-teal-500 text-slate-950 font-bold"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("read")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "read"
                  ? "bg-teal-500 text-slate-950 font-bold"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              Read ({readCount})
            </button>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-teal-400 border-t-transparent mb-3" />
              <p className="text-xs font-semibold text-slate-400">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-slate-950 border border-slate-800 text-teal-400 mx-auto flex items-center justify-center">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">
                {filter === "unread" ? "All Caught Up!" : "No Notifications Yet"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {filter === "unread"
                  ? "You have reviewed all of your doctor portal notifications."
                  : "When patients book appointments for your verified slots, alerts will appear here in real time."}
              </p>
              {filter === "all" && (
                <div className="pt-2">
                  <Link
                    href="/doctor/appointments"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-xs transition-colors"
                  >
                    <span>View Appointments Schedule</span>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notif) => {
                const badgeInfo = getDoctorNotificationBadge(notif.type);
                const isUnread = !notif.read_at;

                return (
                  <div
                    key={notif.id}
                    className={`rounded-2xl border p-5 transition-all ${
                      isUnread
                        ? "bg-slate-900 border-teal-500/50 shadow-md ring-1 ring-teal-500/20"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center ${badgeInfo.bg}`}>
                        {badgeInfo.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-white truncate">
                              {notif.title}
                            </h2>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-teal-400 shrink-0" title="Unread" />
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 shrink-0">
                            {formatNotificationTimeIST(notif.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {notif.message}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-800/80">
                          {notif.related_appointment_id && (
                            <Link
                              href={`/doctor/appointments/${notif.related_appointment_id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors"
                            >
                              <span>Review Patient Visit</span>
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          )}

                          {isUnread && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsRead(notif.id)}
                              disabled={actionInProgress}
                              className="text-[11px] font-medium text-slate-400 hover:text-white transition-colors cursor-pointer ml-auto"
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
        </main>
      </div>
    </ProtectedRoute>
  );
}
