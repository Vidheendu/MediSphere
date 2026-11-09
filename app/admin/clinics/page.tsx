"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAdminClinics, updateAdminClinic } from "@/lib/services/admin";
import type { Clinic } from "@/types";

type ClinicWithDocCount = Clinic & { doctorCount: number };

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<ClinicWithDocCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingClinic, setEditingClinic] = useState<ClinicWithDocCount | null>(null);

  // Edit form state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Bhopal");
  const [state, setState] = useState("Madhya Pradesh");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadClinics = useCallback(async (query: string) => {
    try {
      setLoading(true);
      const data = await getAdminClinics(query);
      setClinics(data);
    } catch (err) {
      console.error("[AdminClinicsPage] Error:", err);
      setFeedback({ text: "Failed to load clinics.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initialLoad() {
      try {
        const data = await getAdminClinics(searchQuery);
        if (!ignore) {
          setClinics(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error("[AdminClinicsPage] Initial load error:", err);
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
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadClinics(searchQuery);
  };

  const openEditModal = (c: ClinicWithDocCount) => {
    setEditingClinic(c);
    setName(c.name || "");
    setAddress(c.address || "");
    setCity(c.city || "Bhopal");
    setState(c.state || "Madhya Pradesh");
    setPincode(c.pincode || "");
    setPhone(c.phone || "");
    setWebsite(c.website || "");
    setLatitude(c.latitude !== null && c.latitude !== undefined ? String(c.latitude) : "");
    setLongitude(c.longitude !== null && c.longitude !== undefined ? String(c.longitude) : "");
    setFeedback(null);
  };

  const handleSaveClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClinic) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFeedback({ text: "Clinic name cannot be empty.", type: "error" });
      return;
    }

    let parsedLat: number | null = null;
    let parsedLng: number | null = null;

    if (latitude.trim()) {
      const n = parseFloat(latitude);
      if (isNaN(n) || n < -90 || n > 90) {
        setFeedback({ text: "Latitude must be a valid number between -90 and 90.", type: "error" });
        return;
      }
      parsedLat = n;
    }

    if (longitude.trim()) {
      const n = parseFloat(longitude);
      if (isNaN(n) || n < -180 || n > 180) {
        setFeedback({ text: "Longitude must be a valid number between -180 and 180.", type: "error" });
        return;
      }
      parsedLng = n;
    }

    try {
      setSaving(true);
      setFeedback(null);

      const res = await updateAdminClinic(editingClinic.id, {
        name: trimmedName,
        address: address.trim() || null,
        city: city.trim() || "Bhopal",
        state: state.trim() || "Madhya Pradesh",
        pincode: pincode.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        latitude: parsedLat,
        longitude: parsedLng,
      });

      if (res.success) {
        setFeedback({ text: `Clinic "${trimmedName}" updated successfully.`, type: "success" });
        setEditingClinic(null);
        await loadClinics(searchQuery);
      } else {
        setFeedback({ text: res.error || "Failed to update clinic.", type: "error" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving clinic.";
      setFeedback({ text: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinic Governance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit clinic locations, verify geographic coordinates, and correct contact information.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 self-start sm:self-auto"
        >
          ← Back to Overview
        </Link>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-xs underline font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <span className="text-xs font-semibold text-slate-700">
          Total Clinics Registered: <strong className="text-slate-900">{clinics.length}</strong>
        </span>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <input
              type="text"
              placeholder="Search by clinic name, address, phone..."
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
            Search
          </button>
        </form>
      </div>

      {/* Clinics Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <svg className="animate-spin h-6 w-6 text-indigo-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading clinics...
          </div>
        ) : clinics.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <p className="font-semibold text-slate-800">No clinics found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Clinic Facility</th>
                  <th className="py-3 px-3">Location & Pincode</th>
                  <th className="py-3 px-3">Contact & Web</th>
                  <th className="py-3 px-3">Coordinates</th>
                  <th className="py-3 px-3 text-center">Doctors</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {clinics.map((c) => {
                  const hasCoords = c.latitude !== null && c.longitude !== null;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 text-sm">
                        {c.name}
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="text-slate-800">{c.address || "No street address"}</p>
                        <p className="text-[11px] text-slate-500">
                          {c.city}, {c.state} {c.pincode ? `— ${c.pincode}` : ""}
                        </p>
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="text-slate-800">{c.phone ? `📞 ${c.phone}` : "No phone"}</p>
                        {c.website ? (
                          <a
                            href={c.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-indigo-600 hover:underline truncate max-w-[140px] block"
                          >
                            🌐 {c.website.replace(/^https?:\/\//, "")}
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">No website</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        {hasCoords ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ {c.latitude?.toFixed(4)}, {c.longitude?.toFixed(4)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Pending GPS
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="font-semibold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full text-xs">
                          {c.doctorCount}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openEditModal(c)}
                          className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition-colors"
                        >
                          Edit Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Clinic Modal */}
      {editingClinic && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit Clinic Facility</h3>
                <p className="text-xs text-slate-500">Correct verified address, contacts, and GPS coordinates.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingClinic(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClinic} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Plot 12, Arera Colony"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="462016"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91-755-..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Website URL</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="block font-semibold text-slate-700 mb-1">Geographic Coordinates (GPS)</span>
                <p className="text-[11px] text-slate-500 mb-2">
                  Coordinates power clinic distance calculation and interactive maps. Do not invent arbitrary coordinates.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="23.2300"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="77.4100"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingClinic(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving Changes..." : "Save Clinic"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

