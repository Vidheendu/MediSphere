"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PatientDashboardNav from "@/components/dashboard/PatientDashboardNav";
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

function getNotificationBadge(type: NotificationType) {
  switch (type) {
    case "appointment_booked":
      return {
        bg: "bg-teal-50 text-teal-700 border-teal-200",
        icon: (
          <svg className="h-5 w-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      };
    case "appointment_completed":
      return {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: (
          <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    case "appointment_no_show":
      return {
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        icon: (
          <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
      };
    case "appointment_cancelled":
      return {
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        icon: (
          <svg className="h-5 w-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
      };
    case "system":
    default:
      return {
        bg: "bg-slate-50 text-slate-700 border-slate-200",
        icon: (
          <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
  }
}

export default function PatientNotificationsPage() {
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
      console.error("[PatientNotificationsPage] Load error:", err);
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
    <ProtectedRoute allowedRoles={["patient"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <PatientDashboardNav />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Notification Center
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-600 text-white animate-pulse">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Real-time appointment confirmations, visit status updates, and care reminders.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={actionInProgress}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <svg className="h-3.5 w-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="p-2 rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Refresh notifications"
              >
                <svg className={`h-4 w-4 ${loading ? "animate-spin text-teal-600" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-teal-800 text-xs font-semibold shadow-2xs flex items-center gap-2">
              <svg className="h-4 w-4 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "all"
                  ? "bg-teal-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "unread"
                  ? "bg-teal-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("read")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === "read"
                  ? "bg-teal-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              Read ({readCount})
            </button>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-teal-600 border-t-transparent mb-3" />
              <p className="text-xs font-semibold text-slate-500">Checking for notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-600 mx-auto flex items-center justify-center">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {filter === "unread" ? "All Caught Up!" : "No Notifications Yet"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {filter === "unread"
                  ? "You have read all of your active notifications."
                  : "When you book verified doctor appointments or your visit status is updated, real notifications will appear here."}
              </p>
              {filter === "all" && (
                <div className="pt-2">
                  <Link
                    href="/doctors"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
                  >
                    <span>Find Doctors & Book</span>
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
                const badgeInfo = getNotificationBadge(notif.type);
                const isUnread = !notif.read_at;

                return (
                  <div
                    key={notif.id}
                    className={`rounded-2xl border p-5 transition-all ${
                      isUnread
                        ? "bg-white border-teal-200/90 shadow-xs hover:border-teal-300 ring-1 ring-teal-500/10"
                        : "bg-white/80 border-slate-200/80 hover:bg-white text-slate-700"
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
                            <h2 className="text-sm font-bold text-slate-900 truncate">
                              {notif.title}
                            </h2>
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" title="Unread" />
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-slate-400 shrink-0">
                            {formatNotificationTimeIST(notif.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {notif.message}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                          {notif.related_appointment_id && (
                            <Link
                              href={`/dashboard/appointments/${notif.related_appointment_id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 transition-colors"
                            >
                              <span>View Appointment</span>
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
                              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer ml-auto"
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
