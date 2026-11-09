"use client";

import React, { useEffect, useState, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  getAdminDoctors,
  updateDoctorVerification,
  extractDoctorProvenance,
} from "@/lib/services/admin";
import type { DoctorWithDetails, DoctorVerificationStatus } from "@/types";

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DoctorVerificationStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorWithDetails | null>(null);

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [doctorToReject, setDoctorToReject] = useState<DoctorWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [, startTransition] = useTransition();

  const loadDoctors = useCallback(async (status: DoctorVerificationStatus | "all", query: string) => {
    try {
      setLoading(true);
      const data = await getAdminDoctors({
        status,
        search: query,
      });
      setDoctors(data);
    } catch (err) {
      console.error("[AdminDoctorsPage] Error:", err);
      setActionMessage({ text: "Failed to load doctor records.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initialLoad() {
      try {
        const data = await getAdminDoctors({
          status: statusFilter,
          search: searchQuery,
        });
        if (!ignore) {
          setDoctors(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error("[AdminDoctorsPage] Initial load error:", err);
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
  }, [statusFilter, searchQuery]);

  const handleStatusFilterChange = (status: DoctorVerificationStatus | "all") => {
    setStatusFilter(status);
    startTransition(() => {
      loadDoctors(status, searchQuery);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDoctors(statusFilter, searchQuery);
  };

  const handleVerifyDoctor = async (doc: DoctorWithDetails) => {
    const confirmed = window.confirm(
      `Verify Dr. ${doc.profile?.full_name || "Practitioner"}? Their profile will immediately become publicly visible and bookable.`
    );
    if (!confirmed) return;

    try {
      setActionInProgress(true);
      setActionMessage(null);
      const res = await updateDoctorVerification(doc.id, "verified");

      if (res.success) {
        setActionMessage({
          text: `Dr. ${doc.profile?.full_name || "Practitioner"} has been verified successfully.`,
          type: "success",
        });
        await loadDoctors(statusFilter, searchQuery);
        if (selectedDoctor?.id === doc.id) {
          setSelectedDoctor((prev) => (prev ? { ...prev, verification_status: "verified", rejection_reason: null } : null));
        }
      } else {
        setActionMessage({
          text: res.error || "Failed to verify doctor.",
          type: "error",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error verifying doctor.";
      setActionMessage({ text: msg, type: "error" });
    } finally {
      setActionInProgress(false);
    }
  };

  const openRejectModal = (doc: DoctorWithDetails) => {
    setDoctorToReject(doc);
    setRejectionReason(doc.rejection_reason || "");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!doctorToReject) return;

    try {
      setActionInProgress(true);
      setActionMessage(null);
      const res = await updateDoctorVerification(doctorToReject.id, "rejected", rejectionReason);

      if (res.success) {
        setActionMessage({
          text: `Dr. ${doctorToReject.profile?.full_name || "Practitioner"} was rejected.`,
          type: "success",
        });
        setRejectModalOpen(false);
        setDoctorToReject(null);
        setRejectionReason("");
        await loadDoctors(statusFilter, searchQuery);
        if (selectedDoctor?.id === doctorToReject.id) {
          setSelectedDoctor((prev) =>
            prev ? { ...prev, verification_status: "rejected", rejection_reason: rejectionReason } : null
          );
        }
      } else {
        setActionMessage({
          text: res.error || "Failed to reject doctor.",
          type: "error",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error rejecting doctor.";
      setActionMessage({ text: msg, type: "error" });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleResetToPending = async (doc: DoctorWithDetails) => {
    try {
      setActionInProgress(true);
      const res = await updateDoctorVerification(doc.id, "pending");
      if (res.success) {
        setActionMessage({
          text: `Dr. ${doc.profile?.full_name || "Practitioner"} returned to pending review.`,
          type: "success",
        });
        await loadDoctors(statusFilter, searchQuery);
      }
    } finally {
      setActionInProgress(false);
    }
  };

  const pendingCount = doctors.filter((d) => d.verification_status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Doctor Verification</h1>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Review qualifications, source provenance, clinic affiliations, and authorize public practice.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 self-start sm:self-auto"
        >
          ← Back to Overview
        </Link>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold underline hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Controls: Search and Status Filter Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(["all", "pending", "verified", "rejected", "suspended"] as const).map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => handleStatusFilterChange(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                  active
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search doctor, clinic, speciality..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Main Content: Table + Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctors Table (2 cols on lg) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <svg className="animate-spin h-6 w-6 text-indigo-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading practitioner records...
            </div>
          ) : doctors.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="font-semibold text-slate-800">No doctor records found</p>
              <p className="text-xs text-slate-500 mt-1">
                {statusFilter !== "all"
                  ? `There are no practitioners with status '${statusFilter}'.`
                  : "No doctors have been registered or imported yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Practitioner</th>
                    <th className="py-3 px-3">Speciality & Clinic</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {doctors.map((doc) => {
                    const isSelected = selectedDoctor?.id === doc.id;

                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedDoctor(doc)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          isSelected ? "bg-indigo-50/50" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">
                              {doc.profile?.full_name ? doc.profile.full_name.charAt(0) : "D"}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">
                                Dr. {doc.profile?.full_name || "Unnamed"}
                              </p>
                              <p className="text-[11px] text-slate-500">{doc.qualification || "Credentials pending"}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-800">{doc.speciality?.name || "Unassigned"}</p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[150px]">
                            {doc.clinic?.name || "No clinic specified"}
                          </p>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                              doc.verification_status === "verified"
                                ? "bg-emerald-100 text-emerald-800"
                                : doc.verification_status === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : doc.verification_status === "rejected"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {doc.verification_status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {doc.verification_status !== "verified" && (
                              <button
                                onClick={() => handleVerifyDoctor(doc)}
                                disabled={actionInProgress}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] shadow-2xs transition-colors disabled:opacity-50"
                              >
                                Verify
                              </button>
                            )}

                            {doc.verification_status !== "rejected" && (
                              <button
                                onClick={() => openRejectModal(doc)}
                                disabled={actionInProgress}
                                className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-[11px] border border-rose-200 transition-colors disabled:opacity-50"
                              >
                                Reject
                              </button>
                            )}

                            {doc.verification_status !== "pending" && (
                              <button
                                onClick={() => handleResetToPending(doc)}
                                disabled={actionInProgress}
                                className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-[11px]"
                                title="Reset to pending review"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Doctor Detail & Provenance Inspector (1 col on lg) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs h-fit sticky top-24 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Practitioner Provenance</h3>
            {selectedDoctor && (
              <span className="text-[10px] text-slate-400 font-mono">ID: {selectedDoctor.id.slice(0, 8)}...</span>
            )}
          </div>

          {selectedDoctor ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium uppercase text-[10px]">Full Name</span>
                <p className="font-semibold text-slate-900 text-base mt-0.5">
                  Dr. {selectedDoctor.profile?.full_name || "Unnamed"}
                </p>
                <p className="text-slate-500">{selectedDoctor.profile?.email || "No email"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium uppercase text-[10px]">Speciality</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedDoctor.speciality?.name || "None"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium uppercase text-[10px]">Experience</span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {selectedDoctor.experience_years !== null ? `${selectedDoctor.experience_years} years` : "Unspecified"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium uppercase text-[10px]">Fee</span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {selectedDoctor.consultation_fee !== null ? `₹${selectedDoctor.consultation_fee}` : "Unspecified"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium uppercase text-[10px]">Qualification</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedDoctor.qualification || "Pending"}</p>
                </div>
              </div>

              {/* Clinic Affiliation */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 font-medium uppercase text-[10px]">Clinic Affiliation</span>
                {selectedDoctor.clinic ? (
                  <div className="mt-1 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="font-semibold text-slate-900">{selectedDoctor.clinic.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedDoctor.clinic.address}, {selectedDoctor.clinic.city}
                    </p>
                    {selectedDoctor.clinic.phone && (
                      <p className="text-[11px] text-slate-600 mt-1">📞 {selectedDoctor.clinic.phone}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 mt-0.5">No clinic linked</p>
                )}
              </div>

              {/* Provenance Source */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 font-medium uppercase text-[10px]">Public Registry Provenance</span>
                {(() => {
                  const prov = extractDoctorProvenance(selectedDoctor.about);
                  if (prov) {
                    return (
                      <div className="mt-1 p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100">
                        <p className="text-[11px] text-indigo-900 font-mono break-all">{prov}</p>
                        {prov.startsWith("http") && (
                          <a
                            href={prov}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-700 hover:text-indigo-800 font-semibold mt-1.5"
                          >
                            <span>Verify Source Registry</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    );
                  }
                  return (
                    <p className="text-slate-500 italic mt-0.5">
                      No provenance URL stored. If source information is insufficient, leave doctor pending.
                    </p>
                  );
                })()}
              </div>

              {/* Rejection Reason if any */}
              {selectedDoctor.rejection_reason && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-rose-500 font-medium uppercase text-[10px]">Rejection Reason</span>
                  <p className="text-rose-800 bg-rose-50 p-2.5 rounded-lg border border-rose-200 mt-1 text-[11px]">
                    {selectedDoctor.rejection_reason}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                {selectedDoctor.verification_status !== "verified" && (
                  <button
                    onClick={() => handleVerifyDoctor(selectedDoctor)}
                    disabled={actionInProgress}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                  >
                    Verify Doctor
                  </button>
                )}
                {selectedDoctor.verification_status !== "rejected" && (
                  <button
                    onClick={() => openRejectModal(selectedDoctor)}
                    disabled={actionInProgress}
                    className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors"
                  >
                    Reject Doctor
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Select a doctor from the list to inspect credentials and provenance.
            </div>
          )}
        </div>
      </div>

      {/* Rejection Reason Modal */}
      {rejectModalOpen && doctorToReject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900 text-base">
                Reject Doctor Application
              </h3>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Rejecting Dr. {doctorToReject.profile?.full_name || "Practitioner"} will prevent their public listing and booking. Please record the specific verification or documentation reason:
            </p>

            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Unverified registration number with MP State Medical Council; missing clinic proof..."
              className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 mb-4"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionInProgress}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                {actionInProgress ? "Recording..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
