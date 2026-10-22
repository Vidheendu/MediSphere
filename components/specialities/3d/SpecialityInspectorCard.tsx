"use client";

import React from "react";
import Link from "next/link";
import SpecialityIcon from "@/components/specialities/SpecialityIcon";
import type { Speciality3DData } from "./types";

interface SpecialityInspectorCardProps {
  speciality: Speciality3DData;
  allSpecialities: Speciality3DData[];
  onSelect: (slug: string) => void;
}

export default function SpecialityInspectorCard({
  speciality,
  allSpecialities,
  onSelect,
}: SpecialityInspectorCardProps) {
  return (
    <div className="rounded-2xl border border-cyan-500/25 bg-slate-900/90 p-5 sm:p-6 backdrop-blur-md shadow-2xl transition-all">
      {/* Top Header: Badge, Icon, Speciality Index */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md transition-colors"
            style={{ backgroundColor: speciality.accentColor }}
          >
            <SpecialityIcon
              slug={speciality.slug}
              name={speciality.name}
              className="h-6 w-6"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400">
                {speciality.badgeNumber} / 06
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Bhopal Network
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {speciality.name}
            </h3>
          </div>
        </div>

        <span
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-cyan-500/30 bg-cyan-950/40 text-cyan-300"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: speciality.accentColor }}
          />
          Interactive 3D
        </span>
      </div>

      {/* Subtitle / Tagline */}
      <p className="mt-3 text-xs sm:text-sm font-semibold text-cyan-200">
        {speciality.tagline}
      </p>

      {/* Description */}
      <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
        {speciality.description}
      </p>

      {/* Clinical Focus Badges */}
      <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2">
        {speciality.focusAreas.map((area) => (
          <span
            key={area}
            className="rounded-md border border-slate-700/80 bg-slate-800/60 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-slate-300"
          >
            {area}
          </span>
        ))}
      </div>

      {/* Direct Route CTA Link */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
        <Link
          href={`/specialities/${speciality.slug}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-md hover:brightness-110 transition-all"
          style={{ backgroundColor: speciality.glowColor }}
        >
          <span>Browse {speciality.name} Doctors & Clinics</span>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </Link>

        {/* Quick jump rail */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-semibold text-slate-500 mr-1 hidden lg:inline">
            Jump:
          </span>
          {allSpecialities.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => onSelect(item.slug)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                item.slug === speciality.slug
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                  : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
              title={`Inspect ${item.name}`}
            >
              {item.badgeNumber}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
