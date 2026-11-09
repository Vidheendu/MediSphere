"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAdminAppointments } from "@/lib/services/admin";
import type { AppointmentWithDetails } from "@/types";

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const loadAppointments = useCallback(async (status: string, search: string, date: string) => {
    try {
      setLoading(true);
      const data = await getAdminAppointments({
        status,
        search,
        date: date || undefined,
      });
      setAppointments(data);
    } catch (err) {
      console.error("[AdminAppointmentsPage] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initialLoad() {
      try {
        const data = await getAdminAppointments({
          status: statusFilter,
          search: searchQuery,
          date: dateFilter || undefined,
        });
        if (!ignore) {
          setAppointments(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error("[AdminAppointmentsPage] Initial load error:", err);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    initialLoad();

    return () => {
      ignore = true;
    };
  }, [statusFilter, searchQuery, dateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAppointments(statusFilter, searchQuery, dateFilter);
  };

  const formatISTDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatISTTime = (timeStr: string) => {
    try {
      const [h, m] = timeStr.split(":");
      const hours = parseInt(h);
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${m} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointment Oversight</h1>
          <p className="text-sm text-slate-500 mt-1">
            Restricted operational audit of consultation bookings. Patient privacy and data minimization strictly enforced.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 self-start sm:self-auto"
        >
          ← Back to Overview
        </Link>
      </div>

      {/* Filters & Search Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(["all", "confirmed", "completed", "cancelled", "no_show"] as const).map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                  active
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab === "no_show" ? "No Show" : tab}
              </button>
            );
          })}
        </div>

        {/* Date & Keyword Search */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            title="Filter by appointment date"
          />

          <div className="relative flex-1 sm:w-60">
            <input
              type="text"
              placeholder="Search ID, doctor, patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 transition-colors"
          >
            Apply
          </button>
          {(statusFilter !== "all" || searchQuery || dateFilter) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setSearchQuery("");
                setDateFilter("");
              }}
              className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 text-xs font-medium"
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <svg className="animate-spin h-6 w-6 text-indigo-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading appointment records...
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <p className="font-semibold text-slate-800">No appointments found</p>
            <p className="text-xs text-slate-500 mt-1">There are no consultations matching the specified criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Appointment Ref</th>
                  <th className="py-3 px-3">Date & Time (IST)</th>
                  <th className="py-3 px-3">Attending Doctor</th>
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {appointments.map((appt) => {
                  const docProfile = appt.doctor?.profile;
                  const docClinic = appt.doctor?.clinic;
                  const docSpec = appt.doctor?.speciality;
                  const patientProfile = appt.patient;

                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 font-medium">
                        {appt.id.slice(0, 8)}...
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-slate-900">{formatISTDate(appt.appointment_date)}</p>
                        <p className="text-[11px] text-slate-500">
                          {formatISTTime(appt.start_time)} – {formatISTTime(appt.end_time)}
                        </p>
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-slate-900">
                          Dr. {docProfile?.full_name || "Practitioner"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {docSpec?.name || "Specialist"} {docClinic?.name ? `• ${docClinic.name}` : ""}
                        </p>
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-slate-900">{patientProfile?.full_name || "Patient"}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[140px]">
                          {patientProfile?.email || patientProfile?.phone || "Private"}
                        </p>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                            appt.status === "confirmed"
                              ? "bg-indigo-100 text-indigo-800"
                              : appt.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : appt.status === "cancelled"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {appt.status === "no_show" ? "No Show" : appt.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-500 text-[11px] italic truncate max-w-[150px]">
                        {appt.reason || "General Consultation"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
        <strong>Privacy Protocol Notice:</strong> Clinical notes and patient medical history are omitted from this oversight view.
        Ordinary patients and doctors have zero access to this table.
      </div>
    </div>
  );
}
